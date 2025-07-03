'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChartPageHeader } from '../components/ChartPageHeader';
import { ChartGrid } from '../components/ChartGrid';
import { ProgressBar } from '../components/common/ProgressBar';
import { useChartDimensions } from '../hooks/useChartDimensions';
import { useMultiChartSeriesVisibility } from '../hooks/useSeriesVisibility';
import { useChartData } from '../hooks/useChartData';
import { useChartMetrics } from '../hooks/useChartMetrics';
import { usePagination } from '../hooks/usePagination';
import { GRID_CONFIGURATIONS, TOTAL_CHARTS } from '../constants/chartTheme';
import type { GridSize, DataDensity } from '../types/chart';

export default function UnifiedChartPage() {
  const [gridSize, setGridSize] = useState<GridSize>('1x1');
  const [dataDensity, setDataDensity] = useState<DataDensity>('medium');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStartTime, setLoadStartTime] = useState(0);
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState<number | undefined>(undefined);
  const headerRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const chartCount = GRID_CONFIGURATIONS[gridSize].rows * GRID_CONFIGURATIONS[gridSize].cols;
  const { visibilityMap } = useMultiChartSeriesVisibility(TOTAL_CHARTS); // Always track all charts
  const isDenseGrid = gridSize === '1x1' || gridSize === '3x3' || gridSize === '4x4';
  
  // Pagination
  const {
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    getPaginatedItems,
  } = usePagination({ gridSize });
  
  const { charts, isLoading, isInitializing, error, loadCharts } = useChartData({
    initialGridSize: gridSize,
    initialDensity: dataDensity,
    onProgress: setLoadProgress,
  });
  
  const chartSize = useChartDimensions({ 
    gridSize,
    hasProgressBar: isLoading,
    padding: isDenseGrid ? 8 : 16, // p-2 = 8px, p-4 = 16px
    headerHeight: measuredHeaderHeight
  });

  // Get paginated charts
  const paginatedCharts = getPaginatedItems(charts);
  
  const { totalPoints, visiblePoints, performanceMetrics, trackLoadingPerformance } = useChartMetrics({
    charts: paginatedCharts,
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

  // Measure header height dynamically
  useEffect(() => {
    const measureHeader = () => {
      if (headerRef.current) {
        const headerElement = headerRef.current;
        const rect = headerElement.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(headerElement);
        const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
        const totalHeight = rect.height + marginBottom;
        setMeasuredHeaderHeight(totalHeight);
      }
    };

    measureHeader();
    // Re-measure on resize
    window.addEventListener('resize', measureHeader);
    
    // Also measure after a short delay to catch any async rendering
    const timeoutId = setTimeout(measureHeader, 100);

    return () => {
      window.removeEventListener('resize', measureHeader);
      clearTimeout(timeoutId);
    };
  }, [gridSize, totalPages]); // Re-measure when grid size or pagination changes

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
      <div ref={headerRef}>
        <ChartPageHeader
          gridSize={gridSize}
          onGridSizeChange={handleGridSizeChange}
          dataDensity={dataDensity}
          onDensityChange={handleDensityChange}
          disabled={isLoading}
          totalPoints={totalPoints}
          visiblePoints={visiblePoints}
          chartCount={charts.length}
          performanceMetrics={performanceMetrics}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
        />
      </div>
      
      {isLoading && (
        <div className="mb-2">
          <ProgressBar 
            progress={loadProgress}
            message="Loading 32 charts..."
          />
        </div>
      )}
      
      {!isLoading && charts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-gray-600">Select a grid size to load charts</div>
        </div>
      ) : (
        <ChartGrid
          charts={paginatedCharts}
          gridSize={gridSize}
          chartWidth={chartSize.width}
          chartHeight={chartSize.height}
          visibilityMap={visibilityMap}
        />
      )}
    </div>
  );
}