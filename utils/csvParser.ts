import Papa from 'papaparse';
import type { 
  ParsedCSVData, 
  CSVParameter, 
  CSVHeader, 
  CSVParseOptions, 
  LongFormatRecord, 
  FileParseResult,
  MultiFileParseResult 
} from '../types/csv';
import { readCSVFileWithEncoding, detectEncoding, isValidUTF8, SupportedEncoding } from './encoding';

const DEFAULT_OPTIONS: CSVParseOptions = {
  delimiter: ',',
  encoding: 'UTF-8',
  maxFileSize: 50 * 1024 * 1024, // 50MB
};

export class CSVParser {
  private options: CSVParseOptions;
  private processErrors?: string[];

  constructor(options: CSVParseOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.processErrors = [];
  }

  async parseFile(file: File): Promise<ParsedCSVData> {
    // Check file size
    if (file.size > this.options.maxFileSize!) {
      throw new Error(`File size exceeds limit of ${this.options.maxFileSize! / 1024 / 1024}MB`);
    }

    try {
      // エンコーディングを検出して、UTF-8に変換
      const encoding = this.options.encoding === 'AUTO' ? undefined : this.options.encoding as SupportedEncoding;
      const csvText = await readCSVFileWithEncoding(file, encoding);
      
      // 変換後のテキストが有効なUTF-8かチェック
      if (!isValidUTF8(csvText)) {
        console.warn('変換後のテキストに無効な文字が含まれている可能性があります');
        // エラー配列に警告を追加（後でUIに表示される）
        if (!this.processErrors) {
          this.processErrors = [];
        }
        this.processErrors.push('Warning: ファイルに文字化けの可能性がある文字が含まれています。エンコーディング設定を確認してください。');
      }

      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          delimiter: this.options.delimiter,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              const parsed = this.processCSVData(results.data as string[][], file.name);
              // processErrorsがあれば追加
              if (this.processErrors && this.processErrors.length > 0) {
                parsed.errors = [...(parsed.errors || []), ...this.processErrors];
              }
              // エンコーディング情報を追加
              if (encoding === undefined) {
                const buffer = await file.arrayBuffer();
                const detectedEncoding = detectEncoding(buffer);
                parsed.detectedEncoding = detectedEncoding;
              }
              resolve(parsed);
            } catch (error) {
              reject(error);
            }
          },
          error: (error: any) => {
            reject(new Error(`CSV parsing failed: ${error.message}`));
          },
        });
      });
    } catch (error) {
      throw new Error(`Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processCSVData(data: string[][], fileName: string): ParsedCSVData {
    if (data.length < 4) {
      throw new Error('CSV must have at least 3 header rows and 1 data row');
    }

    // Extract headers (first 3 rows)
    const header: CSVHeader = {
      ids: data[0].slice(1), // Skip first column (timestamp)
      names: data[1].slice(1),
      units: data[2].slice(1),
    };

    // Validate headers
    const paramCount = header.ids.length;
    if (header.names.length !== paramCount || header.units.length !== paramCount) {
      throw new Error('Header rows must have the same number of columns');
    }

    // Parse timestamps and data with deduplication
    const timestamps: Date[] = [];
    const errors: string[] = [];
    const usedIds = new Set<string>();
    const parameters: CSVParameter[] = header.ids.map((id, index) => {
      let uniqueId = id || `PARAM${index + 1}`;
      let counter = 1;
      
      // Check for duplicate IDs and create unique ones
      const baseId = uniqueId;
      while (usedIds.has(uniqueId)) {
        counter++;
        uniqueId = `${baseId}_${counter}`;
      }
      
      usedIds.add(uniqueId);
      
      // If ID was deduplicated, add a warning
      if (counter > 1) {
        errors.push(`Warning: Duplicate parameter ID '${baseId}' found. Renamed to '${uniqueId}'`);
      }
      
      return {
        id: uniqueId,
        name: header.names[index] || `Parameter ${index + 1}`,
        unit: header.units[index] || '',
        columnIndex: index + 1,
        data: [],
      };
    });

    // Process data rows (skip header rows)
    for (let rowIndex = 3; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      
      // Parse timestamp
      const timestampStr = row[0];
      if (!timestampStr) {
        errors.push(`Row ${rowIndex + 1}: Missing timestamp`);
        continue;
      }

      const timestamp = this.parseTimestamp(timestampStr);
      if (!timestamp) {
        errors.push(`Row ${rowIndex + 1}: Invalid timestamp format: ${timestampStr}`);
        continue;
      }

      timestamps.push(timestamp);

      // Parse parameter values
      for (let colIndex = 1; colIndex < row.length && colIndex <= paramCount; colIndex++) {
        const value = parseFloat(row[colIndex]);
        if (isNaN(value)) {
          errors.push(`Row ${rowIndex + 1}, Column ${colIndex + 1}: Invalid number: ${row[colIndex]}`);
          parameters[colIndex - 1].data.push(0); // Use 0 for invalid values
        } else {
          parameters[colIndex - 1].data.push(value);
        }
      }
    }

    // Ensure all parameter arrays have the same length
    const dataLength = timestamps.length;
    parameters.forEach(param => {
      while (param.data.length < dataLength) {
        param.data.push(0);
      }
    });

    return {
      timestamps,
      parameters,
      fileName,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private parseTimestamp(str: string): Date | null {
    // Try multiple date formats
    const formats = [
      // ISO format
      (s: string) => new Date(s),
      // Japanese format: 2024/01/01 12:00:00
      (s: string) => {
        const match = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
        if (match) {
          return new Date(
            parseInt(match[1]),
            parseInt(match[2]) - 1,
            parseInt(match[3]),
            parseInt(match[4]),
            parseInt(match[5]),
            parseInt(match[6])
          );
        }
        return null;
      },
      // Unix timestamp
      (s: string) => {
        const timestamp = parseInt(s);
        if (!isNaN(timestamp)) {
          // Check if it's in seconds or milliseconds
          const date = timestamp > 1e10 ? new Date(timestamp) : new Date(timestamp * 1000);
          if (date.getFullYear() > 1970 && date.getFullYear() < 2100) {
            return date;
          }
        }
        return null;
      },
    ];

    for (const format of formats) {
      const date = format(str);
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  // Convert parsed CSV data to chart format
  static toChartData(
    parsedData: ParsedCSVData,
    selectedParameterIds: string[]
  ): number[][] {
    const timestamps = parsedData.timestamps.map(d => d.getTime() / 1000);
    const data: number[][] = [timestamps];

    selectedParameterIds.forEach(id => {
      const param = parsedData.parameters.find(p => p.id === id);
      if (param) {
        data.push(param.data);
      }
    });

    return data;
  }

  // Get parameter labels for chart
  static getParameterLabels(
    parsedData: ParsedCSVData,
    selectedParameterIds: string[]
  ): string[] {
    return selectedParameterIds.map(id => {
      const param = parsedData.parameters.find(p => p.id === id);
      return param ? `${param.name} (${param.unit})` : id;
    });
  }

  // Convert parsed CSV data to Long Format
  static toLongFormat(parsedData: ParsedCSVData, fileName: string): FileParseResult {
    const records: LongFormatRecord[] = [];
    const parameterInfo: Record<string, { name: string; unit: string }> = {};
    let minTime: Date | null = null;
    let maxTime: Date | null = null;

    // Build parameter info map
    parsedData.parameters.forEach(param => {
      parameterInfo[param.id] = {
        name: param.name,
        unit: param.unit
      };
    });

    // Convert to long format records
    parsedData.timestamps.forEach((timestamp, timeIndex) => {
      parsedData.parameters.forEach(param => {
        if (timeIndex < param.data.length) {
          records.push({
            timestamp,
            parameterId: param.id,
            value: param.data[timeIndex],
            parameterName: param.name,
            unit: param.unit,
            sourceFile: fileName
          });
        }
      });

      // Track time range
      if (!minTime || timestamp < minTime) minTime = timestamp;
      if (!maxTime || timestamp > maxTime) maxTime = timestamp;
    });

    return {
      records,
      parameterInfo,
      timeRange: {
        start: minTime || new Date(),
        end: maxTime || new Date()
      },
      errors: parsedData.errors
    };
  }

  // Merge multiple Long Format files with batch processing
  static mergeLongFormatFiles(fileResults: FileParseResult[]): MultiFileParseResult {
    const parameterMap: Record<string, { name: string; unit: string; sources: Set<string> }> = {};
    const duplicateMap: Record<string, LongFormatRecord> = {};
    const warnings: string[] = [];
    let duplicatesResolved = 0;

    // Process files in batches to avoid deep recursion
    const BATCH_SIZE = 10000;
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
        }, {} as Record<string, FileParseResult>),
        totalRecords: allRecords.length,
        duplicatesResolved,
        warnings
      };
    } catch (error) {
      // Handle stack overflow or other errors
      if (error instanceof RangeError && error.message.includes('Maximum call stack')) {
        throw new Error('Files are too large to process. Please split into smaller files.');
      }
      throw error;
    }
  }

  // Convert Long Format back to Wide Format with batch processing
  static longToWideFormat(
    records: LongFormatRecord[],
    parameterInfo: Record<string, { name: string; unit: string; sources: Set<string> }>
  ): ParsedCSVData {
    try {
      // Group records by timestamp with batch processing
      const timeMap: Record<string, Record<string, number>> = {};
      const timestamps = new Set<string>();
      const parameterIds = new Set<string>();

      // Process records in batches
      const BATCH_SIZE = 10000;
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

      // Create parameters array
      const parameters: CSVParameter[] = sortedParameterIds.map((id, index) => {
        const info = parameterInfo[id] || { name: id, unit: '' };
        return {
          id,
          name: info.name,
          unit: info.unit,
          columnIndex: index + 1,
          data: []
        };
      });

      // Fill data arrays in batches
      const timestampDates: Date[] = [];
      const TIMESTAMP_BATCH_SIZE = 1000;
      
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
        throw new Error('Data is too large to convert. Please reduce the number of parameters or time points.');
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
    data.timestamps.forEach((timestamp, index) => {
      const row = [timestamp.toISOString()];
      data.parameters.forEach(param => {
        row.push(param.data[index]?.toString() || '');
      });
      lines.push(row.join(','));
    });
    
    return lines.join('\n');
  }
}