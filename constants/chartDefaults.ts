import { CHART_STYLES, CHART_DIMENSIONS } from './chartTheme';
import type { ChartOptions } from '../types/chart';

// Default uPlot options builder
export const getDefaultChartOptions = (overrides?: Partial<ChartOptions>) => ({
  width: CHART_DIMENSIONS.default.width,
  height: CHART_DIMENSIONS.default.height,
  scales: {
    x: {
      time: overrides?.timeAxis !== false,
    },
  },
  axes: [
    {
      stroke: CHART_STYLES.axes.stroke,
      grid: CHART_STYLES.axes.grid,
      label: 'Time',
      labelSize: 20,
      labelGap: 5,
    },
    {
      stroke: CHART_STYLES.axes.stroke,
      grid: CHART_STYLES.axes.grid,
      label: overrides?.yLabel || 'Value',
      labelSize: 20,
      labelGap: 5,
    },
  ],
  legend: {
    show: overrides?.showLegend ?? false,
    live: false,
  },
  cursor: {
    show: false, // Disable tooltips by default
  },
  ...overrides,
});

// Default series configuration for scatter plots
export const getDefaultScatterSeries = (label: string, colorIndex: number = 0) => ({
  label,
  stroke: 'transparent',
  width: 0,
  points: {
    show: true,
    size: CHART_STYLES.points.defaultSize,
    ...getColorByIndex(colorIndex),
    width: CHART_STYLES.points.strokeWidth,
  },
  paths: () => null,
});

// Default series configuration for line charts
export const getDefaultLineSeries = (label: string, colorIndex: number = 0) => ({
  label,
  ...getColorByIndex(colorIndex),
  width: CHART_STYLES.line.defaultWidth,
  points: {
    show: false,
  },
});

// Helper to get color by index
import { CHART_COLORS } from './chartTheme';

export const getColorByIndex = (index: number) => {
  const colorSet = CHART_COLORS[index % CHART_COLORS.length];
  return {
    fill: colorSet.fill,
    stroke: colorSet.stroke,
  };
};