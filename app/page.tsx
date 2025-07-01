import TimeSeriesChart from '../components/TimeSeriesChart';

export default function Home() {
  // Generate time series data (last 24 hours, hourly data)
  const now = Math.floor(Date.now() / 1000);
  const timestamps: number[] = [];
  const values: number[] = [];
  
  for (let i = 23; i >= 0; i--) {
    timestamps.push(now - i * 3600); // Hour intervals
    values.push(50 + Math.sin(i * 0.5) * 20 + Math.random() * 10); // Simulated data
  }
  
  const timeSeriesData: [number[], number[]] = [timestamps, values];

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-8">uPlot Time Series Chart Demo</h1>
      <TimeSeriesChart 
        data={timeSeriesData} 
        title="24-Hour Data"
        yLabel="Temperature (°C)"
      />
    </div>
  );
}