'use client';

import { useState, useEffect } from 'react';
import MultiSeriesTimeSeriesChart from '../../components/MultiSeriesTimeSeriesChart';
import DataStore, { SENSOR_TYPES, FETCH_CONFIG, type DataDensity } from '../../lib/dataStore';

type GridSize = '1x1' | '2x2' | '3x3' | '4x4';

interface ChartData {
  id: number;
  data: number[][];
  labels: string[];
  title: string;
}

interface PerformanceMetrics {
  dataFetchTime: number;
  renderStartTime: number;
  totalCharts: number;
}

const GRID_DIMENSIONS = {
  '1x1': { rows: 1, cols: 1 },
  '2x2': { rows: 2, cols: 2 },
  '3x3': { rows: 3, cols: 3 },
  '4x4': { rows: 4, cols: 4 },
};

export default function MultiChartPage() {
  const [gridSize, setGridSize] = useState<GridSize>('2x2');
  const [dataDensity, setDataDensity] = useState<DataDensity>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [visibleSeries, setVisibleSeries] = useState<Record<number, boolean[]>>({});
  const [chartSize, setChartSize] = useState({ width: 400, height: 300 });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  
  const dataStore = DataStore.getInstance();
  const chartCount = GRID_DIMENSIONS[gridSize].rows * GRID_DIMENSIONS[gridSize].cols;

  // Initialize data store on mount
  useEffect(() => {
    const initializeDataStore = async () => {
      try {
        await dataStore.initialize();
        setIsInitializing(false);
        // Load initial charts after initialization
        await loadCharts(gridSize, dataDensity);
      } catch (error) {
        console.error('Failed to initialize data store:', error);
      }
    };
    
    initializeDataStore();
  }, []);

  // Calculate chart sizes based on grid
  useEffect(() => {
    const calculateChartSize = () => {
      const grid = GRID_DIMENSIONS[gridSize];
      const padding = 40;
      const headerHeight = 200;
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
  }, [gridSize]);

  const loadCharts = async (size: GridSize, density: DataDensity) => {
    if (!dataStore.isInitialized()) return;
    
    setIsLoading(true);
    setLoadProgress(0);
    const startTime = performance.now();
    
    const count = GRID_DIMENSIONS[size].rows * GRID_DIMENSIONS[size].cols;
    const newCharts: ChartData[] = [];
    const newVisibleSeries: Record<number, boolean[]> = {};
    
    // Progressive loading in batches
    const batches = Math.ceil(count / FETCH_CONFIG.batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const start = batch * FETCH_CONFIG.batchSize;
      const end = Math.min(start + FETCH_CONFIG.batchSize, count);
      const batchRequests = [];
      
      // Prepare batch requests
      for (let i = start; i < end; i++) {
        const sensorType = SENSOR_TYPES[i % SENSOR_TYPES.length];
        batchRequests.push({
          sensorName: sensorType.name,
          density
        });
      }
      
      try {
        // Fetch batch data
        const batchData = await dataStore.fetchMultipleSensors(batchRequests, 'remote');
        
        // Process fetched data
        batchData.forEach((data, index) => {
          const chartIdx = start + index;
          const sensorType = SENSOR_TYPES[chartIdx % SENSOR_TYPES.length];
          const labels = Array.from({ length: 6 }, (_, i) => `${sensorType.name} ${i + 1}`);
          
          newCharts.push({
            id: chartIdx,
            data,
            labels,
            title: `${sensorType.name} (${sensorType.unit})`,
          });
          
          newVisibleSeries[chartIdx] = new Array(6).fill(true);
        });
        
        // Update progress
        setLoadProgress(((batch + 1) / batches) * 100);
        
        // Update UI progressively
        setCharts([...newCharts]);
        setVisibleSeries({ ...newVisibleSeries });
        
        // Allow UI to update between batches
        await new Promise(resolve => requestAnimationFrame(resolve));
        
      } catch (error) {
        console.error(`Failed to load batch ${batch}:`, error);
      }
    }
    
    const fetchTime = performance.now() - startTime;
    setPerformanceMetrics({
      dataFetchTime: fetchTime,
      renderStartTime: performance.now() - startTime,
      totalCharts: count
    });
    
    setIsLoading(false);
    setLoadProgress(100);
  };

  const handleGridSizeChange = async (newSize: GridSize) => {
    setGridSize(newSize);
    await loadCharts(newSize, dataDensity);
  };

  const handleDensityChange = async (newDensity: DataDensity) => {
    setDataDensity(newDensity);
    await loadCharts(gridSize, newDensity);
  };

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

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Initializing Data Store...</div>
          <div className="text-sm text-gray-600">Simulating database setup</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen p-4 flex flex-col overflow-hidden">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-center mb-2">Multi-Chart Load Test (Realistic Mode)</h1>
        
        <div className="flex justify-center items-center gap-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Grid Size:</span>
            {(['1x1', '2x2', '3x3', '4x4'] as GridSize[]).map(size => (
              <button
                key={size}
                onClick={() => handleGridSizeChange(size)}
                disabled={isLoading}
                className={`px-3 py-1 text-sm rounded ${
                  gridSize === size 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                onClick={() => handleDensityChange(density)}
                disabled={isLoading}
                className={`px-3 py-1 text-sm rounded ${
                  dataDensity === density 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {density}
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-center text-sm">
          <span className="font-semibold">Total Points:</span> {totalPoints.toLocaleString()} ({visiblePoints.toLocaleString()} visible) | 
          <span className="font-semibold ml-2">Charts:</span> {chartCount}
          {performanceMetrics && (
            <> | <span className="font-semibold ml-2">Fetch Time:</span> {performanceMetrics.dataFetchTime.toFixed(0)}ms</>
          )}
        </div>
      </div>
      
      {isLoading && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <div className="text-center text-sm mt-1">Loading charts... {Math.round(loadProgress)}%</div>
        </div>
      )}
      
      {!isLoading && charts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-gray-600">Select a grid size to load charts</div>
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