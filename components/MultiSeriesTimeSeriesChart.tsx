'use client';

import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface MultiSeriesTimeSeriesChartProps {
  data: number[][];
  seriesLabels: string[];
  width?: number;
  height?: number;
  title?: string;
  yLabel?: string;
  visibleSeries?: boolean[];
}

const SERIES_COLORS = [
  { fill: 'rgba(59, 130, 246, 0.6)', stroke: 'rgba(59, 130, 246, 1)' },    // Blue
  { fill: 'rgba(239, 68, 68, 0.6)', stroke: 'rgba(239, 68, 68, 1)' },      // Red
  { fill: 'rgba(34, 197, 94, 0.6)', stroke: 'rgba(34, 197, 94, 1)' },      // Green
  { fill: 'rgba(251, 146, 60, 0.6)', stroke: 'rgba(251, 146, 60, 1)' },    // Orange
  { fill: 'rgba(168, 85, 247, 0.6)', stroke: 'rgba(168, 85, 247, 1)' },    // Purple
  { fill: 'rgba(236, 72, 153, 0.6)', stroke: 'rgba(236, 72, 153, 1)' }     // Pink
];

export default function MultiSeriesTimeSeriesChart({ 
  data, 
  seriesLabels,
  width = 800, 
  height = 600,
  title = 'Multi-Series Time Series Chart',
  yLabel = 'Value',
  visibleSeries
}: MultiSeriesTimeSeriesChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const series: uPlot.Series[] = [
      {
        label: 'Time',
      }
    ];

    // Add series configuration for each data series
    for (let i = 1; i < data.length; i++) {
      const colorIndex = (i - 1) % SERIES_COLORS.length;
      const isVisible = visibleSeries ? visibleSeries[i - 1] : true;
      
      series.push({
        label: seriesLabels[i - 1] || `Series ${i}`,
        stroke: 'transparent',
        width: 0,
        points: {
          show: isVisible,
          size: 4,
          fill: SERIES_COLORS[colorIndex].fill,
          stroke: SERIES_COLORS[colorIndex].stroke,
          width: 1,
        },
        paths: () => null,
        show: isVisible,
      });
    }

    const opts: uPlot.Options = {
      width,
      height,
      title,
      scales: {
        x: {
          time: true,
        },
      },
      series,
      axes: [
        {
          stroke: '#ccc',
          grid: {
            stroke: '#eee',
            width: 1,
          },
        },
        {
          stroke: '#ccc',
          grid: {
            stroke: '#eee',
            width: 1,
          },
          label: yLabel,
        },
      ],
      legend: {
        show: true,
        live: false,
      },
    };

    plotRef.current = new uPlot(opts, data, chartRef.current);

    return () => {
      plotRef.current?.destroy();
    };
  }, [data, seriesLabels, width, height, title, yLabel, visibleSeries]);

  return <div ref={chartRef}></div>;
}