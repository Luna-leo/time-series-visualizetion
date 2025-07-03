import { useState, useCallback, useEffect } from 'react';
import DataStore, { SENSOR_TYPES, FETCH_CONFIG } from '../lib/dataStore';
import { GRID_CONFIGURATIONS } from '../constants/chartTheme';
import type { GridSize, DataDensity, ChartMetadata } from '../types/chart';

// Simple data generation for 1x1 grid
function generateSimpleChartData(): number[][] {
  const dataPoints = 10800; // 3 hours at 1 second intervals
  const now = Math.floor(Date.now() / 1000);
  
  const timestamps: number[] = new Array(dataPoints);
  const series: number[][] = [timestamps];
  
  // Generate 6 series
  for (let s = 0; s < 6; s++) {
    series.push(new Array(dataPoints));
  }
  
  let seed = 42;
  const seededRandom = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  
  for (let i = 0; i < dataPoints; i++) {
    timestamps[i] = now - (dataPoints - 1 - i);
    const hourOfDay = (i / 3600) % 24;
    
    // Generate different patterns for each series
    series[1][i] = 20 + 10 * Math.sin((hourOfDay - 6) * Math.PI / 12) + (seededRandom() - 0.5) * 2;
    series[2][i] = 25 + 15 * Math.sin((hourOfDay - 8) * Math.PI / 12) + (seededRandom() - 0.5) * 3;
    series[3][i] = 15 + 8 * Math.cos((hourOfDay - 4) * Math.PI / 12) + (seededRandom() - 0.5) * 2.5;
    series[4][i] = 22 + 5 * Math.sin(hourOfDay * Math.PI / 3) + (seededRandom() - 0.5) * 4;
    series[5][i] = 18 + i * 0.001 + 6 * Math.sin((hourOfDay - 10) * Math.PI / 12) + (seededRandom() - 0.5) * 3;
    series[6][i] = 30 - 12 * Math.sin((hourOfDay - 6) * Math.PI / 12) + (seededRandom() - 0.5) * 2;
  }
  
  return series;
}

interface UseChartDataOptions {
  initialGridSize: GridSize;
  initialDensity: DataDensity;
  onProgress?: (progress: number) => void;
}

export function useChartData({ initialGridSize, initialDensity, onProgress }: UseChartDataOptions) {
  const [charts, setCharts] = useState<ChartMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const dataStore = DataStore.getInstance();

  // Initialize data store for multi-chart mode
  useEffect(() => {
    const initializeDataStore = async () => {
      // Skip initialization for 1x1 grid
      if (initialGridSize === '1x1') {
        setIsInitializing(false);
        return;
      }

      try {
        await dataStore.initialize();
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize data store:', error);
        setError(error as Error);
        setIsInitializing(false);
      }
    };
    
    initializeDataStore();
  }, []);

  const loadCharts = useCallback(async (size: GridSize, density: DataDensity) => {
    setIsLoading(true);
    setError(null);
    onProgress?.(0);
    
    const count = GRID_CONFIGURATIONS[size].rows * GRID_CONFIGURATIONS[size].cols;
    
    try {
      // Use simple data generation for 1x1 grid
      if (size === '1x1') {
        const data = generateSimpleChartData();
        const labels = ['Sensor 1', 'Sensor 2', 'Sensor 3', 'Sensor 4', 'Sensor 5', 'Sensor 6'];
        
        setCharts([{
          id: 0,
          data,
          labels,
          title: 'Temperature Sensors',
          sensorType: 'Temperature',
        }]);
        
        onProgress?.(100);
        setIsLoading(false);
        return;
      }

      // Use DataStore for multi-chart mode
      if (!dataStore.isInitialized()) {
        throw new Error('DataStore not initialized');
      }

      const newCharts: ChartMetadata[] = [];
      const batches = Math.ceil(count / FETCH_CONFIG.batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const start = batch * FETCH_CONFIG.batchSize;
        const end = Math.min(start + FETCH_CONFIG.batchSize, count);
        const batchRequests = [];
        
        for (let i = start; i < end; i++) {
          const sensorType = SENSOR_TYPES[i % SENSOR_TYPES.length];
          batchRequests.push({
            sensorName: sensorType.name,
            density
          });
        }
        
        const batchData = await dataStore.fetchMultipleSensors(batchRequests, 'remote');
        
        batchData.forEach((data, index) => {
          const chartIdx = start + index;
          const sensorType = SENSOR_TYPES[chartIdx % SENSOR_TYPES.length];
          const labels = Array.from({ length: 6 }, (_, i) => `${sensorType.name} ${i + 1}`);
          
          newCharts.push({
            id: chartIdx,
            data,
            labels,
            title: `${sensorType.name} (${sensorType.unit})`,
            sensorType: sensorType.name,
          });
        });
        
        onProgress?.(((batch + 1) / batches) * 100);
        
        if (batch === batches - 1 || newCharts.length % 16 === 0) {
          setCharts([...newCharts]);
        }
        
        await new Promise(resolve => {
          if ('requestIdleCallback' in window && window.requestIdleCallback) {
            window.requestIdleCallback(() => resolve(undefined), { timeout: 50 });
          } else {
            requestAnimationFrame(() => resolve(undefined));
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to load charts:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
      onProgress?.(100);
    }
  }, [dataStore, onProgress]);

  return {
    charts,
    isLoading,
    isInitializing,
    error,
    loadCharts,
  };
}