import { useState, useCallback, useRef } from 'react';
import { 
  DataReference, 
  TimeSeriesMetadata, 
  DataRequest,
  ParameterMetadata 
} from '@/types/dataReference';
import { ParsedCSVData } from '@/types/csv';
import { ChartMetadata } from '@/types/chart';
import { DataReferenceManager } from '@/services/DataReferenceManager';
import { CSVParser } from '@/utils/csvParser';
import { StorageManager } from '@/services/StorageManager';
import { MetadataManager } from '@/services/MetadataManager';
import { FileSystemManager } from '@/services/FileSystemManager';
import { DatabaseManager } from '@/services/DatabaseManager';
import { ToastType } from '@/components/common/Toast';

interface UseOptimizedCSVDataReturn {
  // Metadata only - no actual data
  dataReferences: DataReference[];
  currentMetadata: TimeSeriesMetadata | null;
  availableParameters: ParameterMetadata[];
  
  // Data operations
  loadCSVFile: (file: File) => Promise<void>;
  loadCSVFiles: (files: FileList) => Promise<void>;
  createChart: (parameterIds: string[], chartOptions?: any) => Promise<ChartMetadata | null>;
  
  // State
  isLoading: boolean;
  error: string | null;
  memoryUsage: { used: number; max: number };
  
  // Manager references
  setStorageManager: (manager: StorageManager | null) => void;
  setMetadataManager: (manager: MetadataManager | null) => void;
  setFileSystemManager: (manager: FileSystemManager | null) => void;
  setDatabaseManager: (manager: DatabaseManager | null) => void;
}

