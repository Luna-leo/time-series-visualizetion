'use client';

import React from 'react';
import { BaseChart } from './common/BaseChart';
import { ChartWrapper } from './common/ChartWrapper';
import { getDefaultScatterSeries } from '../constants/chartDefaults';
import { CHART_STYLES } from '../constants/chartTheme';
import type { BaseChartProps, SingleSeriesData } from '../types/chart';
import type uPlot from 'uplot';

interface TimeSeriesChartProps extends BaseChartProps {
  data: SingleSeriesData;
  yLabel?: string;
  loading?: boolean;
  error?: Error | string | null;
  pointSize?: number;
  showLine?: boolean;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  width,
  height,
  title,
  yLabel = 'Value',
  loading = false,
  error = null,
  pointSize = CHART_STYLES.points.defaultSize,
  showLine = false,
  className,
}) => {
  // Build uPlot options
  const chartOptions: Partial<uPlot.Options> = React.useMemo(() => {
    const series: uPlot.Series[] = [
      {
        label: 'Time',
      },
      {
        ...getDefaultScatterSeries(yLabel, 0),
        points: {
          show: true,
          size: pointSize,
          fill: CHART_STYLES.axes.stroke,
          stroke: CHART_STYLES.axes.stroke,
          width: CHART_STYLES.points.strokeWidth,
        },
        ...(showLine ? {
          stroke: CHART_STYLES.axes.stroke,
          width: CHART_STYLES.line.defaultWidth,
          paths: undefined,
        } : {
          stroke: 'transparent',
          width: 0,
          paths: () => null,
        }),
      },
    ];

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
        },
        {
          stroke: CHART_STYLES.axes.stroke,
          grid: CHART_STYLES.axes.grid,
          label: yLabel,
        },
      ],
    };
  }, [yLabel, pointSize, showLine]);

  return (
    <ChartWrapper
      title={title}
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