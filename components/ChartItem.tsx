'use client';

import React from 'react';
import { MultiSeriesTimeSeriesChart } from './MultiSeriesTimeSeriesChart';
import { LazyChart } from './common/LazyChart';
import { LAYOUT_CONSTANTS } from '../constants/layoutConstants';
import type { ChartMetadata, GridSize } from '../types/chart';

interface ChartItemProps {
  chart: ChartMetadata;
  width: number;
  height: number;
  visibleSeries?: boolean[];
  gridSize?: GridSize;
}

export const ChartItem = React.memo<ChartItemProps>(({ chart, width, height, visibleSeries, gridSize }) => {
  const isDenseGrid = gridSize === '1x1' || gridSize === '3x3' || gridSize === '4x4';
  const padding = isDenseGrid ? '' : 'p-1';
  
  return (
    <LazyChart height={height} className={`border rounded ${padding}`}>
      <MultiSeriesTimeSeriesChart
        data={chart.data}
        seriesLabels={chart.labels}
        yLabel="Value"
        width={width}
        height={height}
        visibleSeries={visibleSeries}
      />
    </LazyChart>
  );
});

ChartItem.displayName = 'ChartItem';