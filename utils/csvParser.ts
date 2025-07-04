import Papa from 'papaparse';
import { getProcessingConfig, ProcessingConfig } from '../config/processing.config';
import { 
  CSVParameter, 
  ParsedCSVData, 
  LongFormatRecord, 
  FileParseResult as ImportedFileParseResult, 
  MultiFileParseResult 
} from '../types/csv';
import { readCSVFileWithEncoding, detectEncoding, type SupportedEncoding } from '../utils/encoding';

interface CSVRow {
  [key: string]: string;
}

// Internal FileParseResult type with parameterIds for backward compatibility
export interface InternalFileParseResult extends Omit<ImportedFileParseResult, 'parameterInfo'> {
  parameterIds: Set<string>;
}

// Internal MultiFileParseResult type for csvParser internal use
interface InternalMultiFileParseResult extends Omit<MultiFileParseResult, 'fileResults'> {
  fileResults: Record<string, InternalFileParseResult>;
}

// Re-export the imported type for external use
export type FileParseResult = InternalFileParseResult;

// Type for chart data
export type MultiSeriesData = [number[], ...number[][]];

export class CSVParser {
  private encoding?: SupportedEncoding;
  private duckdbManager?: any;
  private config: ProcessingConfig;

  constructor(options?: { encoding?: SupportedEncoding | string; duckdbManager?: any; config?: ProcessingConfig }) {
    this.encoding = options?.encoding as SupportedEncoding | undefined;
    this.duckdbManager = options?.duckdbManager;
    this.config = options?.config || getProcessingConfig();
  }

  async parseFile(file: File): Promise<ParsedCSVData> {
    return CSVParser.parse(file, this.encoding);
  }

  static async parse(file: File, encoding?: SupportedEncoding | string): Promise<ParsedCSVData> {
    try {
      // エンコーディングを指定して読み込み
      const text = await readCSVFileWithEncoding(file, encoding as SupportedEncoding | undefined);
      
      // 実際に使用されたエンコーディングを検出
      const buffer = await file.arrayBuffer();
      const detectedEncoding = detectEncoding(buffer);
      
      const parsedData = this.parseCSVWithSpecialHeader(text, file.name);
      // 検出されたエンコーディングを記録
      parsedData.detectedEncoding = detectedEncoding;
      
      return parsedData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to parse CSV file');
    }
  }

  static parseCSVWithSpecialHeader(csvText: string, fileName: string): ParsedCSVData {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 4) {
      throw new Error('CSV file must have at least 4 rows: parameter IDs, names, units, and data');
    }

    // Parse header rows
    const parameterIds = Papa.parse(lines[0], { delimiter: ',' }).data[0] as string[];
    const parameterNames = Papa.parse(lines[1], { delimiter: ',' }).data[0] as string[];
    const units = Papa.parse(lines[2], { delimiter: ',' }).data[0] as string[];

    // Validate headers
    if (parameterIds.length !== parameterNames.length || parameterIds.length !== units.length) {
      throw new Error('Header rows must have the same number of columns');
    }

    // Initialize parameters (skip first column which is timestamp)
    const parameters: CSVParameter[] = [];
    const usedIds = new Set<string>();
    
    for (let i = 1; i < parameterIds.length; i++) {
      // Clean parameter ID
      let cleanId = (parameterIds[i] || '').trim();
      if (!cleanId) {
        console.warn(`Skipping empty parameter at column ${i + 1}`);
        continue;
      }

      // Check for duplicate IDs and make unique if necessary
      const originalId = cleanId;
      let counter = 2;
      while (usedIds.has(cleanId)) {
        cleanId = `${originalId}_${counter}`;
        counter++;
      }
      
      if (originalId !== cleanId) {
        console.warn(`Duplicate parameter ID '${originalId}' found at column ${i + 1}. Renamed to '${cleanId}'.`);
      }
      
      usedIds.add(cleanId);

      parameters.push({
        id: cleanId,
        name: (parameterNames[i] || '').trim() || cleanId,
        unit: (units[i] || '').trim() || '-',
        columnIndex: i,
        data: []
      });
    }

