// CSV data types
export interface CSVParameter {
  id: string;        // e.g., "TEMP001"
  name: string;      // e.g., "温度"
  unit: string;      // e.g., "°C"
  columnIndex: number;
  data: number[];
}

export interface ParsedCSVData {
  timestamps: Date[];
  parameters: CSVParameter[];
  fileName: string;
  errors?: string[];
  detectedEncoding?: string;
}

export interface CSVHeader {
  ids: string[];
  names: string[];
  units: string[];
}

export interface CSVParseOptions {
  dateFormat?: string;
  delimiter?: string;
  encoding?: 'UTF8' | 'SJIS' | 'EUCJP' | 'JIS' | 'AUTO' | string;
  maxFileSize?: number; // in bytes
}

export interface ParameterSelection {
  chartId: string;
  parameterIds: string[];
  title?: string;
}

export interface ChartConfiguration {
  id: string;
  title: string;
  parameterIds: string[];
  gridPosition?: { row: number; col: number };
}

// Long Format data structure for multi-file merging
export interface LongFormatRecord {
  timestamp: Date;
  parameterId: string;
  value: number;
  parameterName: string;
  unit: string;
  sourceFile: string;
}

export interface FileParseResult {
  records: LongFormatRecord[];
  parameterInfo: Map<string, { name: string; unit: string }>;
  timeRange: { start: Date; end: Date };
  errors?: string[];
}

export interface MultiFileParseResult {
  mergedData: ParsedCSVData;
  fileResults: Map<string, FileParseResult>;
  totalRecords: number;
  duplicatesResolved: number;
  warnings: string[];
}