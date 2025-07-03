/**
 * CSV to Parquet conversion utilities
 * Handles special 3-row header format and converts to Parquet
 */

import Papa from 'papaparse';
import type { CSVHeader, CSVParameter } from '../types/csv';

interface CSVParseResult {
  headers: CSVHeader;
  data: Array<Record<string, any>>;
  parameters: CSVParameter[];
  errors: string[];
}

/**
 * Parse CSV with 3-row header format
 */
export async function parseCSVWithSpecialHeader(
  file: File,
  onProgress?: (progress: number) => void
): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const errors: string[] = [];

    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 4) {
        reject(new Error('CSV must have at least 3 header rows and 1 data row'));
        return;
      }

      // Parse header rows
      const headerRows = lines.slice(0, 3).map(line => 
        Papa.parse(line, { delimiter: ',' }).data[0] as string[]
      );

      const headers: CSVHeader = {
        ids: headerRows[0].slice(1),
        names: headerRows[1].slice(1),
        units: headerRows[2].slice(1),
      };

      // Validate headers
      const paramCount = headers.ids.length;
      if (headers.names.length !== paramCount || headers.units.length !== paramCount) {
        reject(new Error('Header rows must have the same number of columns'));
        return;
      }

      // Create parameter info with deduplication
      const usedIds = new Set<string>();
      const parameters: CSVParameter[] = headers.ids.map((id, index) => {
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
          name: headers.names[index] || `Parameter ${index + 1}`,
          unit: headers.units[index] || '',
          columnIndex: index + 1,
          data: [],
        };
      });

      // Parse data rows
      const dataLines = lines.slice(3);
      const data: Array<Record<string, any>> = [];
      let processedRows = 0;

      Papa.parse(dataLines.join('\n'), {
        delimiter: ',',
        dynamicTyping: true,
        skipEmptyLines: true,
        step: (results, parser) => {
          if (results.errors.length > 0) {
            results.errors.forEach(err => {
              errors.push(`Row ${processedRows + 4}: ${err.message}`);
            });
          }

          if (results.data && Array.isArray(results.data)) {
            const row = results.data as any[];
            const record: Record<string, any> = {
              timestamp: row[0], // Keep original timestamp format
            };

            // Add parameter values
            parameters.forEach((param, index) => {
              if (index < row.length - 1) {
                record[param.id] = row[index + 1];
              }
            });

            data.push(record);
            processedRows++;

            // Report progress
            if (onProgress && processedRows % 1000 === 0) {
              const progress = (processedRows / dataLines.length) * 100;
              onProgress(Math.min(progress, 99));
            }
          }
        },
        complete: () => {
          onProgress?.(100);
          resolve({
            headers,
            data,
            parameters,
            errors,
          });
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Convert parsed CSV data to Parquet-ready format
 */
export function prepareDataForParquet(
  parseResult: CSVParseResult
): {
  schema: Record<string, string>;
  records: Array<Record<string, any>>;
} {
  // Build schema
  const schema: Record<string, string> = {
    timestamp: 'TIMESTAMP',
  };

  parseResult.parameters.forEach(param => {
    schema[param.id] = 'DOUBLE';
  });

  // Process records
  const records = parseResult.data.map(row => {
    const record: Record<string, any> = {
      timestamp: parseTimestamp(row.timestamp),
    };

    parseResult.parameters.forEach(param => {
      const value = row[param.id];
      record[param.id] = value !== null && value !== undefined ? Number(value) : null;
    });

    return record;
  });

  return { schema, records };
}

/**
 * Parse various timestamp formats
 */
function parseTimestamp(value: any): Date {
  if (!value) {
    throw new Error('Invalid timestamp: empty value');
  }

  // Try different formats
  const formats = [
    // ISO format
    () => new Date(value),
    
    // Japanese format: 2024/01/01 12:00:00
    () => {
      const match = String(value).match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
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
    () => {
      const timestamp = Number(value);
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
    const date = format();
    if (date && !isNaN(date.getTime())) {
      return date;
    }
  }

  throw new Error(`Unable to parse timestamp: ${value}`);
}

/**
 * Group data by year-month for partitioning
 */
export function partitionDataByMonth(
  records: Array<Record<string, any>>
): Map<string, Array<Record<string, any>>> {
  const partitions = new Map<string, Array<Record<string, any>>>();

  records.forEach(record => {
    const date = record.timestamp;
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!partitions.has(yearMonth)) {
      partitions.set(yearMonth, []);
    }

    partitions.get(yearMonth)!.push(record);
  });

  return partitions;
}