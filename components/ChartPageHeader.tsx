'use client';

import React from 'react';
import { GridControls } from './common/GridControls';
import type { GridSize } from '../types/chart';
import type { PerformanceMetrics } from '../types/performance';
import type { ParsedCSVData } from '../types/csv';

interface ChartPageHeaderProps {
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
  disabled: boolean;
  totalPoints: number;
  visiblePoints: number;
  chartCount: number;
  performanceMetrics: PerformanceMetrics | null;
  // Pagination props
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  // CSV props
  csvData: ParsedCSVData | null;
  onCreateChart: () => void;
  onClearData: () => void;
  onQueryData?: () => void;
}

export const ChartPageHeader: React.FC<ChartPageHeaderProps> = ({
  gridSize,
  onGridSizeChange,
  disabled,
  totalPoints,
  visiblePoints,
  chartCount,
  performanceMetrics,
  currentPage,
  totalPages,
  onPageChange,
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
  csvData,
  onCreateChart,
  onClearData,
  onQueryData,
}) => {
  const isSingleChart = gridSize === '1x1';
  const title = csvData ? 'CSV Data Visualization' : 'Time Series Visualization';

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex gap-2">
          {csvData && (
            <>
              <button
                onClick={onCreateChart}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create Chart
              </button>
              <button
                onClick={onClearData}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear Data
              </button>
            </>
          )}
          {onQueryData && (
            <button
              onClick={onQueryData}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              Query Data
            </button>
          )}
        </div>
      </div>
      
      {csvData && chartCount > 0 && (
        <GridControls
          gridSize={gridSize}
          onGridSizeChange={onGridSizeChange}
          disabled={disabled}
          className="mb-2"
        />
      )}
      
      {csvData && chartCount > 0 && (
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="font-semibold">File:</span> {csvData.fileName}
            <span className="ml-4 font-semibold">Parameters:</span> {csvData.parameters.length}
            {chartCount > 0 && (
              <>
                <span className="ml-4 font-semibold">Points:</span> {totalPoints.toLocaleString()} 
                ({visiblePoints.toLocaleString()} visible)
                {!isSingleChart && (
                  <> | <span className="font-semibold ml-2">Charts:</span> {chartCount}</>
                )}
              </>
            )}
          </div>
          
          {/* Pagination controls - only show if more than 1 page */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevPage}
                disabled={!hasPrevPage || disabled}
                className={`px-2 py-1 text-xs rounded ${
                  hasPrevPage && !disabled
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ←
              </button>
              
              <div className="flex items-center gap-1 text-xs">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value, 10);
                    if (!isNaN(page) && page >= 1 && page <= totalPages) {
                      onPageChange(page);
                    }
                  }}
                  disabled={disabled}
                  className="w-10 px-1 py-0.5 text-center border rounded text-xs"
                />
                <span>of {totalPages}</span>
              </div>
              
              <button
                onClick={onNextPage}
                disabled={!hasNextPage || disabled}
                className={`px-2 py-1 text-xs rounded ${
                  hasNextPage && !disabled
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};