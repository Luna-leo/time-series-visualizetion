import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface UseChartSetupOptions {
  data: uPlot.AlignedData | number[][];
  options: uPlot.Options;
  onReady?: (chart: uPlot) => void;
  onDestroy?: () => void;
}

export const useChartSetup = ({
  data,
  options,
  onReady,
  onDestroy,
}: UseChartSetupOptions) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Check if data has valid content
    const hasValidData = data[0] && data[0].length > 0;
    if (!hasValidData) return;

    try {
      // Create new uPlot instance
      plotRef.current = new uPlot(options, data as uPlot.AlignedData, chartRef.current);
      
      // Call onReady callback if provided
      if (onReady && plotRef.current) {
        onReady(plotRef.current);
      }
    } catch (error) {
      console.error('Failed to create chart:', error);
    }

    // Cleanup function
    return () => {
      try {
        if (plotRef.current) {
          plotRef.current.destroy();
          plotRef.current = null;
        }
        if (onDestroy) {
          onDestroy();
        }
      } catch (error) {
        console.error('Failed to destroy chart:', error);
      }
    };
  }, [data, options, onReady, onDestroy]);

  return {
    chartRef,
    plotRef: plotRef.current,
  };
};