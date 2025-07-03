// Base chart properties shared across all chart components
export interface BaseChartProps {
  width?: number;
  height?: number;
  title?: string;
  className?: string;
}

// Chart data structure
export interface ChartData {
  timestamps: number[];
  values: number[][];
}

// Single series data (for backwards compatibility)
export type SingleSeriesData = [number[], number[]];

// Multi-series data
export type MultiSeriesData = number[][];

// Series configuration
export interface SeriesConfig {
  label: string;
  color: {
    fill: string;
    stroke: string;
  };
  visible?: boolean;
  pointSize?: number;
  strokeWidth?: number;
}

// Chart options
export interface ChartOptions {
  series?: SeriesConfig[];
  yLabel?: string;
  xLabel?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  timeAxis?: boolean;
}

// Grid size options
export type GridSize = '1x1' | '2x2' | '3x3' | '4x4';

// Grid dimensions
export interface GridDimensions {
  rows: number;
  cols: number;
}

// Chart metadata for multi-chart views
export interface ChartMetadata {
  id: number;
  data: MultiSeriesData;
  labels: string[];
  title: string;
  sensorType?: string;
}