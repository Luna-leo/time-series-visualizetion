// Simulates a database or CSV data source
export interface SensorData {
  timestamps: number[];
  series: number[][];
}

export interface SensorType {
  name: string;
  unit: string;
  baseValue: number;
  amplitude: number;
}

export const SENSOR_TYPES: SensorType[] = [
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

export type DataDensity = 'full' | 'medium' | 'low';

const DENSITY_MULTIPLIER: Record<DataDensity, number> = {
  'full': 1,      // 1 second intervals
  'medium': 2,    // 2 second intervals
  'low': 5,       // 5 second intervals
};

// Fetch configuration to simulate real-world scenarios
export const FETCH_CONFIG = {
  // Database query latency (milliseconds)
  dbLatency: {
    local: 10,      // Local DB
    remote: 50,     // Remote DB
    slowQuery: 200  // Complex query
  },
  
  // Batch size (number of charts to fetch at once)
  batchSize: 4,
  
  // Cache expiry (seconds)
  cacheExpiry: 300
};

class DataStore {
  private static instance: DataStore;
  private dataCache: Map<string, number[][]> = new Map();
  private initialized: boolean = false;
  
  private constructor() {}
  
  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('Initializing data store (simulating database)...');
    const startTime = performance.now();
    
    // Pre-generate all data (simulating existing DB data)
    for (const sensorType of SENSOR_TYPES) {
      for (const density of ['full', 'medium', 'low'] as DataDensity[]) {
        const key = `${sensorType.name}-${density}`;
        const data = await this.generateSensorData(sensorType, density);
        this.dataCache.set(key, data);
      }
    }
    
    const endTime = performance.now();
    console.log(`Data store initialized in ${(endTime - startTime).toFixed(2)}ms`);
    this.initialized = true;
  }
  
  private async generateSensorData(
    sensorType: SensorType, 
    density: DataDensity
  ): Promise<number[][]> {
    const multiplier = DENSITY_MULTIPLIER[density];
    const dataPointsPerSeries = Math.floor(10800 / multiplier);
    const now = Math.floor(Date.now() / 1000);
    
    const timestamps: number[] = new Array(dataPointsPerSeries);
    const series: number[][] = [timestamps];
    
    // Seeded random for consistency
    let seed = sensorType.name.charCodeAt(0);
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    
    // Generate 6 series per sensor
    for (let seriesIdx = 0; seriesIdx < 6; seriesIdx++) {
      const seriesData: number[] = new Array(dataPointsPerSeries);
      
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
    
    return series;
  }
  
  // Simulate fetching data from DB/CSV with network latency
  async fetchSensorData(
    sensorName: string, 
    density: DataDensity, 
    latencyType: 'local' | 'remote' | 'slowQuery' = 'remote'
  ): Promise<number[][]> {
    // Simulate network/DB latency
    const delay = FETCH_CONFIG.dbLatency[latencyType];
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const key = `${sensorName}-${density}`;
    const data = this.dataCache.get(key);
    
    if (!data) {
      throw new Error(`No data found for sensor: ${sensorName}, density: ${density}`);
    }
    
    // Return a copy to simulate actual data fetching
    return data.map(series => [...series]);
  }
  
  // Fetch multiple sensors in parallel (simulating batch queries)
  async fetchMultipleSensors(
    requests: Array<{ sensorName: string; density: DataDensity }>,
    latencyType: 'local' | 'remote' | 'slowQuery' = 'remote'
  ): Promise<number[][][]> {
    const promises = requests.map(req => 
      this.fetchSensorData(req.sensorName, req.density, latencyType)
    );
    
    return Promise.all(promises);
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
}

export default DataStore;