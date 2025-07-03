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
  // Account for title height when chart has a title
  const chartHeight = chart.title ? height - LAYOUT_CONSTANTS.chart.titleHeight : height;
  
  return (
    <LazyChart height={height} className="border rounded p-1">
      <MultiSeriesTimeSeriesChart
        data={chart.data}
        seriesLabels={chart.labels}
        title={chart.title}
        yLabel=""
        width={width}
        height={chartHeight}
        visibleSeries={visibleSeries}
      />
    </LazyChart>
  );
});

ChartItem.displayName = 'ChartItem';