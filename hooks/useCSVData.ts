import { useState, useCallback } from 'react';
import { CSVParser } from '../utils/csvParser';
import type { ParsedCSVData, ChartConfiguration } from '../types/csv';
import type { ChartMetadata } from '../types/chart';

interface UseCSVDataReturn {
  csvData: ParsedCSVData | null;
  isLoading: boolean;
  error: string | null;
  uploadCSV: (file: File) => Promise<void>;
  createChart: (config: ChartConfiguration) => void;
  updateChart: (chartId: string, config: Partial<ChartConfiguration>) => void;
  deleteChart: (chartId: string) => void;
  charts: ChartMetadata[];
  clearData: () => void;
}

export function useCSVData(): UseCSVDataReturn {
  const [csvData, setCSVData] = useState<ParsedCSVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartConfigs, setChartConfigs] = useState<ChartConfiguration[]>([]);
  const [charts, setCharts] = useState<ChartMetadata[]>([]);

  const parser = new CSVParser();

  const uploadCSV = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsed = await parser.parseFile(file);
      setCSVData(parsed);
      
      // Show any parsing warnings
      if (parsed.errors && parsed.errors.length > 0) {
        console.warn('CSV parsing warnings:', parsed.errors);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createChart = useCallback((config: ChartConfiguration) => {
    if (!csvData) return;

    const newChart: ChartMetadata = {
      id: Date.now(), // Simple ID generation
      data: CSVParser.toChartData(csvData, config.parameterIds),
      labels: CSVParser.getParameterLabels(csvData, config.parameterIds),
      title: config.title || 'Chart',
    };

    setChartConfigs(prev => [...prev, config]);
    setCharts(prev => [...prev, newChart]);
  }, [csvData]);

  const updateChart = useCallback((chartId: string, updates: Partial<ChartConfiguration>) => {
    if (!csvData) return;

    setChartConfigs(prev => prev.map(config => 
      config.id === chartId ? { ...config, ...updates } : config
    ));

    // Update the chart data if parameters changed
    if (updates.parameterIds) {
      setCharts(prev => prev.map(chart => {
        if (chart.id.toString() === chartId) {
          return {
            ...chart,
            data: CSVParser.toChartData(csvData, updates.parameterIds!),
            labels: CSVParser.getParameterLabels(csvData, updates.parameterIds!),
            title: updates.title || chart.title,
          };
        }
        return chart;
      }));
    }
  }, [csvData]);

  const deleteChart = useCallback((chartId: string) => {
    setChartConfigs(prev => prev.filter(config => config.id !== chartId));
    setCharts(prev => prev.filter(chart => chart.id.toString() !== chartId));
  }, []);

  const clearData = useCallback(() => {
    setCSVData(null);
    setChartConfigs([]);
    setCharts([]);
    setError(null);
  }, []);

  return {
    csvData,
    isLoading,
    error,
    uploadCSV,
    createChart,
    updateChart,
    deleteChart,
    charts,
    clearData,
  };
}