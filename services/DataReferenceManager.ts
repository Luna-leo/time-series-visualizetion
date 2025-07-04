import { DataReference, ParameterMetadata, TimeSeriesMetadata, DataChunk, DataRequest, DataResponse } from '@/types/dataReference';
import { ParsedCSVData, CSVParameter } from '@/types/csv';
import { StorageManager } from './StorageManager';
import { MetadataManager } from './MetadataManager';

export class DataReferenceManager {
  private static instance: DataReferenceManager;
  private dataReferences: Map<string, DataReference> = new Map();
  private metadataCache: Map<string, TimeSeriesMetadata> = new Map();
  private memoryCache: Map<string, ParsedCSVData> = new Map();
  private cacheSize = 0;
  private maxCacheSize = 100 * 1024 * 1024; // 100MB default
  
  private constructor(
    private storageManager?: StorageManager,
    private metadataManager?: MetadataManager
  ) {}
  
  static getInstance(storageManager?: StorageManager, metadataManager?: MetadataManager): DataReferenceManager {
    if (!DataReferenceManager.instance) {
      DataReferenceManager.instance = new DataReferenceManager(storageManager, metadataManager);
    }
    return DataReferenceManager.instance;
  }
  
  async registerData(data: ParsedCSVData): Promise<DataReference> {
    const id = this.generateDataId(data.fileName);
    
    // Create data reference
    const reference: DataReference = {
      id,
      fileName: data.fileName,
      dataType: 'csv',
      totalRows: data.timestamps.length,
      timeRange: {
        start: data.timestamps[0],
        end: data.timestamps[data.timestamps.length - 1]
      },
      storageLocation: 'memory'
    };
    
    // Create metadata
    const metadata: TimeSeriesMetadata = {
      dataReference: id,
      parameters: data.parameters.map(param => this.createParameterMetadata(param, id)),
      timestamps: {
        count: data.timestamps.length,
        start: data.timestamps[0],
        end: data.timestamps[data.timestamps.length - 1],
        interval: this.calculateInterval(data.timestamps)
      }
    };
    
    // Store reference and metadata
    this.dataReferences.set(id, reference);
    this.metadataCache.set(id, metadata);
    
    // Optionally store in persistent storage
    if (this.storageManager && this.shouldPersist(data)) {
      await this.persistData(id, data);
      reference.storageLocation = 'filesystem';
      // Clear from memory cache after persisting
      this.memoryCache.delete(id);
    } else {
      // Keep in memory for small datasets
      this.memoryCache.set(id, data);
      this.updateCacheSize(data);
    }
    
    return reference;
  }
  
  async getMetadata(dataReferenceId: string): Promise<TimeSeriesMetadata | null> {
    return this.metadataCache.get(dataReferenceId) || null;
  }
  
  async loadData(request: DataRequest): Promise<DataResponse> {
    const metadata = this.metadataCache.get(request.dataReference);
    if (!metadata) {
      throw new Error(`No metadata found for reference: ${request.dataReference}`);
    }
    
    // Check memory cache first
    const cachedData = this.memoryCache.get(request.dataReference);
    if (cachedData) {
      return this.extractDataFromCache(cachedData, request);
    }
    
    // Load from persistent storage
    if (this.storageManager) {
      const data = await this.loadFromStorage(request);
      return this.processStorageData(data, request);
    }
    
    throw new Error('Data not found in cache or storage');
  }
  
  private createParameterMetadata(param: CSVParameter, dataReference: string): ParameterMetadata {
    const values = param.data.filter(v => !isNaN(v));
    return {
      id: param.id,
      name: param.name,
      unit: param.unit,
      columnIndex: param.columnIndex,
      dataReference,
      statistics: values.length > 0 ? {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        stdDev: this.calculateStdDev(values)
      } : undefined
    };
  }
  
