'use client';

import { useState, useEffect, useCallback } from 'react';
import { MultiSeriesTimeSeriesChart } from '../../components/MultiSeriesTimeSeriesChart';
import { GridControls } from '../../components/common/GridControls';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { useMultiChartSeriesVisibility } from '../../hooks/useSeriesVisibility';
import { GRID_CONFIGURATIONS } from '../../constants/chartTheme';
import DataStore, { SENSOR_TYPES, FETCH_CONFIG } from '../../lib/dataStore';
import type { GridSize, DataDensity, ChartMetadata } from '../../types/chart';
import type { PerformanceMetrics } from '../../types/performance';

export default function MultiChartRefactoredPage() {
  // State management
  const [gridSize, setGridSize] = useState<GridSize>('2x2');
  const [dataDensity, setDataDensity] = useState<DataDensity>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [charts, setCharts] = useState<ChartMetadata[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  // Custom hooks
  const chartCount = GRID_CONFIGURATIONS[gridSize].rows * GRID_CONFIGURATIONS[gridSize].cols;
  const chartSize = useChartDimensions({ gridSize, headerHeight: 200 });
  const { visibilityMap } = useMultiChartSeriesVisibility(chartCount);

  // Data store instance
  const dataStore = DataStore.getInstance();

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
        setIsInitializing(false);
      }
    };
    
    initializeDataStore();
  }, []);

  // Load charts with progress tracking
  const loadCharts = useCallback(async (size: GridSize, density: DataDensity) => {
    if (!dataStore.isInitialized()) return;
    
    setIsLoading(true);
    setLoadProgress(0);
    const startTime = performance.now();
    
    const count = GRID_CONFIGURATIONS[size].rows * GRID_CONFIGURATIONS[size].cols;
    const newCharts: ChartMetadata[] = [];
    
    // Progressive loading in batches
    const batches = Math.ceil(count / FETCH_CONFIG.batchSize);
    
    try {
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
            sensorType: sensorType.name,
          });
        });
        
        // Update progress
        setLoadProgress(((batch + 1) / batches) * 100);
        
        // Update UI progressively
        setCharts([...newCharts]);
        
        // Allow UI to update between batches
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      
      const fetchTime = performance.now() - startTime;
      const totalPoints = newCharts.reduce((sum, chart) => 
        sum + (chart.data[0]?.length || 0) * (chart.data.length - 1), 0
      );
      
      setPerformanceMetrics({
        dataFetchTime: fetchTime,
        renderStartTime: performance.now() - startTime,
        totalCharts: count,
        totalDataPoints: totalPoints,
      });
    } catch (error) {
      console.error('Failed to load charts:', error);
    } finally {
      setIsLoading(false);
      setLoadProgress(100);
    }
  }, [dataStore]);

  // Handle control changes
  const handleGridSizeChange = useCallback(async (newSize: GridSize) => {
    setGridSize(newSize);
    await loadCharts(newSize, dataDensity);
  }, [dataDensity, loadCharts]);

  const handleDensityChange = useCallback(async (newDensity: DataDensity) => {
    setDataDensity(newDensity);
    await loadCharts(gridSize, newDensity);
  }, [gridSize, loadCharts]);

  // Calculate statistics
  const totalPoints = charts.reduce((sum, chart) => 
    sum + (chart.data[0]?.length || 0) * (chart.data.length - 1), 0
  );

  const visiblePoints = charts.reduce((sum, chart) => 
    sum + (chart.data[0]?.length || 0) * (visibilityMap[chart.id]?.filter(v => v).length || 0), 0
  );

  // Render
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
        <h1 className="text-xl font-bold text-center mb-2">
          Multi-Chart Load Test (Realistic Mode)
        </h1>
        
        <GridControls
          gridSize={gridSize}
          onGridSizeChange={handleGridSizeChange}
          dataDensity={dataDensity}
          onDensityChange={handleDensityChange}
          disabled={isLoading}
          className="mb-2"
        />
        
        <div className="text-center text-sm">
          <span className="font-semibold">Total Points:</span> {totalPoints.toLocaleString()} 
          ({visiblePoints.toLocaleString()} visible) | 
          <span className="font-semibold ml-2">Charts:</span> {chartCount}
          {performanceMetrics && (
            <> | <span className="font-semibold ml-2">Fetch Time:</span> {performanceMetrics.dataFetchTime.toFixed(0)}ms</>
          )}
        </div>
      </div>
      
      {isLoading && (
        <div className="mb-2">
          <ProgressBar 
            progress={loadProgress}
            message="Loading charts..."
          />
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
            gridTemplateColumns: `repeat(${GRID_CONFIGURATIONS[gridSize].cols}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_CONFIGURATIONS[gridSize].rows}, 1fr)`,
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
                visibleSeries={visibilityMap[chart.id]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}