    // Parse data rows
    const timestamps: Date[] = [];
    const errors: string[] = [];
    const dataText = lines.slice(3).join('\n');

    let processedRows = 0;
    const config = getProcessingConfig();
    const BATCH_SIZE = config.batchSizes.csvParsing;
    const parsedResult = Papa.parse(dataText, {
      delimiter: ',',
      dynamicTyping: true,
      skipEmptyLines: true,
      step: function(result, parser) {
        if (result.errors.length > 0) {
          errors.push(...result.errors.map(e => `Row ${processedRows + 4}: ${e.message}`));
        }

        if (result.data && Array.isArray(result.data)) {
          const row = result.data as any[];
          
          // Parse timestamp
          const timestampValue = row[0];
          let timestamp: Date | null = null;
          
          if (timestampValue) {
            if (typeof timestampValue === 'string') {
              timestamp = new Date(timestampValue);
            } else if (typeof timestampValue === 'number') {
              // Handle Excel serial date
              timestamp = new Date((timestampValue - 25569) * 86400 * 1000);
            }
          }

          if (!timestamp || isNaN(timestamp.getTime())) {
            errors.push(`Row ${processedRows + 4}: Invalid timestamp: ${timestampValue}`);
            return;
          }

          timestamps.push(timestamp);

          // Parse parameter values
          for (let i = 0; i < parameters.length; i++) {
            const value = row[i + 1];
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            parameters[i].data.push(isNaN(numValue) ? 0 : numValue);
          }

          processedRows++;
        }
      }
    });

    if (parsedResult.errors.length > 0) {
      errors.push(...parsedResult.errors.map(e => e.message));
    }

    if (timestamps.length === 0) {
      throw new Error('No valid data rows found in CSV file');
    }

