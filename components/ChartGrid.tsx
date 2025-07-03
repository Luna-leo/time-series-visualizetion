'use client';

import React from 'react';
import { ChartItem } from './ChartItem';
import { GRID_CONFIGURATIONS } from '../constants/chartTheme';
import type { GridSize, ChartMetadata } from '../types/chart';

interface ChartGridProps {
  charts: ChartMetadata[];
  gridSize: GridSize;
  chartWidth: number;
  chartHeight: number;
  visibilityMap: Record<number, boolean[]>;
}

export const ChartGrid: React.FC<ChartGridProps> = ({
  charts,
  gridSize,
  chartWidth,
  chartHeight,
  visibilityMap,
}) => {
  const isSingleChart = gridSize === '1x1';
  const gridConfig = GRID_CONFIGURATIONS[gridSize];

  return (
    <div 
      className={`flex-1 ${isSingleChart ? 'flex items-center justify-center' : 'grid gap-2'} overflow-hidden`}
      style={!isSingleChart ? {
        gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
        gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
      } : {}}
    >
      {charts.map(chart => (
        <ChartItem
          key={chart.id}
          chart={chart}
          width={chartWidth}
          height={chartHeight}
          visibleSeries={visibilityMap[chart.id]}
        />
      ))}
    </div>
  );
};