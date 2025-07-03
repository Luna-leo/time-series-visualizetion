'use client';

import React from 'react';
import { useChartSetup } from '../../hooks/useChartSetup';
import { getDefaultChartOptions } from '../../constants/chartDefaults';
import type { BaseChartProps } from '../../types/chart';
import type uPlot from 'uplot';

interface BaseChartComponentProps extends BaseChartProps {
  data: uPlot.AlignedData | number[][];
  options?: Partial<uPlot.Options>;
  onReady?: (chart: uPlot) => void;
  onDestroy?: () => void;
}

export const BaseChart: React.FC<BaseChartComponentProps> = ({
  data,
  options = {},
  width,
  height,
  title,
  className = '',
  onReady,
  onDestroy,
}) => {
  // Merge default options with provided options
  const chartOptions: uPlot.Options = React.useMemo(() => {
    const defaults = getDefaultChartOptions({ timeAxis: true });
    return {
      ...defaults,
      ...options,
      width: width || defaults.width,
      height: height || defaults.height,
      series: options.series || [{}], // Ensure series is always an array
    } as uPlot.Options;
  }, [options, width, height]);

  const { chartRef } = useChartSetup({
    data,
    options: chartOptions,
    onReady,
    onDestroy,
  });

  return (
    <div className={`chart-container ${className}`}>
      <div ref={chartRef} />
    </div>
  );
};