    return {
      timestamps,
      parameters,
      fileName,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // Parse CSV and convert to Long Format for easier merging
  static async parseToLongFormat(file: File, encoding?: SupportedEncoding | string): Promise<InternalFileParseResult> {
    try {
      // エンコーディングを指定して読み込み
      const text = await readCSVFileWithEncoding(file, encoding as SupportedEncoding | undefined);
      const longFormatData = this.convertToLongFormat(text, file.name);
      return longFormatData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to parse CSV file to long format');
    }
  }

  static convertToLongFormat(csvText: string, fileName: string): InternalFileParseResult {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 4) {
      throw new Error('CSV file must have at least 4 rows: parameter IDs, names, units, and data');
    }

    // Parse header rows
    const parameterIds = Papa.parse(lines[0], { delimiter: ',' }).data[0] as string[];
    const parameterNames = Papa.parse(lines[1], { delimiter: ',' }).data[0] as string[];
    const units = Papa.parse(lines[2], { delimiter: ',' }).data[0] as string[];

    // Validate headers
    if (parameterIds.length !== parameterNames.length || parameterIds.length !== units.length) {
      throw new Error('Header rows must have the same number of columns');
    }

    // Track parameter IDs and create mapping
    const parameterIdSet = new Set<string>();
    const parameterInfo: { id: string; name: string; unit: string }[] = [];
    const usedIds = new Set<string>();
    
    for (let i = 1; i < parameterIds.length; i++) {
      let cleanId = (parameterIds[i] || '').trim();
      if (!cleanId) continue;
      
      // Check for duplicate IDs and make unique if necessary
      const originalId = cleanId;
      let counter = 2;
      while (usedIds.has(cleanId)) {
        cleanId = `${originalId}_${counter}`;
        counter++;
      }
      
      if (originalId !== cleanId) {
        console.warn(`Duplicate parameter ID '${originalId}' found at column ${i + 1}. Renamed to '${cleanId}'.`);
      }
      
      usedIds.add(cleanId);
      parameterIdSet.add(cleanId);
      parameterInfo.push({
        id: cleanId,
        name: (parameterNames[i] || '').trim() || cleanId,
        unit: (units[i] || '').trim() || '-'
      });
    }

    // Parse data rows and convert to long format
    const records: LongFormatRecord[] = [];
    const errors: string[] = [];
    let minTime: Date | null = null;
    let maxTime: Date | null = null;
    const dataText = lines.slice(3).join('\n');

    const parsedResult = Papa.parse(dataText, {
      delimiter: ',',
      dynamicTyping: true,
      skipEmptyLines: true
    });

    let rowIndex = 0;
    for (const row of parsedResult.data as any[][]) {
      if (!row || row.length === 0) continue;

      // Parse timestamp
      const timestampValue = row[0];
      let timestamp: Date | null = null;
      
      if (timestampValue) {
        if (typeof timestampValue === 'string') {
          timestamp = new Date(timestampValue);
        } else if (typeof timestampValue === 'number') {
          // Handle Excel serial date
          timestamp = new Date((timestampValue - 25569) * 86400 * 1000);
        }
      }

      if (!timestamp || isNaN(timestamp.getTime())) {
        errors.push(`Row ${rowIndex + 4}: Invalid timestamp: ${timestampValue}`);
        rowIndex++;
        continue;
      }

      // Update time range
      if (!minTime || timestamp < minTime) minTime = timestamp;
      if (!maxTime || timestamp > maxTime) maxTime = timestamp;

      // Convert to long format records
      for (let i = 0; i < parameterInfo.length; i++) {
        const value = row[i + 1];
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        
        if (!isNaN(numValue)) {
          records.push({
            timestamp,
            parameterId: parameterInfo[i].id,
            value: numValue,
            parameterName: parameterInfo[i].name,
            unit: parameterInfo[i].unit,
            sourceFile: fileName
          });
        }
      }

      rowIndex++;
    }

    if (parsedResult.errors.length > 0) {
      errors.push(...parsedResult.errors.map(e => `Row ${e.row}: ${e.message}`));
    }

    if (records.length === 0) {
      throw new Error('No valid data found in CSV file');
    }

    return {
      records,
      parameterIds: parameterIdSet,
      timeRange: {
        start: minTime || new Date(),
        end: maxTime || new Date()
      },
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // Merge files using DuckDB when available and beneficial
  static async mergeLongFormatFilesWithDuckDB(
    files: File[],
    duckdbManager: any,
    onProgress?: (progress: { current: number; total: number; phase: string }) => void
  ): Promise<MultiFileParseResult> {
    try {
      // Read all files to ArrayBuffer
      const csvFiles = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      );

      // Use DuckDB to merge
      const result = await duckdbManager.mergeCSVFilesWithDuckDB(csvFiles, onProgress);
      
      // Convert Parquet result back to ParsedCSVData format
      // This would need proper implementation to read Parquet data
      // For now, we'll throw an error to indicate this needs implementation
      throw new Error('Parquet to ParsedCSVData conversion not yet implemented');
      
    } catch (error) {
      console.error('DuckDB merge failed:', error);
      throw error;
    }
  }

  // Merge multiple Long Format files with streaming/chunked processing
  static async mergeLongFormatFilesStreaming(
    fileResults: InternalFileParseResult[],
    onProgress?: (progress: { current: number; total: number; memory?: number }) => void
  ): Promise<InternalMultiFileParseResult> {
    const parameterMap: Record<string, { name: string; unit: string; sources: Set<string> }> = {};
    const warnings: string[] = [];
    let duplicatesResolved = 0;
    let totalRecords = 0;

    // Use Map instead of object for better memory efficiency
    const recordsMap = new Map<string, LongFormatRecord>();
    
    // Process each file sequentially to manage memory
    for (let fileIndex = 0; fileIndex < fileResults.length; fileIndex++) {
      const fileResult = fileResults[fileIndex];
      
      // Process records in smaller batches
      const config = getProcessingConfig();
      const BATCH_SIZE = config.batchSizes.streaming;
      
      for (let i = 0; i < fileResult.records.length; i += BATCH_SIZE) {
        const batch = fileResult.records.slice(i, Math.min(i + BATCH_SIZE, fileResult.records.length));
        
        for (const record of batch) {
          const key = `${record.timestamp.toISOString()}_${record.parameterId}`;
          
          if (recordsMap.has(key)) {
            // Duplicate found
            const existing = recordsMap.get(key)!;
            if (Math.abs(existing.value - record.value) > 0.0001) {
              warnings.push(
                `Duplicate data for ${record.parameterId} at ${record.timestamp.toISOString()}: ` +
                `${existing.value} (${existing.sourceFile}) vs ${record.value} (${record.sourceFile}). ` +
                `Using value from ${record.sourceFile}.`
              );
            }
            duplicatesResolved++;
          }
          
          recordsMap.set(key, record);

          // Track parameter info
          if (!parameterMap[record.parameterId]) {
            parameterMap[record.parameterId] = {
              name: record.parameterName,
              unit: record.unit,
              sources: new Set()
            };
          }
          parameterMap[record.parameterId].sources.add(record.sourceFile);
        }

        totalRecords = recordsMap.size;
        
        // Report progress
        if (onProgress) {
          const progress = ((fileIndex * fileResult.records.length + i + batch.length) / 
                          fileResults.reduce((sum, fr) => sum + fr.records.length, 0)) * 100;
          
          // Estimate memory usage
          const memoryUsage = process.memoryUsage?.() || { heapUsed: 0 };
          onProgress({
            current: Math.round(progress),
            total: 100,
            memory: Math.round(memoryUsage.heapUsed / 1024 / 1024) // MB
          });
        }

        // Allow event loop to process other tasks
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Collect errors
      if (fileResult.errors) {
        warnings.push(...fileResult.errors);
      }
    }

    try {
      // Convert Map values to array for processing
      const allRecords = Array.from(recordsMap.values());
      
      // Convert back to Wide Format with streaming
      const mergedData = await this.longToWideFormatStreaming(allRecords, parameterMap, onProgress);

      return {
        mergedData,
        fileResults: fileResults.reduce((acc, fr, idx) => {
          acc[`file_${idx}`] = fr;
          return acc;
        }, {} as Record<string, InternalFileParseResult>),
        totalRecords: allRecords.length,
        duplicatesResolved,
        warnings
      };
    } catch (error) {
      if (error instanceof RangeError && error.message.includes('Maximum call stack')) {
        const totalSize = recordsMap.size;
        const uniqueTimestamps = new Set(Array.from(recordsMap.keys()).map(k => k.split('_')[0])).size;
        const uniqueParameters = new Set(Array.from(recordsMap.keys()).map(k => k.split('_')[1])).size;
        throw new Error(
          `Files are too large to process (${totalSize.toLocaleString()} data points, ` +
          `${uniqueTimestamps.toLocaleString()} timestamps × ${uniqueParameters.toLocaleString()} parameters). ` +
          `Please reduce the time range or number of parameters.`
        );
      }
      throw error;
    } finally {
      // Clear the map to free memory
      recordsMap.clear();
    }
  }

  // Merge multiple Long Format files with batch processing (fallback for non-streaming)
  static mergeLongFormatFiles(fileResults: InternalFileParseResult[]): InternalMultiFileParseResult {
    const parameterMap: Record<string, { name: string; unit: string; sources: Set<string> }> = {};
    const duplicateMap: Record<string, LongFormatRecord> = {};
    const warnings: string[] = [];
    let duplicatesResolved = 0;

    // Process files in batches to avoid deep recursion
    const config = getProcessingConfig();
    const BATCH_SIZE = config.batchSizes.merging;
    let processedRecords = 0;

    try {
      // Process each file
      for (let fileIndex = 0; fileIndex < fileResults.length; fileIndex++) {
        const fileResult = fileResults[fileIndex];
        
        // Process records in batches
        for (let i = 0; i < fileResult.records.length; i += BATCH_SIZE) {
          const batch = fileResult.records.slice(i, Math.min(i + BATCH_SIZE, fileResult.records.length));
          
          for (const record of batch) {
            const key = `${record.timestamp.toISOString()}_${record.parameterId}`;
            
            if (duplicateMap[key]) {
              // Duplicate found
              const existing = duplicateMap[key];
              if (Math.abs(existing.value - record.value) > 0.0001) {
                warnings.push(
                  `Duplicate data for ${record.parameterId} at ${record.timestamp.toISOString()}: ` +
                  `${existing.value} (${existing.sourceFile}) vs ${record.value} (${record.sourceFile}). ` +
                  `Using value from ${record.sourceFile}.`
                );
              }
              duplicatesResolved++;
            }
            
            duplicateMap[key] = record;

            // Track parameter info
            if (!parameterMap[record.parameterId]) {
              parameterMap[record.parameterId] = {
                name: record.parameterName,
                unit: record.unit,
                sources: new Set()
              };
            }
            parameterMap[record.parameterId].sources.add(record.sourceFile);
            
            processedRecords++;
          }
        }

        // Collect errors
        if (fileResult.errors) {
          warnings.push(...fileResult.errors);
        }
      }

      // Convert duplicateMap values to array
      const allRecords = Object.values(duplicateMap);

      // Convert back to Wide Format
      const mergedData = CSVParser.longToWideFormat(allRecords, parameterMap);

      return {
        mergedData,
        fileResults: fileResults.reduce((acc, fr, idx) => {
          acc[`file_${idx}`] = fr;
          return acc;
        }, {} as Record<string, InternalFileParseResult>),
        totalRecords: allRecords.length,
        duplicatesResolved,
        warnings
      };
    } catch (error) {
      // Handle stack overflow or other errors
      if (error instanceof RangeError && error.message.includes('Maximum call stack')) {
        const totalSize = fileResults.reduce((sum, fr) => sum + fr.records.length, 0);
        const avgRecordsPerFile = Math.round(totalSize / fileResults.length);
        throw new Error(
          `Files are too large to process (${totalSize.toLocaleString()} total records, ` +
          `average ${avgRecordsPerFile.toLocaleString()} records per file). ` +
          `Please split into smaller files with fewer than 100,000 records each.`
        );
      }
      throw error;
    }
  }

  // Convert Long Format back to Wide Format with streaming
  static async longToWideFormatStreaming(
    records: LongFormatRecord[],
    parameterInfo: Record<string, { name: string; unit: string; sources: Set<string> }>,
    onProgress?: (progress: { current: number; total: number; memory?: number }) => void
  ): Promise<ParsedCSVData> {
    // Use Map for better memory efficiency
    const timeMap = new Map<string, Map<string, number>>();
    const timestamps = new Set<string>();
    const parameterIds = new Set<string>();
    
    try {
      // Process records in smaller batches
      const config = getProcessingConfig();
      const BATCH_SIZE = config.batchSizes.streaming;
      
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, Math.min(i + BATCH_SIZE, records.length));
        
        for (const record of batch) {
          const timeKey = record.timestamp.toISOString();
          timestamps.add(timeKey);
          parameterIds.add(record.parameterId);
          
          if (!timeMap.has(timeKey)) {
            timeMap.set(timeKey, new Map());
          }
          timeMap.get(timeKey)!.set(record.parameterId, record.value);
        }

        // Report progress
        if (onProgress) {
          const progress = (i + batch.length) / records.length * 50; // First 50% for grouping
          const memoryUsage = process.memoryUsage?.() || { heapUsed: 0 };
          onProgress({
            current: Math.round(progress),
            total: 100,
            memory: Math.round(memoryUsage.heapUsed / 1024 / 1024)
          });
        }

        // Allow event loop to process
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Sort timestamps
      const sortedTimestamps = Array.from(timestamps).sort();
      const sortedParameterIds = Array.from(parameterIds).sort();

      // Initialize parameters
      const parameters: CSVParameter[] = sortedParameterIds.map((id, index) => {
        const info = parameterInfo[id];
        return {
          id,
          name: info?.name || id,
          unit: info?.unit || '-',
          columnIndex: index + 1, // +1 because first column is timestamp
          data: []
        };
      });

      // Fill data arrays with streaming
      const timestampDates: Date[] = [];
      const TIMESTAMP_BATCH_SIZE = config.batchSizes.conversion;
      
      for (let i = 0; i < sortedTimestamps.length; i += TIMESTAMP_BATCH_SIZE) {
        const timestampBatch = sortedTimestamps.slice(i, Math.min(i + TIMESTAMP_BATCH_SIZE, sortedTimestamps.length));
        
        for (const timeKey of timestampBatch) {
          timestampDates.push(new Date(timeKey));
          const timeData = timeMap.get(timeKey)!;
          
          for (const param of parameters) {
            const value = timeData.get(param.id);
            param.data.push(value !== undefined ? value : 0);
          }
        }

        // Report progress
        if (onProgress) {
          const progress = 50 + (i + timestampBatch.length) / sortedTimestamps.length * 50; // Second 50%
          const memoryUsage = process.memoryUsage?.() || { heapUsed: 0 };
          onProgress({
            current: Math.round(progress),
            total: 100,
            memory: Math.round(memoryUsage.heapUsed / 1024 / 1024)
          });
        }

        // Allow event loop to process
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Clear the map to free memory
      timeMap.clear();

      return {
        timestamps: timestampDates,
        parameters,
        fileName: 'merged_data',
        errors: undefined
      };
    } catch (error) {
      if (error instanceof RangeError && error.message.includes('Maximum call stack')) {
        const numTimestamps = timestamps.size;
        const numParameters = parameterIds.size;
        const totalDataPoints = numTimestamps * numParameters;
        throw new Error(
          `Data is too large to convert (${totalDataPoints.toLocaleString()} data points = ` +
          `${numTimestamps.toLocaleString()} timestamps × ${numParameters.toLocaleString()} parameters). ` +
          `Please reduce the time range or number of parameters.`
        );
      }
      throw error;
    }
  }

  // Convert Long Format back to Wide Format with batch processing
  static longToWideFormat(
    records: LongFormatRecord[],
    parameterInfo: Record<string, { name: string; unit: string; sources: Set<string> }>
  ): ParsedCSVData {
    // Group records by timestamp with batch processing
    const timeMap: Record<string, Record<string, number>> = {};
    const timestamps = new Set<string>();
    const parameterIds = new Set<string>();
    
    try {
      // Process records in batches
      const config = getProcessingConfig();
      const BATCH_SIZE = config.batchSizes.merging;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, Math.min(i + BATCH_SIZE, records.length));
        
        for (const record of batch) {
          const timeKey = record.timestamp.toISOString();
          timestamps.add(timeKey);
          parameterIds.add(record.parameterId);
          
          if (!timeMap[timeKey]) {
            timeMap[timeKey] = {};
          }
          timeMap[timeKey][record.parameterId] = record.value;
        }
      }

      // Sort timestamps
      const sortedTimestamps = Array.from(timestamps).sort();
      const sortedParameterIds = Array.from(parameterIds).sort();

      // Initialize parameters
      const parameters: CSVParameter[] = sortedParameterIds.map((id, index) => {
        const info = parameterInfo[id];
        return {
          id,
          name: info?.name || id,
          unit: info?.unit || '-',
          columnIndex: index + 1, // +1 because first column is timestamp
          data: []
        };
      });

      // Fill data arrays in batches
      const timestampDates: Date[] = [];
      const TIMESTAMP_BATCH_SIZE = config.batchSizes.conversion;
      
      for (let i = 0; i < sortedTimestamps.length; i += TIMESTAMP_BATCH_SIZE) {
        const timestampBatch = sortedTimestamps.slice(i, Math.min(i + TIMESTAMP_BATCH_SIZE, sortedTimestamps.length));
        
        for (const timeKey of timestampBatch) {
          timestampDates.push(new Date(timeKey));
          const timeData = timeMap[timeKey];
          
          for (const param of parameters) {
            const value = timeData[param.id];
            param.data.push(value !== undefined ? value : 0);
          }
        }
      }

      return {
        timestamps: timestampDates,
        parameters,
        fileName: 'merged_data',
        errors: undefined
      };
    } catch (error) {
      if (error instanceof RangeError && error.message.includes('Maximum call stack')) {
        const numTimestamps = timestamps.size;
        const numParameters = parameterIds.size;
        const totalDataPoints = numTimestamps * numParameters;
        throw new Error(
          `Data is too large to convert (${totalDataPoints.toLocaleString()} data points = ` +
          `${numTimestamps.toLocaleString()} timestamps × ${numParameters.toLocaleString()} parameters). ` +
          `Please reduce the time range or number of parameters.`
        );
      }
      throw error;
    }
  }

