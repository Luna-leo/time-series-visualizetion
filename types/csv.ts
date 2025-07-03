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
}

export interface CSVHeader {
  ids: string[];
  names: string[];
  units: string[];
}

export interface CSVParseOptions {
  dateFormat?: string;
  delimiter?: string;
  encoding?: string;
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