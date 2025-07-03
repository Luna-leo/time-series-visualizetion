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
      
      <div className="text-center text-sm">
        <span className="font-semibold">Total Points:</span> {totalPoints.toLocaleString()} 
        ({visiblePoints.toLocaleString()} visible)
        {!isSingleChart && (
          <> | <span className="font-semibold ml-2">Charts:</span> {chartCount}</>
        )}
        {performanceMetrics && (
          <> | <span className="font-semibold ml-2">Fetch Time:</span> {performanceMetrics.dataFetchTime.toFixed(0)}ms</>
        )}
      </div>
    </div>
  );
};