  // Export ParsedCSVData back to CSV format
  static exportToCSV(data: ParsedCSVData): string {
    const lines: string[] = [];
    
    // Header row 1: Parameter IDs
    const headerIds = ['timestamp', ...data.parameters.map(p => p.id)];
    lines.push(headerIds.join(','));
    
    // Header row 2: Parameter Names
    const headerNames = ['timestamp', ...data.parameters.map(p => p.name)];
    lines.push(headerNames.join(','));
    
    // Header row 3: Units
    const headerUnits = ['', ...data.parameters.map(p => p.unit)];
    lines.push(headerUnits.join(','));
    
    // Data rows
    for (let i = 0; i < data.timestamps.length; i++) {
      const row = [data.timestamps[i].toISOString()];
      for (const param of data.parameters) {
        row.push(param.data[i].toString());
      }
      lines.push(row.join(','));
    }
    
    return lines.join('\n');
  }

  // Convert ParsedCSVData to LongFormat
  static toLongFormat(data: ParsedCSVData, sourceFile: string): InternalFileParseResult {
    const records: LongFormatRecord[] = [];
    const parameterIds = new Set<string>();
    let minTime: Date | null = null;
    let maxTime: Date | null = null;

    // Convert each data point to long format
    for (let i = 0; i < data.timestamps.length; i++) {
      const timestamp = data.timestamps[i];
      
      // Update time range
      if (!minTime || timestamp < minTime) minTime = timestamp;
      if (!maxTime || timestamp > maxTime) maxTime = timestamp;

      for (const param of data.parameters) {
        parameterIds.add(param.id);
        
        const value = param.data[i];
        if (!isNaN(value)) {
          records.push({
            timestamp,
            parameterId: param.id,
            value,
            parameterName: param.name,
            unit: param.unit,
            sourceFile
          });
        }
      }
    }

    return {
      records,
      parameterIds,
      timeRange: {
        start: minTime || new Date(),
        end: maxTime || new Date()
      },
      errors: data.errors
    };
  }

  // Convert chart data from parsed CSV data
  static toChartData(data: ParsedCSVData, parameterIds: string[]): MultiSeriesData {
    // Convert timestamps to seconds for uPlot
    const timestamps = data.timestamps.map(t => t.getTime() / 1000);
    
    // Get data for selected parameters
    const series = parameterIds.map(id => {
      const param = data.parameters.find(p => p.id === id);
      return param ? param.data : [];
    });

    return [timestamps, ...series] as MultiSeriesData;
  }

  // Get parameter labels for chart
  static getParameterLabels(data: ParsedCSVData, parameterIds: string[]): string[] {
    return parameterIds.map(id => {
      const param = data.parameters.find(p => p.id === id);
      return param ? `${param.name} (${param.unit})` : id;
    });
  }
}