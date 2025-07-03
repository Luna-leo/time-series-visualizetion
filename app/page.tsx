'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChartPageHeader } from '../components/ChartPageHeader';
import { FileUpload } from '../components/FileUpload';
import { ChartCreator } from '../components/ChartCreator';
import { ChartGrid } from '../components/ChartGrid';
import { ProgressBar } from '../components/common/ProgressBar';
import { useChartDimensions } from '../hooks/useChartDimensions';
import { useMultiChartSeriesVisibility } from '../hooks/useSeriesVisibility';
import { useCSVData } from '../hooks/useCSVData';
import { useChartMetrics } from '../hooks/useChartMetrics';
import { usePagination } from '../hooks/usePagination';
import { GRID_CONFIGURATIONS } from '../constants/chartTheme';
import type { GridSize } from '../types/chart';

export default function UnifiedChartPage() {
  const [gridSize, setGridSize] = useState<GridSize>('2x2');
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState<number | undefined>(undefined);
  const [showChartCreator, setShowChartCreator] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Load CSV data
  const { 
    csvData, 
    charts, 
    isLoading, 
    error, 
    uploadCSV, 
    createChart,
    clearData 
  } = useCSVData();

  // Custom hooks
  const chartCount = GRID_CONFIGURATIONS[gridSize].rows * GRID_CONFIGURATIONS[gridSize].cols;
  const { visibilityMap } = useMultiChartSeriesVisibility(charts.length || 1); // Dynamic based on loaded charts
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
  } = usePagination({ gridSize, totalItems: charts.length });
  
  const chartSize = useChartDimensions({ 
    gridSize,
    hasProgressBar: isLoading,
    padding: isDenseGrid ? 8 : 16, // p-2 = 8px, p-4 = 16px
    headerHeight: measuredHeaderHeight
  });

  // Get paginated charts
  const paginatedCharts = getPaginatedItems(charts);
  
  const { totalPoints, visiblePoints, performanceMetrics } = useChartMetrics({
    charts: paginatedCharts,
    visibilityMap,
  });

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    await uploadCSV(file);
  }, [uploadCSV]);

  // Handle chart creation
  const handleCreateChart = useCallback((config: any) => {
    createChart(config);
    setShowChartCreator(false);
  }, [createChart]);

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
          csvData={csvData}
          onCreateChart={() => setShowChartCreator(true)}
          onClearData={clearData}
        />
      </div>
      
      
      {!csvData ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-center mb-8">Upload CSV File to Visualize Data</h2>
            <FileUpload onFileSelect={handleFileUpload} disabled={isLoading} />
          </div>
        </div>
      ) : charts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">CSV file loaded successfully!</p>
            <p className="text-sm text-gray-500 mb-6">{csvData.parameters.length} parameters found</p>
            <button
              onClick={() => setShowChartCreator(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Create Chart
            </button>
          </div>
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
      
      {showChartCreator && csvData && (
        <ChartCreator
          parameters={csvData.parameters}
          onCreateChart={handleCreateChart}
          onCancel={() => setShowChartCreator(false)}
        />
      )}
    </div>
  );
}