'use client';

import { useState, useEffect } from 'react';
import MultiSeriesTimeSeriesChart from '../components/MultiSeriesTimeSeriesChart';

export default function Home() {
  const [dataGenerationTime, setDataGenerationTime] = useState(0);
  const [timeSeriesData, setTimeSeriesData] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  const [visibleSeries, setVisibleSeries] = useState<boolean[]>([true, true, true, true, true, true]);
  
  const seriesLabels = ['Sensor 1', 'Sensor 2', 'Sensor 3', 'Sensor 4', 'Sensor 5', 'Sensor 6'];
  
  useEffect(() => {
    // Calculate chart dimensions based on viewport
    const updateDimensions = () => {
      setDimensions({
        width: Math.min(window.innerWidth - 40, 1200),
        height: Math.min(window.innerHeight - 180, 650)
      });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    const startTime = performance.now();
    
    // Generate 3 hours of data at 1 second intervals
    const now = Math.floor(Date.now() / 1000);
    const dataPoints = 3 * 60 * 60; // 10,800 points
    
    // Initialize arrays
    const timestamps: number[] = new Array(dataPoints);
    const series1: number[] = new Array(dataPoints);
    const series2: number[] = new Array(dataPoints);
    const series3: number[] = new Array(dataPoints);
    const series4: number[] = new Array(dataPoints);
    const series5: number[] = new Array(dataPoints);
    const series6: number[] = new Array(dataPoints);
    
    // Use a seeded random for consistent results
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    
    for (let i = 0; i < dataPoints; i++) {
      timestamps[i] = now - (dataPoints - 1 - i); // From 3 hours ago to now
      const hourOfDay = (i / 3600) % 24;
      
      // Series 1: Base temperature pattern
      const baseTemp = 20 + 10 * Math.sin((hourOfDay - 6) * Math.PI / 12);
      series1[i] = baseTemp + (seededRandom() - 0.5) * 2;
      
      // Series 2: Higher amplitude, phase shifted
      series2[i] = 25 + 15 * Math.sin((hourOfDay - 8) * Math.PI / 12) + (seededRandom() - 0.5) * 3;
      
      // Series 3: Lower baseline, different pattern
      series3[i] = 15 + 8 * Math.cos((hourOfDay - 4) * Math.PI / 12) + (seededRandom() - 0.5) * 2.5;
      
      // Series 4: Rapid oscillations
      series4[i] = 22 + 5 * Math.sin(hourOfDay * Math.PI / 3) + (seededRandom() - 0.5) * 4;
      
      // Series 5: Gradual trend with noise
      series5[i] = 18 + i * 0.001 + 6 * Math.sin((hourOfDay - 10) * Math.PI / 12) + (seededRandom() - 0.5) * 3;
      
      // Series 6: Inverse pattern
      series6[i] = 30 - 12 * Math.sin((hourOfDay - 6) * Math.PI / 12) + (seededRandom() - 0.5) * 2;
    }
    
    const endTime = performance.now();
    setDataGenerationTime(endTime - startTime);
    setTimeSeriesData([timestamps, series1, series2, series3, series4, series5, series6]);
    setIsLoading(false);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const toggleSeries = (index: number) => {
    const newVisibleSeries = [...visibleSeries];
    newVisibleSeries[index] = !newVisibleSeries[index];
    setVisibleSeries(newVisibleSeries);
  };

  const totalPoints = isLoading ? 0 : (timeSeriesData[0]?.length || 0) * (timeSeriesData.length - 1);
  const visiblePoints = isLoading ? 0 : (timeSeriesData[0]?.length || 0) * visibleSeries.filter(v => v).length;

  return (
    <div className="h-screen p-4 flex flex-col overflow-hidden">
      <h1 className="text-2xl font-bold mb-2 text-center">uPlot Multi-Series Time Series Scatter Plot Load Test</h1>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Loading data...</div>
        </div>
      ) : (
        <>
          <div className="mb-2 text-center">
            <div className="text-sm">
              <span className="font-semibold">Total Points:</span> {totalPoints.toLocaleString()} ({visiblePoints.toLocaleString()} visible) | 
              <span className="font-semibold ml-2">Generation Time:</span> {dataGenerationTime.toFixed(2)}ms | 
              <span className="font-semibold ml-2">Time Range:</span> 3 hours (1 sec intervals)
            </div>
          </div>
          
          <div className="mb-2 flex justify-center gap-4 flex-wrap">
            {seriesLabels.map((label, index) => (
              <label key={index} className="flex items-center cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={visibleSeries[index]}
                  onChange={() => toggleSeries(index)}
                  className="mr-1"
                />
                <span style={{ color: `rgba(${index === 0 ? '59, 130, 246' : index === 1 ? '239, 68, 68' : index === 2 ? '34, 197, 94' : index === 3 ? '251, 146, 60' : index === 4 ? '168, 85, 247' : '236, 72, 153'}, 1)` }}>
                  {label}
                </span>
              </label>
            ))}
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <MultiSeriesTimeSeriesChart
              data={timeSeriesData} 
              seriesLabels={seriesLabels}
              title="6-Series Load Test (64,800 total points)"
              yLabel="Temperature (°C)"
              width={dimensions.width}
              height={dimensions.height}
              visibleSeries={visibleSeries}
            />
          </div>
        </>
      )}
    </div>
  );
}