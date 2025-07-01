import { useEffect, useRef, useCallback } from 'react';
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
  const prevDataRef = useRef<uPlot.AlignedData | number[][] | null>(null);
  const prevOptionsRef = useRef<uPlot.Options | null>(null);

  // Create chart instance
  const createChart = useCallback(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const hasValidData = data[0] && data[0].length > 0;
    if (!hasValidData) return;

    try {
      // Destroy existing instance
      if (plotRef.current) {
        plotRef.current.destroy();
      }

      // Create new instance
      plotRef.current = new uPlot(options, data as uPlot.AlignedData, chartRef.current);
      prevDataRef.current = data;
      prevOptionsRef.current = options;
      
      if (onReady && plotRef.current) {
        onReady(plotRef.current);
      }
    } catch (error) {
      console.error('Failed to create chart:', error);
    }
  }, [data, options, onReady]);

  // Update only data (more efficient than recreating)
  const updateData = useCallback(() => {
    if (!plotRef.current || !data) return;
    
    try {
      plotRef.current.setData(data as uPlot.AlignedData);
      prevDataRef.current = data;
    } catch (error) {
      console.error('Failed to update chart data:', error);
    }
  }, [data]);

  // Main effect
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const hasValidData = data[0] && data[0].length > 0;
    if (!hasValidData) return;

    // Check if this is initial mount or if chart needs recreation
    const dataChanged = prevDataRef.current !== data;
    const optionsChanged = JSON.stringify(prevOptionsRef.current) !== JSON.stringify(options);

    if (!plotRef.current || optionsChanged) {
      // Create new chart if no instance exists or options changed
      createChart();
    } else if (dataChanged && plotRef.current) {
      // Update only data if instance exists and only data changed
      updateData();
    }

    // Cleanup function
    return () => {
      try {
        if (plotRef.current) {
          plotRef.current.destroy();
          plotRef.current = null;
          prevDataRef.current = null;
          prevOptionsRef.current = null;
        }
        if (onDestroy) {
          onDestroy();
        }
      } catch (error) {
        console.error('Failed to destroy chart:', error);
      }
    };
  }, [data, options, createChart, updateData, onDestroy]);

  return {
    chartRef,
    plotRef: plotRef.current,
  };
};