export function useOptimizedCSVData(
  showToast: (message: string, type: ToastType) => void
): UseOptimizedCSVDataReturn {
  const [dataReferences, setDataReferences] = useState<DataReference[]>([]);
  const [currentMetadata, setCurrentMetadata] = useState<TimeSeriesMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Manager references
  const storageManagerRef = useRef<StorageManager | null>(null);
  const metadataManagerRef = useRef<MetadataManager | null>(null);
  const fileSystemManagerRef = useRef<FileSystemManager | null>(null);
  const databaseManagerRef = useRef<DatabaseManager | null>(null);
  const dataManagerRef = useRef<DataReferenceManager | null>(null);
  
  // Initialize data manager
  const getDataManager = useCallback(() => {
    if (!dataManagerRef.current) {
      dataManagerRef.current = DataReferenceManager.getInstance(
        storageManagerRef.current || undefined,
        metadataManagerRef.current || undefined
      );
    }
    return dataManagerRef.current;
  }, []);
  
  // Load CSV file and extract metadata only
  const loadCSVFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      showToast(`${file.name}を読み込んでいます...`, 'info');
      
      // Parse CSV to extract structure
      const parser = new CSVParser(file);
      const parsedData = await parser.parse();
      
      // Register with data manager - it will handle storage
      const dataManager = getDataManager();
      const reference = await dataManager.registerData(parsedData);
      const metadata = await dataManager.getMetadata(reference.id);
      
      // Update state with reference and metadata only
      setDataReferences(prev => [...prev, reference]);
      setCurrentMetadata(metadata);
      
      showToast(
        `${file.name}を正常に読み込みました（${reference.totalRows}行、${metadata?.parameters.length}パラメータ）`,
        'success'
      );
      
      // If storage managers are available, persist in background
      if (storageManagerRef.current && fileSystemManagerRef.current) {
        persistInBackground(parsedData, reference);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, getDataManager]);
  
  // Load multiple CSV files
  const loadCSVFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    
    if (files.length === 1) {
      await loadCSVFile(files[0]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      showToast(`${files.length}個のファイルを読み込んでいます...`, 'info');
      
      const references: DataReference[] = [];
      const dataManager = getDataManager();
      
      // Process files in batches to avoid memory overload
      const batchSize = 5;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = Array.from(files).slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (file) => {
          const parser = new CSVParser(file);
          const parsedData = await parser.parse();
          const reference = await dataManager.registerData(parsedData);
          references.push(reference);
        }));
        
        // Update progress
        const progress = Math.min((i + batchSize) / files.length * 100, 100);
        showToast(`読み込み進捗: ${progress.toFixed(0)}%`, 'info');
      }
      
      setDataReferences(prev => [...prev, ...references]);
      
      // Set the first reference as current
      if (references.length > 0) {
        const metadata = await dataManager.getMetadata(references[0].id);
        setCurrentMetadata(metadata);
      }
      
      showToast(`${files.length}個のファイルを正常に読み込みました`, 'success');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [loadCSVFile, showToast, getDataManager]);
  
  // Create chart by loading only required data
  const createChart = useCallback(async (
    parameterIds: string[],
    chartOptions?: any
  ): Promise<ChartMetadata | null> => {
    if (!currentMetadata || parameterIds.length === 0) {
      showToast('パラメータを選択してください', 'error');
      return null;
    }
    
    try {
      const dataManager = getDataManager();
      
      // Create data request
      const request: DataRequest = {
        dataReference: currentMetadata.dataReference,
        parameterIds,
        timeRange: chartOptions?.timeRange,
        downsample: chartOptions?.downsample || {
          method: 'average',
          targetPoints: 1000 // Default to 1000 points for performance
        }
      };
      
      // Load only requested data
      const response = await dataManager.loadData(request);
      
      // Convert to chart format
      const chartData = convertToChartData(response, currentMetadata);
      
      const chart: ChartMetadata = {
        id: Date.now(),
        ...chartData,
        title: chartOptions?.title || 'Time Series Chart',
        layout: chartOptions?.layout || { dataRevision: 0 },
        config: chartOptions?.config || { responsive: true }
      };
      
      showToast('チャートを作成しました', 'success');
      return chart;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'チャートの作成に失敗しました';
      showToast(message, 'error');
      return null;
    }
  }, [currentMetadata, showToast, getDataManager]);
  
  // Background persistence
  const persistInBackground = useCallback(async (
    data: ParsedCSVData,
    reference: DataReference
  ) => {
    try {
      // This runs in background without blocking UI
      if (storageManagerRef.current && fileSystemManagerRef.current) {
        await storageManagerRef.current.saveData(
          data,
          fileSystemManagerRef.current.rootHandle!
        );
      }
    } catch (err) {
      console.error('Background persistence failed:', err);
    }
  }, []);
  
  // Convert data response to chart format
  const convertToChartData = (response: any, metadata: TimeSeriesMetadata) => {
    const { chunks } = response;
    if (chunks.length === 0) {
      return { data: [], labels: [] };
    }
    
    // Use first chunk's timestamps as base
    const timestamps = chunks[0].timestamps;
    const data = [timestamps];
    const labels = ['Timestamp'];
    
    // Add each parameter's data
    chunks.forEach((chunk: any) => {
      const param = metadata.parameters.find(p => p.id === chunk.parameterId);
      if (param) {
        data.push(chunk.values);
        labels.push(`${param.name} [${param.unit}]`);
      }
    });
    
    return { data, labels };
  };
  
  // Manager setters
  const setStorageManager = useCallback((manager: StorageManager | null) => {
    storageManagerRef.current = manager;
  }, []);
  
  const setMetadataManager = useCallback((manager: MetadataManager | null) => {
    metadataManagerRef.current = manager;
  }, []);
  
  const setFileSystemManager = useCallback((manager: FileSystemManager | null) => {
    fileSystemManagerRef.current = manager;
  }, []);
  
  const setDatabaseManager = useCallback((manager: DatabaseManager | null) => {
    databaseManagerRef.current = manager;
  }, []);
  
  // Get available parameters from current metadata
  const availableParameters = currentMetadata?.parameters || [];
  
  // Get memory usage
  const memoryUsage = getDataManager().getMemoryUsage();
  
  return {
    dataReferences,
    currentMetadata,
    availableParameters,
    loadCSVFile,
    loadCSVFiles,
    createChart,
    isLoading,
    error,
    memoryUsage,
    setStorageManager,
    setMetadataManager,
    setFileSystemManager,
    setDatabaseManager
  };
}