'use client';

import React from 'react';
import { MultiSeriesTimeSeriesChart } from './MultiSeriesTimeSeriesChart';
import { LazyChart } from './common/LazyChart';
import { LAYOUT_CONSTANTS } from '../constants/layoutConstants';
import type { ChartMetadata } from '../types/chart';

interface ChartItemProps {
  chart: ChartMetadata;
  width: number;
  height: number;
  visibleSeries?: boolean[];
}

export const ChartItem = React.memo<ChartItemProps>(({ chart, width, height, visibleSeries }) => {
  return (
    <LazyChart height={height} className="border rounded p-1">
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