/**
 * DuckDB-WASM Manager
 * Handles DuckDB initialization and query operations
 */

import * as duckdb from '@duckdb/duckdb-wasm';
import { FileSystemManager } from '../fileSystem/fileSystemManager';

export class DuckDBManager {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private worker: Worker | null = null;
  private fileSystemManager: FileSystemManager;

  constructor(fileSystemManager: FileSystemManager) {
    this.fileSystemManager = fileSystemManager;
  }

  /**
   * Initialize DuckDB-WASM
   */
  async initialize(): Promise<void> {
    try {
      // Select appropriate bundle
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      // Create logger
      const logger = new duckdb.ConsoleLogger();

      // Create worker URL from the bundle
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], {
          type: 'application/javascript',
        })
      );

      // Create worker dynamically to avoid static analysis
      const WorkerConstructor = globalThis.Worker;
      this.worker = new WorkerConstructor(workerUrl);

      // Initialize DuckDB with the worker
      this.db = new duckdb.AsyncDuckDB(logger, this.worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      // Create connection
      this.conn = await this.db.connect();

      // Setup file system integration
      await this.setupFileSystem();

      console.log('DuckDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error);
      throw error;
    }
  }

  /**
   * Setup file system integration
   */
  private async setupFileSystem(): Promise<void> {
    if (!this.conn) throw new Error('DuckDB connection not initialized');

    // Register UDFs for file operations if needed
    // For now, we'll read files into memory and use DuckDB's in-memory operations
  }

  /**
   * Execute SQL query
   */
  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.conn) throw new Error('DuckDB not initialized');

    try {
      let result;
      if (params && params.length > 0) {
        // Use prepared statement with parameters
        const stmt = await this.conn.prepare(sql);
        result = await stmt.query(...params);
        await stmt.close();
      } else {
        // Execute query without parameters
        result = await this.conn.query(sql);
      }
      return result.toArray();
    } catch (error) {
      console.error('Query error:', sql, error);
      throw error;
    }
  }

  /**
   * Load Parquet file into DuckDB
   */
  async loadParquetFile(
    machineId: string,
    fileName: string,
    tableName?: string
  ): Promise<void> {
    if (!this.conn || !this.db) throw new Error('DuckDB not initialized');

    try {
      // Read file from file system
      const fileData = await this.fileSystemManager.readParquetFile(machineId, fileName);
      
      // Register the file in DuckDB
      const name = tableName || `${machineId}_${fileName.replace('.parquet', '')}`;
      await this.db.registerFileBuffer(name, new Uint8Array(fileData));

      // Create view
      await this.conn.query(`
        CREATE OR REPLACE VIEW ${name} AS 
        SELECT * FROM parquet_scan('${name}')
      `);

      console.log(`Loaded Parquet file: ${name}`);
    } catch (error) {
      console.error('Failed to load Parquet file:', error);
      throw error;
    }
  }

  /**
   * Import CSV to Parquet with deduplication
   */
  async csvToParquetWithMerge(
    csvData: ArrayBuffer,
    machineId: string,
    yearMonth: string,
    existingParquetData?: ArrayBuffer,
    skipRows: number = 3
  ): Promise<ArrayBuffer> {
    if (!this.conn || !this.db) throw new Error('DuckDB not initialized');

    try {
      // Register CSV file
      const csvName = `temp_csv_${Date.now()}`;
      await this.db.registerFileBuffer(csvName, new Uint8Array(csvData));

      let finalQuery: string;

      if (existingParquetData) {
        // Register existing Parquet file
        const existingName = `existing_parquet_${Date.now()}`;
        await this.db.registerFileBuffer(existingName, new Uint8Array(existingParquetData));

        // Merge with existing data and remove duplicates based on timestamp
        finalQuery = `
          COPY (
            WITH new_data AS (
              SELECT * FROM read_csv('${csvName}', 
                AUTO_DETECT = TRUE,
                HEADER = TRUE,
                SKIP = ${skipRows}
              )
            ),
            existing_data AS (
              SELECT * FROM parquet_scan('${existingName}')
            ),
            combined_data AS (
              SELECT * FROM new_data
              UNION ALL
              SELECT * FROM existing_data
            )
            SELECT DISTINCT ON (timestamp) *
            FROM combined_data
            ORDER BY timestamp, 1
          ) TO 'output.parquet' (FORMAT PARQUET)
        `;

        // Cleanup existing file reference
        await this.db.dropFile(existingName);
      } else {
        // No existing data, just convert CSV
        finalQuery = `
          COPY (
            SELECT * FROM read_csv('${csvName}', 
              AUTO_DETECT = TRUE,
              HEADER = TRUE,
              SKIP = ${skipRows}
            )
          ) TO 'output.parquet' (FORMAT PARQUET)
        `;
      }

      // Execute the query
      await this.conn.query(finalQuery);

      // Get the Parquet file data
      const parquetData = await this.db.copyFileToBuffer('output.parquet');
      
      // Cleanup
      await this.db.dropFile(csvName);
      await this.db.dropFile('output.parquet');

      return parquetData.buffer as ArrayBuffer;
    } catch (error) {
      console.error('Failed to convert CSV to Parquet:', error);
      throw error;
    }
  }

  /**
   * Query time series data
   */
  async queryTimeSeries(
    machineId: string,
    parameters: string[],
    startTime: Date,
    endTime: Date,
    interval?: string
  ): Promise<any[]> {
    if (!this.conn) throw new Error('DuckDB not initialized');

    // Load relevant Parquet files
    const files = this.fileSystemManager.getParquetFiles(machineId);
    for (const file of files) {
      await this.loadParquetFile(machineId, file);
    }

    // Build parameter selection
    const paramColumns = parameters.map(p => `"${p}"`).join(', ');

    // Build query
    let sql: string;
    if (interval) {
      // Aggregated query using date_trunc for time bucketing
      sql = `
        SELECT 
          date_trunc('${interval}', timestamp) as time,
          ${parameters.map(p => `AVG("${p}") as "${p}"`).join(', ')}
        FROM (
          ${files.map(f => `SELECT timestamp, ${paramColumns} FROM ${machineId}_${f.replace('.parquet', '')}`).join(' UNION ALL ')}
        )
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY date_trunc('${interval}', timestamp)
        ORDER BY time
      `;
    } else {
      // Raw data query
      sql = `
        SELECT timestamp, ${paramColumns}
        FROM (
          ${files.map(f => `SELECT timestamp, ${paramColumns} FROM ${machineId}_${f.replace('.parquet', '')}`).join(' UNION ALL ')}
        )
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp
      `;
    }

    // Execute query with date strings
    return await this.query(sql, [
      startTime.toISOString(),
      endTime.toISOString()
    ]);
  }

  /**
   * Keep the old method for backward compatibility
   */
  async csvToParquet(
    csvData: ArrayBuffer,
    machineId: string,
    yearMonth: string,
    skipRows: number = 3
  ): Promise<ArrayBuffer> {
    return this.csvToParquetWithMerge(csvData, machineId, yearMonth, undefined, skipRows);
  }

  /**
   * Get available parameters for a machine
   */
  async getAvailableParameters(machineId: string): Promise<string[]> {
    if (!this.conn) throw new Error('DuckDB not initialized');

    const files = this.fileSystemManager.getParquetFiles(machineId);
    if (files.length === 0) return [];

    // Load first file to get schema
    await this.loadParquetFile(machineId, files[0]);
    
    const result = await this.conn.query(`
      DESCRIBE ${machineId}_${files[0].replace('.parquet', '')}
    `);

    const schema = result.toArray();
    return schema
      .filter((col: any) => col.column_name !== 'timestamp')
      .map((col: any) => col.column_name);
  }

  /**
   * Get data statistics
   */
  async getDataStatistics(
    machineId: string,
    parameter: string
  ): Promise<{
    count: number;
    min: number;
    max: number;
    avg: number;
    stddev: number;
  }> {
    if (!this.conn) throw new Error('DuckDB not initialized');

    const files = this.fileSystemManager.getParquetFiles(machineId);
    const tables = [];
    
    for (const file of files) {
      await this.loadParquetFile(machineId, file);
      tables.push(`${machineId}_${file.replace('.parquet', '')}`);
    }

    const sql = `
      SELECT 
        COUNT("${parameter}") as count,
        MIN("${parameter}") as min,
        MAX("${parameter}") as max,
        AVG("${parameter}") as avg,
        STDDEV("${parameter}") as stddev
      FROM (
        ${tables.map(t => `SELECT "${parameter}" FROM ${t}`).join(' UNION ALL ')}
      )
    `;

    const result = await this.query(sql);
    return result[0];
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.conn) {
      await this.conn.close();
      this.conn = null;
    }

    if (this.db) {
      await this.db.terminate();
      this.db = null;
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.db !== null && this.conn !== null;
  }
}