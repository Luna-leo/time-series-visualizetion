'use client';

import { useState, useEffect, useMemo } from 'react';
import MultiSeriesTimeSeriesChart from '../../components/MultiSeriesTimeSeriesChart';

type GridSize = '1x1' | '2x2' | '3x3' | '4x4';
type DataDensity = 'full' | 'medium' | 'low';

interface ChartData {
  id: number;
  data: number[][];
  labels: string[];
  title: string;
}

const SENSOR_TYPES = [
  { name: 'Temperature', unit: '°C', baseValue: 25, amplitude: 10 },
  { name: 'Pressure', unit: 'kPa', baseValue: 101, amplitude: 5 },
  { name: 'Humidity', unit: '%', baseValue: 60, amplitude: 20 },
  { name: 'Vibration', unit: 'mm/s', baseValue: 5, amplitude: 3 },
  { name: 'Current', unit: 'A', baseValue: 10, amplitude: 2 },
  { name: 'Voltage', unit: 'V', baseValue: 220, amplitude: 10 },
  { name: 'RPM', unit: 'rpm', baseValue: 3000, amplitude: 500 },
  { name: 'Flow Rate', unit: 'L/min', baseValue: 50, amplitude: 10 },
  { name: 'Acceleration', unit: 'm/s²', baseValue: 0, amplitude: 5 },
  { name: 'Displacement', unit: 'mm', baseValue: 0, amplitude: 2 },
  { name: 'Torque', unit: 'Nm', baseValue: 100, amplitude: 20 },
  { name: 'Light', unit: 'lux', baseValue: 500, amplitude: 200 },
  { name: 'CO2', unit: 'ppm', baseValue: 400, amplitude: 100 },
  { name: 'Sound', unit: 'dB', baseValue: 60, amplitude: 20 },
  { name: 'Wind Speed', unit: 'm/s', baseValue: 5, amplitude: 3 },
  { name: 'pH', unit: '', baseValue: 7, amplitude: 1 },
];

const GRID_DIMENSIONS = {
  '1x1': { rows: 1, cols: 1 },
  '2x2': { rows: 2, cols: 2 },
  '3x3': { rows: 3, cols: 3 },
  '4x4': { rows: 4, cols: 4 },
};

const DENSITY_MULTIPLIER = {
  'full': 1,      // 1 second intervals
  'medium': 2,    // 2 second intervals
  'low': 5,       // 5 second intervals
};

