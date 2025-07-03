import { useState, useCallback, useMemo } from 'react';
import type { ChartMetadata } from '../types/chart';
import type { PerformanceMetrics } from '../types/performance';

interface UseChartMetricsOptions {
  charts: ChartMetadata[];
  visibilityMap: Record<number, boolean[]>;
}

export function useChartMetrics({ charts, visibilityMap }: UseChartMetricsOptions) {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  // Calculate total points
  const totalPoints = useMemo(() => 
    charts.reduce((sum, chart) => 
      sum + (chart.data[0]?.length || 0) * (chart.data.length - 1), 0
    ), [charts]
  );

  // Calculate visible points
  const visiblePoints = useMemo(() => 
    charts.reduce((sum, chart) => 
      sum + (chart.data[0]?.length || 0) * (visibilityMap[chart.id]?.filter(v => v).length || 0), 0
    ), [charts, visibilityMap]
  );

  // Track loading performance
  const trackLoadingPerformance = useCallback((startTime: number, chartCount: number) => {
    const endTime = performance.now();
    const fetchTime = endTime - startTime;
    
    const totalDataPoints = charts.reduce((sum, chart) => 
      sum + (chart.data[0]?.length || 0) * (chart.data.length - 1), 0
    );
    
    setPerformanceMetrics({
      dataFetchTime: fetchTime,
      renderStartTime: endTime - startTime,
      totalCharts: chartCount,
      totalDataPoints,
    });
  }, [charts]);

  return {
    totalPoints,
    visiblePoints,
    performanceMetrics,
    trackLoadingPerformance,
  };
}