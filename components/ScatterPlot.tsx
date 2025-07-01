'use client';

import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface ScatterPlotProps {
  data: [number[], number[]];
  width?: number;
  height?: number;
}

export default function ScatterPlot({ data, width = 800, height = 600 }: ScatterPlotProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const opts: uPlot.Options = {
      width,
      height,
      title: 'Scatter Plot',
      scales: {
        x: {
          time: false,
        },
      },
      series: [
        {
          label: 'X',
        },
        {
          label: 'Y',
          stroke: 'blue',
          width: 0,
          points: {
            show: true,
            size: 6,
            fill: 'blue',
          },
          paths: () => null,
        },
      ],
    };

    plotRef.current = new uPlot(opts, data, chartRef.current);

    return () => {
      plotRef.current?.destroy();
    };
  }, [data, width, height]);

  return <div ref={chartRef}></div>;
}