export default function MultiChartPage() {
  const [gridSize, setGridSize] = useState<GridSize>('2x2');
  const [dataDensity, setDataDensity] = useState<DataDensity>('medium');
  const [isLoading, setIsLoading] = useState(true);
  const [generationTime, setGenerationTime] = useState(0);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [visibleSeries, setVisibleSeries] = useState<Record<number, boolean[]>>({});
  const [mounted, setMounted] = useState(false);

  const chartCount = GRID_DIMENSIONS[gridSize].rows * GRID_DIMENSIONS[gridSize].cols;
  const multiplier = DENSITY_MULTIPLIER[dataDensity];
  const dataPointsPerSeries = Math.floor(10800 / multiplier);

  const [chartSize, setChartSize] = useState({ width: 400, height: 300 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const calculateChartSize = () => {
      const grid = GRID_DIMENSIONS[gridSize];
      const padding = 40;
      const headerHeight = 180;
      const width = Math.floor((window.innerWidth - padding) / grid.cols) - 10;
      const height = Math.floor((window.innerHeight - headerHeight - padding) / grid.rows) - 10;
      setChartSize({ 
        width: Math.max(width, 200), 
        height: Math.max(height, 150) 
      });
    };

    calculateChartSize();
    window.addEventListener('resize', calculateChartSize);
    return () => window.removeEventListener('resize', calculateChartSize);
  }, [gridSize, mounted]);

  useEffect(() => {
    if (!mounted) return;
    
    const generateData = () => {
      const startTime = performance.now();
      setIsLoading(true);
      
      const now = Math.floor(Date.now() / 1000);
      const newCharts: ChartData[] = [];
      const newVisibleSeries: Record<number, boolean[]> = {};
      
      // Seeded random
      let seed = 42;
      const seededRandom = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      
      for (let chartIdx = 0; chartIdx < chartCount; chartIdx++) {
        const sensorType = SENSOR_TYPES[chartIdx % SENSOR_TYPES.length];
        const timestamps: number[] = new Array(dataPointsPerSeries);
        const series: number[][] = [timestamps];
        const labels: string[] = [];
        
        // Generate 6 series per chart
        for (let seriesIdx = 0; seriesIdx < 6; seriesIdx++) {
          const seriesData: number[] = new Array(dataPointsPerSeries);
          labels.push(`${sensorType.name} ${seriesIdx + 1}`);
          
          for (let i = 0; i < dataPointsPerSeries; i++) {
            if (seriesIdx === 0) {
              timestamps[i] = now - (dataPointsPerSeries - 1 - i) * multiplier;
            }
            
            const hourOfDay = ((i * multiplier) / 3600) % 24;
            const basePattern = Math.sin((hourOfDay - 6 + seriesIdx * 2) * Math.PI / 12);
            const noise = (seededRandom() - 0.5) * 0.1;
            const value = sensorType.baseValue + sensorType.amplitude * (basePattern + noise);
            seriesData[i] = value;
          }
          
          series.push(seriesData);
        }
        
        newCharts.push({
          id: chartIdx,
          data: series,
          labels,
          title: `${sensorType.name} (${sensorType.unit})`,
        });
        
        newVisibleSeries[chartIdx] = new Array(6).fill(true);
      }
      
      const endTime = performance.now();
      setGenerationTime(endTime - startTime);
      setCharts(newCharts);
      setVisibleSeries(newVisibleSeries);
      setIsLoading(false);
    };
    
    generateData();
  }, [gridSize, dataDensity, chartCount, dataPointsPerSeries, multiplier, mounted]);

  const toggleSeries = (chartId: number, seriesIndex: number) => {
    setVisibleSeries(prev => ({
      ...prev,
      [chartId]: prev[chartId].map((v, i) => i === seriesIndex ? !v : v)
    }));
  };

  const totalPoints = charts.reduce((sum, chart) => 
    sum + (chart.data[0]?.length || 0) * (chart.data.length - 1), 0
  );

  const visiblePoints = charts.reduce((sum, chart) => 
    sum + (chart.data[0]?.length || 0) * (visibleSeries[chart.id]?.filter(v => v).length || 0), 0
  );

  return (
    <div className="h-screen p-4 flex flex-col overflow-hidden">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-center mb-2">Multi-Chart Load Test</h1>
        
        <div className="flex justify-center items-center gap-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Grid Size:</span>
            {(['1x1', '2x2', '3x3', '4x4'] as GridSize[]).map(size => (
              <button
                key={size}
                onClick={() => setGridSize(size)}
                className={`px-3 py-1 text-sm rounded ${
                  gridSize === size 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Density:</span>
            {(['full', 'medium', 'low'] as DataDensity[]).map(density => (
              <button
                key={density}
                onClick={() => setDataDensity(density)}
                className={`px-3 py-1 text-sm rounded ${
                  dataDensity === density 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {density}
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-center text-sm">
          <span className="font-semibold">Total Points:</span> {totalPoints.toLocaleString()} ({visiblePoints.toLocaleString()} visible) | 
          <span className="font-semibold ml-2">Generation Time:</span> {generationTime.toFixed(0)}ms | 
          <span className="font-semibold ml-2">Charts:</span> {chartCount}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Generating {chartCount} charts...</div>
        </div>
      ) : (
        <div 
          className="flex-1 grid gap-2 overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${GRID_DIMENSIONS[gridSize].cols}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_DIMENSIONS[gridSize].rows}, 1fr)`,
          }}
        >
          {charts.map(chart => (
            <div key={chart.id} className="border rounded p-1 overflow-hidden">
              <MultiSeriesTimeSeriesChart
                data={chart.data}
                seriesLabels={chart.labels}
                title={chart.title}
                yLabel=""
                width={chartSize.width}
                height={chartSize.height}
                visibleSeries={visibleSeries[chart.id]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}