import { ParsedCSVData } from '@/types/csv';
import { FileSystemManager } from '@/lib/fileSystem/fileSystemManager';
import { DuckDBManager } from '@/lib/duckdb/duckdbManager';

export class StorageManager {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private fileSystemManager: FileSystemManager | null = null;
  private duckdbManager: DuckDBManager | null = null;

  async setRootHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    this.rootHandle = handle;
  }

  setFileSystemManager(manager: FileSystemManager): void {
    this.fileSystemManager = manager;
  }

  setDuckDBManager(manager: DuckDBManager): void {
    this.duckdbManager = manager;
  }

  getFileSystemManager(): FileSystemManager | null {
    return this.fileSystemManager;
  }

  getDuckDBManager(): DuckDBManager | null {
    return this.duckdbManager;
  }

  async saveData(data: ParsedCSVData, machineId: string, metadata: any): Promise<void> {
    if (!this.fileSystemManager || !this.duckdbManager) {
      throw new Error('FileSystemManager or DuckDBManager not initialized');
    }

    if (!this.duckdbManager.isInitialized()) {
      await this.duckdbManager.initialize();
    }

    // Prepare data for Parquet conversion
    const schema: Record<string, string> = {
      timestamp: 'TIMESTAMP'
    };
    
    const records: Array<Record<string, any>> = [];
    
    // Build schema from parameters
    data.parameters.forEach(param => {
      schema[param.id] = 'DOUBLE';
    });
    
    // Convert data to records format
    for (let i = 0; i < data.timestamps.length; i++) {
      const record: Record<string, any> = {
        timestamp: data.timestamps[i]
      };
      
      data.parameters.forEach(param => {
        record[param.id] = param.data[i] !== undefined ? param.data[i] : null;
      });
      
      records.push(record);
    }
    
    // Partition data by month
    const partitions = new Map<string, Array<Record<string, any>>>();
    
    records.forEach(record => {
      const date = record.timestamp;
      const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!partitions.has(yearMonth)) {
        partitions.set(yearMonth, []);
      }
      
      partitions.get(yearMonth)!.push(record);
    });
    
    // Convert each partition to Parquet
    for (const [yearMonth, partitionData] of partitions) {
      // Convert partition to CSV format for DuckDB
      const columns = Object.keys(schema);
      const csvLines: string[] = [];
      
      // Header
      csvLines.push(columns.join(','));
      
      // Data rows
      partitionData.forEach(record => {
        const row = columns.map(col => {
          const value = record[col];
          if (value === null || value === undefined) return '';
          if (value instanceof Date) return value.toISOString();
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value.toString();
        });
        csvLines.push(row.join(','));
      });
      
      const csvData = csvLines.join('\n');
      const csvBuffer = new TextEncoder().encode(csvData).buffer as ArrayBuffer;
      
      // Check if existing Parquet file exists for merge
      let existingParquetData: ArrayBuffer | undefined;
      const existingFiles = this.fileSystemManager.getParquetFiles(machineId);
      if (existingFiles.includes(`${yearMonth}.parquet`)) {
        try {
          existingParquetData = await this.fileSystemManager.readParquetFile(
            machineId,
            `${yearMonth}.parquet`
          );
        } catch (err) {
          console.warn(`Could not read existing file for ${yearMonth}:`, err);
        }
      }
      
      // Convert CSV to Parquet with merge if existing data exists
      const parquetData = await this.duckdbManager.csvToParquetWithMerge(
        csvBuffer,
        machineId,
        yearMonth,
        existingParquetData,
        0 // No skip rows since we're providing clean CSV
      );
      
      // Save Parquet file
      await this.fileSystemManager.saveParquetFile(
        machineId,
        yearMonth,
        parquetData
      );
    }
    
    // Save import metadata
    await this.fileSystemManager.saveImportMetadata(machineId, metadata);
    
    console.log(`Successfully saved data for ${machineId} with ${partitions.size} partitions`);
  }

  async loadData(machineId: string, timeRange?: { start: Date; end: Date }): Promise<ParsedCSVData> {
    if (!this.fileSystemManager || !this.duckdbManager) {
      throw new Error('FileSystemManager or DuckDBManager not initialized');
    }

    if (!this.duckdbManager.isInitialized()) {
      await this.duckdbManager.initialize();
    }

    // Get list of parquet files for the machine
    const parquetFiles = this.fileSystemManager.getParquetFiles(machineId);
    if (parquetFiles.length === 0) {
      throw new Error(`No data found for machine: ${machineId}`);
    }

    // Determine which files to load based on time range
    let filesToLoad = parquetFiles;
    if (timeRange) {
      filesToLoad = parquetFiles.filter(fileName => {
        const yearMonth = fileName.replace('.parquet', '');
        const year = parseInt(yearMonth.substring(0, 4));
        const month = parseInt(yearMonth.substring(4, 6)) - 1;
        const fileDate = new Date(year, month);
        const fileEndDate = new Date(year, month + 1, 0);
        
        return fileDate <= timeRange.end && fileEndDate >= timeRange.start;
      });
    }

    if (filesToLoad.length === 0) {
      throw new Error('No data found for the specified time range');
    }

    // Load and merge data from parquet files
    const allData: { timestamps: Date[]; parameters: Map<string, number[]> } = {
      timestamps: [],
      parameters: new Map()
    };

    for (const fileName of filesToLoad) {
      const parquetData = await this.fileSystemManager.readParquetFile(machineId, fileName);
      const jsonData = await this.duckdbManager.parquetToJSON(parquetData);
      
      // Parse the JSON data
      const records = JSON.parse(new TextDecoder().decode(jsonData));
      
      // Extract timestamps and parameter data
      records.forEach((record: any) => {
        const timestamp = new Date(record.timestamp);
        
        // Apply time range filter if specified
        if (timeRange && (timestamp < timeRange.start || timestamp > timeRange.end)) {
          return;
        }
        
        allData.timestamps.push(timestamp);
        
        // Process each parameter
        Object.keys(record).forEach(key => {
          if (key !== 'timestamp') {
            if (!allData.parameters.has(key)) {
              allData.parameters.set(key, []);
            }
            allData.parameters.get(key)!.push(record[key] ?? NaN);
          }
        });
      });
    }

    // Convert to ParsedCSVData format
    const parameters = Array.from(allData.parameters.entries()).map(([id, data]) => ({
      id,
      name: id, // We'll use the ID as name for now
      unit: '',  // Unit information would need to be stored separately
      columnIndex: 0, // Not relevant for loaded data
      data
    }));

    return {
      timestamps: allData.timestamps,
      parameters,
      fileName: `${machineId}_merged`
    };
  }

  async listFiles(): Promise<string[]> {
    // Implementation for listing files
    return [];
  }
}