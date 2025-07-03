import { useState, useCallback } from 'react';
import type { GridSize, ChartMetadata } from '../types/chart';

interface UseChartDataOptions {
  initialGridSize: GridSize;
  onProgress?: (progress: number) => void;
}

export function useChartData({ initialGridSize, onProgress }: UseChartDataOptions) {
  const [charts, setCharts] = useState<ChartMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Placeholder for CSV data loading
  const loadCharts = useCallback(async (size: GridSize) => {
    setIsLoading(true);
    setError(null);
    onProgress?.(0);
    
    try {
      // TODO: Implement CSV data loading
      // For now, return empty array
      setCharts([]);
      onProgress?.(100);
    } catch (error) {
      console.error('Failed to load charts:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [onProgress]);

  return {
    charts,
    isLoading,
    isInitializing: false,
    error,
    loadCharts,
  };
}