  private calculateInterval(timestamps: Date[]): number | undefined {
    if (timestamps.length < 2) return undefined;
    
    const intervals = [];
    for (let i = 1; i < Math.min(10, timestamps.length); i++) {
      intervals.push(timestamps[i].getTime() - timestamps[i-1].getTime());
    }
    
    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }
  
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }
  
  private generateDataId(fileName: string): string {
    return `${fileName}_${Date.now()}`;
  }
  
  private shouldPersist(data: ParsedCSVData): boolean {
    // Always persist data for reusability
    // All CSV data will be converted to Parquet format
    return true;
  }
  
  private async persistData(id: string, data: ParsedCSVData): Promise<void> {
    if (!this.storageManager) {
      throw new Error('Storage manager not available');
    }

    // Extract metadata from filename (e.g., "PLANT1_MACHINE001_20240101.csv")
    const fileNameParts = data.fileName.replace('.csv', '').split('_');
    const metadata = {
      plant: fileNameParts[0] || 'DEFAULT',
      machineNo: fileNameParts[1] || '001',
      fileName: data.fileName,
      totalRows: data.timestamps.length,
      totalParameters: data.parameters.length,
      importedAt: new Date().toISOString()
    };

    const machineId = `${metadata.plant}_${metadata.machineNo}`;

    try {
      // Save data using storage manager
      await this.storageManager.saveData(data, machineId, metadata);
      
      // Update the data reference to indicate successful persistence
      const reference = this.dataReferences.get(id);
      if (reference) {
        reference.storageLocation = 'filesystem';
        // Store additional metadata for faster retrieval
        (reference as any).storageMetadata = {
          machineId,
          plant: metadata.plant,
          machineNo: metadata.machineNo
        };
      }

      console.log(`Successfully persisted data for ${machineId}`);
    } catch (error) {
      console.error('Failed to persist data:', error);
      throw error;
    }
  }
  
  private updateCacheSize(data: ParsedCSVData): void {
    const estimatedSize = data.timestamps.length * data.parameters.length * 8;
    this.cacheSize += estimatedSize;
    
    // Evict old data if cache is too large
    if (this.cacheSize > this.maxCacheSize) {
      this.evictOldestData();
    }
  }
  
  private evictOldestData(): void {
    // Simple FIFO eviction for now
    const firstKey = this.memoryCache.keys().next().value;
    if (firstKey) {
      this.memoryCache.delete(firstKey);
      // Update cache size calculation
    }
  }
  
  private extractDataFromCache(data: ParsedCSVData, request: DataRequest): DataResponse {
    const chunks: DataChunk[] = [];
    
    // Filter timestamps based on time range
    let startIdx = 0;
    let endIdx = data.timestamps.length;
    
    if (request.timeRange) {
      startIdx = data.timestamps.findIndex(t => t >= request.timeRange!.start);
      endIdx = data.timestamps.findIndex(t => t > request.timeRange!.end);
      if (endIdx === -1) endIdx = data.timestamps.length;
    }
    
    const filteredTimestamps = data.timestamps.slice(startIdx, endIdx);
    const timestampNumbers = filteredTimestamps.map(t => t.getTime() / 1000);
    
    // Extract requested parameters
    for (const paramId of request.parameterIds) {
      const param = data.parameters.find(p => p.id === paramId);
      if (!param) continue;
      
      const values = param.data.slice(startIdx, endIdx);
      
      // Apply downsampling if requested
      const { timestamps: downsampledTimestamps, values: downsampledValues } = 
        request.downsample ? 
          this.downsample(timestampNumbers, values, request.downsample) :
          { timestamps: timestampNumbers, values };
      
      chunks.push({
        dataReference: request.dataReference,
        parameterId: paramId,
        timeRange: {
          start: filteredTimestamps[0],
          end: filteredTimestamps[filteredTimestamps.length - 1]
        },
        timestamps: downsampledTimestamps,
        values: downsampledValues
      });
    }
    
    return {
      chunks,
      metadata: {
        totalPoints: data.timestamps.length * request.parameterIds.length,
        actualPoints: chunks.reduce((sum, chunk) => sum + chunk.values.length, 0),
        downsampled: !!request.downsample
      }
    };
  }
  
  private downsample(
    timestamps: number[], 
    values: number[], 
    options: { method: string; targetPoints: number }
  ): { timestamps: number[]; values: number[] } {
    if (timestamps.length <= options.targetPoints) {
      return { timestamps, values };
    }
    
    const ratio = Math.ceil(timestamps.length / options.targetPoints);
    const downsampledTimestamps: number[] = [];
    const downsampledValues: number[] = [];
    
    for (let i = 0; i < timestamps.length; i += ratio) {
      const endIdx = Math.min(i + ratio, timestamps.length);
      const windowTimestamps = timestamps.slice(i, endIdx);
      const windowValues = values.slice(i, endIdx);
      
      // Use middle timestamp
      downsampledTimestamps.push(windowTimestamps[Math.floor(windowTimestamps.length / 2)]);
      
      // Apply aggregation method
      switch (options.method) {
        case 'average':
          downsampledValues.push(
            windowValues.reduce((a, b) => a + b, 0) / windowValues.length
          );
          break;
        case 'min':
          downsampledValues.push(Math.min(...windowValues));
          break;
        case 'max':
          downsampledValues.push(Math.max(...windowValues));
          break;
        case 'first':
          downsampledValues.push(windowValues[0]);
          break;
        case 'last':
          downsampledValues.push(windowValues[windowValues.length - 1]);
          break;
      }
    }
    
    return { timestamps: downsampledTimestamps, values: downsampledValues };
  }
  
  private async loadFromStorage(request: DataRequest): Promise<ParsedCSVData> {
    if (!this.storageManager) {
      throw new Error('Storage manager not available');
    }

    const reference = this.dataReferences.get(request.dataReference);
    if (!reference) {
      throw new Error(`Data reference not found: ${request.dataReference}`);
    }

    // Get storage metadata
    const storageMetadata = (reference as any).storageMetadata;
    if (!storageMetadata || !storageMetadata.machineId) {
      throw new Error('Storage metadata not available');
    }

    const { machineId } = storageMetadata;
    
    // Load data from storage
    return await this.storageManager.loadData(machineId, request.timeRange);
  }
  
  private processStorageData(data: ParsedCSVData, request: DataRequest): DataResponse {
    // Use the same logic as extractDataFromCache
    return this.extractDataFromCache(data, request);
  }
  
  clearCache(): void {
    this.memoryCache.clear();
    this.cacheSize = 0;
  }
  
  getMemoryUsage(): { used: number; max: number } {
    return {
      used: this.cacheSize,
      max: this.maxCacheSize
    };
  }
}