'use client';

import React from 'react';
import { BaseChart } from './common/BaseChart';
import { ChartWrapper } from './common/ChartWrapper';
import { getDefaultScatterSeries, getColorByIndex } from '../constants/chartDefaults';
import { CHART_STYLES } from '../constants/chartTheme';
import type { BaseChartProps, MultiSeriesData } from '../types/chart';
import type uPlot from 'uplot';

interface MultiSeriesTimeSeriesChartProps extends BaseChartProps {
  data: MultiSeriesData;
  seriesLabels: string[];
  yLabel?: string;
  visibleSeries?: boolean[];
  loading?: boolean;
  error?: Error | string | null;
  pointSize?: number;
  showLines?: boolean;
}

const MultiSeriesTimeSeriesChartComponent: React.FC<MultiSeriesTimeSeriesChartProps> = ({
  data,
  seriesLabels,
  width,
  height,
  yLabel = '',
  visibleSeries,
  loading = false,
  error = null,
  pointSize = CHART_STYLES.points.smallSize,
  showLines = false,
  className,
}) => {
  // Build uPlot options
  const chartOptions: Partial<uPlot.Options> = React.useMemo(() => {
    const series: uPlot.Series[] = [
      {
        label: 'Time',
      },
    ];

    // Add series configuration for each data series
    for (let i = 1; i < data.length; i++) {
      const colorIndex = (i - 1) % 6;
      const isVisible = visibleSeries ? visibleSeries[i - 1] : true;
      const colors = getColorByIndex(colorIndex);
      
      series.push({
        label: seriesLabels[i - 1] || `Series ${i}`,
        show: isVisible,
        ...(showLines ? {
          stroke: colors.stroke,
          width: CHART_STYLES.line.defaultWidth,
          points: {
            show: true,
            size: pointSize,
            fill: colors.fill,
            stroke: colors.stroke,
            width: CHART_STYLES.points.strokeWidth,
          },
        } : {
          ...getDefaultScatterSeries(seriesLabels[i - 1] || `Series ${i}`, colorIndex),
          points: {
            show: isVisible,
            size: pointSize,
            fill: colors.fill,
            stroke: colors.stroke,
            width: CHART_STYLES.points.strokeWidth,
          },
        }),
      });
    }

    return {
      series,
      scales: {
        x: {
          time: true,
        },
      },
      axes: [
        {
          stroke: CHART_STYLES.axes.stroke,
          grid: CHART_STYLES.axes.grid,
          label: 'Time',
          labelSize: 20,
          labelGap: 5,
          font: '12px Arial',
          labelFont: '14px Arial',
        },
        {
          stroke: CHART_STYLES.axes.stroke,
          grid: CHART_STYLES.axes.grid,
          label: yLabel || 'Value',
          labelSize: 20,
          labelGap: 5,
          font: '12px Arial',
          labelFont: '14px Arial',
        },
      ],
      legend: {
        show: false, // Disable legend
        live: false,
      },
      cursor: {
        show: false, // Disable tooltips
      },
    };
  }, [data.length, seriesLabels, yLabel, visibleSeries, pointSize, showLines, width]);

  return (
    <ChartWrapper
      loading={loading}
      error={error}
      className={className}
    >
      <BaseChart
        data={data}
        options={chartOptions}
        width={width}
        height={height}
      />
    </ChartWrapper>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const MultiSeriesTimeSeriesChart = React.memo(MultiSeriesTimeSeriesChartComponent, (prevProps, nextProps) => {
  // Custom comparison to check if props have changed
  return (
    prevProps.data === nextProps.data &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.yLabel === nextProps.yLabel &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    prevProps.pointSize === nextProps.pointSize &&
    prevProps.showLines === nextProps.showLines &&
    prevProps.className === nextProps.className &&
    JSON.stringify(prevProps.seriesLabels) === JSON.stringify(nextProps.seriesLabels) &&
    JSON.stringify(prevProps.visibleSeries) === JSON.stringify(nextProps.visibleSeries)
  );
});