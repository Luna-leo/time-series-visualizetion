'use client';

import React from 'react';
import { GridControls } from './common/GridControls';
import type { GridSize, DataDensity } from '../types/chart';
import type { PerformanceMetrics } from '../types/performance';

interface ChartPageHeaderProps {
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
  dataDensity: DataDensity;
  onDensityChange: (density: DataDensity) => void;
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
}

export const ChartPageHeader: React.FC<ChartPageHeaderProps> = ({
  gridSize,
  onGridSizeChange,
  dataDensity,
  onDensityChange,
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
}) => {
  const isSingleChart = gridSize === '1x1';
  const title = isSingleChart ? 'Time Series Visualization' : 'Multi-Chart Load Test';

  return (
    <div className="mb-2">
      <h1 className="text-xl font-bold text-center mb-2">{title}</h1>
      
      <GridControls
        gridSize={gridSize}
        onGridSizeChange={onGridSizeChange}
        dataDensity={dataDensity}
        onDensityChange={onDensityChange}
        disabled={disabled}
        className="mb-2"
      />
      
      <div className="flex justify-between items-center text-sm">
        <div>
          <span className="font-semibold">Total Points:</span> {totalPoints.toLocaleString()} 
          ({visiblePoints.toLocaleString()} visible)
          {!isSingleChart && (
            <> | <span className="font-semibold ml-2">Charts:</span> {chartCount}</>
          )}
          {performanceMetrics && (
            <> | <span className="font-semibold ml-2">Fetch Time:</span> {performanceMetrics.dataFetchTime.toFixed(0)}ms</>
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
    </div>
  );
};