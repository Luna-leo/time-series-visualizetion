'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChartPageHeader } from '../components/ChartPageHeader';
import { FileUpload } from '../components/FileUpload';
import { ChartCreator } from '../components/ChartCreator';
import { ChartGrid } from '../components/ChartGrid';
import type { CSVMetadata } from '../components/MetadataInputDialog';
import { StorageSetup } from '../components/StorageSetup';
import { DataQueryPanel } from '../components/DataQueryPanel';
import { useChartDimensions } from '../hooks/useChartDimensions';
import { useMultiChartSeriesVisibility } from '../hooks/useSeriesVisibility';
import { useCSVData } from '../hooks/useCSVData';
import { useChartMetrics } from '../hooks/useChartMetrics';
import { usePagination } from '../hooks/usePagination';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { GRID_CONFIGURATIONS } from '../constants/chartTheme';
import type { GridSize } from '../types/chart';
import type { ChartConfiguration } from '../types/csv';

export default function UnifiedChartPage() {
  const [gridSize, setGridSize] = useState<GridSize>('2x2');
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState<number | undefined>(undefined);
  const [showChartCreator, setShowChartCreator] = useState(false);
  const [showDataQuery, setShowDataQuery] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Local storage management
  const { 
    isInitialized,
    isLoading: isStorageLoading,
    error: storageError,
    fileSystemManager,
    duckdbManager,
    setupStorage,
    resetStorage,
    lastUsedDirectory,
    canReconnect,
    reconnectToLastDirectory
  } = useLocalStorage();

  // Load CSV data with storage managers
  const { 
    csvData, 
    charts, 
    isLoading, 
    error, 
    uploadCSV,
    uploadMultipleCSVs, 
    createChart,
    clearData,
    importHistory,
    uploadProgress 
  } = useCSVData({
    fileSystemManager,
    duckdbManager
  });

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

  // Handle file upload with metadata
  const handleFileUpload = useCallback(async (file: File, metadata: CSVMetadata) => {
    await uploadCSV(file, metadata, metadata.encoding);
  }, [uploadCSV]);

  // Handle multiple files upload
  const handleMultipleFilesUpload = useCallback(async (files: File[], metadata: CSVMetadata) => {
    await uploadMultipleCSVs(files, metadata, metadata.encoding);
  }, [uploadMultipleCSVs]);

  // Handle chart creation
  const handleCreateChart = useCallback((config: ChartConfiguration) => {
    createChart(config);
    setShowChartCreator(false);
  }, [createChart]);

  // Handle chart creation from query
  const handleCreateChartFromQuery = useCallback((chartData: {
    title: string;
    parameters: string[];
    data: Array<Record<string, unknown>>;
  }) => {
    // Transform query data to chart format
    const config = {
      id: `query_${Date.now()}`,
      title: chartData.title,
      parameterIds: chartData.parameters,
      queryData: {
        data: chartData.data,
        parameters: chartData.parameters,
      },
    };
    
    // Create a chart with the queried data
    createChart(config);
    setShowDataQuery(false);
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
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  const containerPadding = isDenseGrid ? 'p-2' : 'p-4';

  // Show storage setup if not initialized
  if (!isInitialized) {
    return (
      <StorageSetup 
        onSetupComplete={setupStorage}
        fileSystemManager={fileSystemManager}
        duckdbManager={duckdbManager}
        lastUsedDirectory={lastUsedDirectory}
        canReconnect={canReconnect}
        onReconnect={reconnectToLastDirectory}
      />
    );
  }

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
          onQueryData={duckdbManager && fileSystemManager ? () => setShowDataQuery(true) : undefined}
        />
      </div>
      
      
      {!csvData && charts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-center mb-8">Get Started with Time Series Visualization</h2>
            
            <div className="space-y-6">
              {/* Upload CSV Section */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Upload CSV Files</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select one or multiple CSV files to import. Files will be automatically merged based on timestamps and parameters.
                </p>
                <FileUpload 
                  onFileSelect={handleFileUpload} 
                  onMultipleFilesSelect={handleMultipleFilesUpload}
                  disabled={isLoading} 
                  multiple={true}
                />
                {uploadProgress && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-600">
                      Processing file {uploadProgress.current} of {uploadProgress.total}: {uploadProgress.fileName}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Query Stored Data Section */}
              {duckdbManager && fileSystemManager && (
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Query Stored Data</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Access previously imported data stored as Parquet files
                  </p>
                  <button
                    onClick={() => setShowDataQuery(true)}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    Open Data Query Panel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : csvData && charts.length === 0 ? (
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
      
      {showDataQuery && duckdbManager && fileSystemManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Query Stored Data</h2>
              <button
                onClick={() => setShowDataQuery(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <DataQueryPanel
                duckdbManager={duckdbManager}
                fileSystemManager={fileSystemManager}
                onCreateChart={handleCreateChartFromQuery}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}