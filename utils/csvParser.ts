import Papa from 'papaparse';
import type { ParsedCSVData, CSVParameter, CSVHeader, CSVParseOptions } from '../types/csv';

const DEFAULT_OPTIONS: CSVParseOptions = {
  delimiter: ',',
  encoding: 'UTF-8',
  maxFileSize: 50 * 1024 * 1024, // 50MB
};

export class CSVParser {
  private options: CSVParseOptions;

  constructor(options: CSVParseOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async parseFile(file: File): Promise<ParsedCSVData> {
    // Check file size
    if (file.size > this.options.maxFileSize!) {
      throw new Error(`File size exceeds limit of ${this.options.maxFileSize! / 1024 / 1024}MB`);
    }

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        delimiter: this.options.delimiter,
        encoding: this.options.encoding,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const parsed = this.processCSVData(results.data as string[][], file.name);
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
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

    // Parse timestamps and data
    const timestamps: Date[] = [];
    const parameters: CSVParameter[] = header.ids.map((id, index) => ({
      id: id || `PARAM${index + 1}`,
      name: header.names[index] || `Parameter ${index + 1}`,
      unit: header.units[index] || '',
      columnIndex: index + 1,
      data: [],
    }));

    const errors: string[] = [];

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
}