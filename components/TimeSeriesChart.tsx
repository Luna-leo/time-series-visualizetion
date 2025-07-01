'use client';

import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface TimeSeriesChartProps {
  data: [number[], number[]];
  width?: number;
  height?: number;
  title?: string;
  yLabel?: string;
}

export default function TimeSeriesChart({ 
  data, 
  width = 800, 
  height = 600,
  title = 'Time Series Chart',
  yLabel = 'Value'
}: TimeSeriesChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const opts: uPlot.Options = {
      width,
      height,
      title,
      scales: {
        x: {
          time: true,
        },
      },
      series: [
        {
          label: 'Time',
        },
        {
          label: yLabel,
          stroke: 'transparent',
          width: 0,
          points: {
            show: true,
            size: 6,
            fill: 'rgba(59, 130, 246, 0.6)',
            stroke: 'rgba(59, 130, 246, 1)',
            width: 1,
          },
          paths: () => null,
        },
      ],
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
        },
      ],
    };

    plotRef.current = new uPlot(opts, data, chartRef.current);

    return () => {
      plotRef.current?.destroy();
    };
  }, [data, width, height, title, yLabel]);

  return <div ref={chartRef}></div>;
}