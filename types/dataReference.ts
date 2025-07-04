export interface DataReference {
  id: string;
  fileName: string;
  dataType: 'csv' | 'parquet';
  totalRows: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  storageLocation?: 'memory' | 'indexeddb' | 'filesystem';
}

export interface ParameterMetadata {
  id: string;
  name: string;
  unit: string;
  columnIndex: number;
  dataReference: string;
  statistics?: {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
  };
}

export interface TimeSeriesMetadata {
  dataReference: string;
  parameters: ParameterMetadata[];
  timestamps: {
    count: number;
    start: Date;
    end: Date;
    interval?: number;
  };
}

export interface DataChunk {
  dataReference: string;
  parameterId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  timestamps: number[];
  values: number[];
}

export interface DataRequest {
  dataReference: string;
  parameterIds: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  downsample?: {
    method: 'average' | 'min' | 'max' | 'first' | 'last';
    targetPoints: number;
  };
}

export interface DataResponse {
  chunks: DataChunk[];
  metadata: {
    totalPoints: number;
    actualPoints: number;
    downsampled: boolean;
  };
}