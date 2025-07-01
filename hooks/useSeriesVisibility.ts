import { useState, useCallback, useEffect } from 'react';

interface UseSeriesVisibilityOptions {
  initialVisibility?: boolean[];
  seriesCount: number;
  defaultVisible?: boolean;
}

export const useSeriesVisibility = (options: UseSeriesVisibilityOptions) => {
  const { initialVisibility, seriesCount, defaultVisible = true } = options;

  const [visibleSeries, setVisibleSeries] = useState<boolean[]>(() => {
    if (initialVisibility && initialVisibility.length === seriesCount) {
      return initialVisibility;
    }
    return new Array(seriesCount).fill(defaultVisible);
  });

  // Update visibility array when series count changes
  useEffect(() => {
    setVisibleSeries(prev => {
      if (prev.length === seriesCount) return prev;
      
      // Preserve existing visibility states and add new ones
      const newVisibility = [...prev];
      while (newVisibility.length < seriesCount) {
        newVisibility.push(defaultVisible);
      }
      // Trim if series count decreased
      return newVisibility.slice(0, seriesCount);
    });
  }, [seriesCount, defaultVisible]);

  const toggleSeries = useCallback((index: number) => {
    setVisibleSeries(prev => 
      prev.map((visible, i) => i === index ? !visible : visible)
    );
  }, []);

  const toggleAll = useCallback((visible: boolean) => {
    setVisibleSeries(new Array(seriesCount).fill(visible));
  }, [seriesCount]);

  const setSeriesVisibility = useCallback((index: number, visible: boolean) => {
    setVisibleSeries(prev => 
      prev.map((v, i) => i === index ? visible : v)
    );
  }, []);

  const visibleCount = visibleSeries.filter(v => v).length;

  return {
    visibleSeries,
    toggleSeries,
    toggleAll,
    setSeriesVisibility,
    visibleCount,
  };
};

// Hook for managing visibility across multiple charts
export const useMultiChartSeriesVisibility = (chartCount: number, seriesPerChart: number = 6) => {
  const [visibilityMap, setVisibilityMap] = useState<Record<number, boolean[]>>(() => {
    const map: Record<number, boolean[]> = {};
    for (let i = 0; i < chartCount; i++) {
      map[i] = new Array(seriesPerChart).fill(true);
    }
    return map;
  });

  // Update map when chart count changes
  useEffect(() => {
    setVisibilityMap(prev => {
      const newMap = { ...prev };
      
      // Add new charts if needed
      for (let i = 0; i < chartCount; i++) {
        if (!(i in newMap)) {
          newMap[i] = new Array(seriesPerChart).fill(true);
        }
      }
      
      // Remove extra charts
      Object.keys(newMap).forEach(key => {
        const index = parseInt(key);
        if (index >= chartCount) {
          delete newMap[index];
        }
      });
      
      return newMap;
    });
  }, [chartCount, seriesPerChart]);

  const toggleChartSeries = useCallback((chartId: number, seriesIndex: number) => {
    setVisibilityMap(prev => ({
      ...prev,
      [chartId]: prev[chartId]?.map((v, i) => i === seriesIndex ? !v : v) || [],
    }));
  }, []);

  const toggleAllInChart = useCallback((chartId: number, visible: boolean) => {
    setVisibilityMap(prev => ({
      ...prev,
      [chartId]: new Array(seriesPerChart).fill(visible),
    }));
  }, [seriesPerChart]);

  const toggleAllCharts = useCallback((visible: boolean) => {
    const newMap: Record<number, boolean[]> = {};
    for (let i = 0; i < chartCount; i++) {
      newMap[i] = new Array(seriesPerChart).fill(visible);
    }
    setVisibilityMap(newMap);
  }, [chartCount, seriesPerChart]);

  return {
    visibilityMap,
    toggleChartSeries,
    toggleAllInChart,
    toggleAllCharts,
  };
};