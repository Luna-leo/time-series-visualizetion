'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChartPageHeader } from '../components/ChartPageHeader';
import { ChartGrid } from '../components/ChartGrid';
import { ProgressBar } from '../components/common/ProgressBar';
import { useChartDimensions } from '../hooks/useChartDimensions';
import { useMultiChartSeriesVisibility } from '../hooks/useSeriesVisibility';
import { useChartData } from '../hooks/useChartData';
import { useChartMetrics } from '../hooks/useChartMetrics';
import { GRID_CONFIGURATIONS } from '../constants/chartTheme';
import type { GridSize, DataDensity } from '../types/chart';

export default function UnifiedChartPage() {
  const [gridSize, setGridSize] = useState<GridSize>('1x1');
  const [dataDensity, setDataDensity] = useState<DataDensity>('medium');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStartTime, setLoadStartTime] = useState(0);

  // Custom hooks
  const chartCount = GRID_CONFIGURATIONS[gridSize].rows * GRID_CONFIGURATIONS[gridSize].cols;
  const { visibilityMap } = useMultiChartSeriesVisibility(chartCount);
  const isDenseGrid = gridSize === '1x1' || gridSize === '3x3' || gridSize === '4x4';
  
  const { charts, isLoading, isInitializing, error, loadCharts } = useChartData({
    initialGridSize: gridSize,
    initialDensity: dataDensity,
    onProgress: setLoadProgress,
  });
  
  const chartSize = useChartDimensions({ 
    gridSize,
    hasProgressBar: isLoading && gridSize !== '1x1',
    padding: isDenseGrid ? 8 : 16 // p-2 = 8px, p-4 = 16px
  });

  const { totalPoints, visiblePoints, performanceMetrics, trackLoadingPerformance } = useChartMetrics({
    charts,
    visibilityMap,
  });

  // Load charts on mount and when grid size or density changes
  useEffect(() => {
    if (!isInitializing) {
      const startTime = performance.now();
      setLoadStartTime(startTime);
      loadCharts(gridSize, dataDensity).then(() => {
        trackLoadingPerformance(startTime, chartCount);
      });
    }
  }, [gridSize, dataDensity, isInitializing]);

  // Handle control changes
  const handleGridSizeChange = useCallback((newSize: GridSize) => {
    setGridSize(newSize);
  }, []);

  const handleDensityChange = useCallback((newDensity: DataDensity) => {
    setDataDensity(newDensity);
  }, []);

  // Render loading state
  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Initializing Data Store...</div>
          <div className="text-sm text-gray-600">Simulating database setup</div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4 text-red-600">Error Loading Data</div>
          <div className="text-sm text-gray-600">{error.message}</div>
        </div>
      </div>
    );
  }

  const containerPadding = isDenseGrid ? 'p-2' : 'p-4';

  return (
    <div className={`h-screen ${containerPadding} flex flex-col overflow-hidden`}>
      <ChartPageHeader
        gridSize={gridSize}
        onGridSizeChange={handleGridSizeChange}
        dataDensity={dataDensity}
        onDensityChange={handleDensityChange}
        disabled={isLoading}
        totalPoints={totalPoints}
        visiblePoints={visiblePoints}
        chartCount={chartCount}
        performanceMetrics={performanceMetrics}
      />
      
      {isLoading && gridSize !== '1x1' && (
        <div className="mb-2">
          <ProgressBar 
            progress={loadProgress}
            message="Loading charts..."
          />
        </div>
      )}
      
      {!isLoading && charts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-gray-600">Select a grid size to load charts</div>
        </div>
      ) : (
        <ChartGrid
          charts={charts}
          gridSize={gridSize}
          chartWidth={chartSize.width}
          chartHeight={chartSize.height}
          visibilityMap={visibilityMap}
        />
      )}
    </div>
  );
}