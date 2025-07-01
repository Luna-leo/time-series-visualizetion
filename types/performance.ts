// Performance metrics for data loading and rendering
export interface PerformanceMetrics {
  dataFetchTime: number;
  dataGenerationTime?: number;
  renderStartTime: number;
  renderEndTime?: number;
  totalCharts: number;
  totalDataPoints: number;
}

// Load progress tracking
export interface LoadProgress {
  current: number;
  total: number;
  percentage: number;
  message?: string;
}