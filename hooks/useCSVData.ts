import { useState, useCallback } from 'react';
import { CSVParser } from '../utils/csvParser';
import { parseCSVWithSpecialHeader, prepareDataForParquet, partitionDataByMonth } from '../utils/csvToParquet';
import type { ParsedCSVData, ChartConfiguration, FileParseResult } from '../types/csv';
import type { ChartMetadata, MultiSeriesData } from '../types/chart';
import type { FileSystemManager } from '../lib/fileSystem/fileSystemManager';
import type { DuckDBManager } from '../lib/duckdb/duckdbManager';

// Helper function to convert records to CSV format
function convertToCSV(records: Array<Record<string, any>>, columns: string[]): string {
  if (records.length === 0) return '';
  
  // Header
  const header = columns.join(',');
  
  // Rows
  const rows = records.map(record => {
    return columns.map(col => {
      const value = record[col];
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value.toString();
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
}

interface CSVImportMetadata {
  plant?: string;
  machineNo?: string;
  label?: string;
  event?: string;
  startTime: Date;
  endTime: Date;
  fileName: string;
  importedAt: Date;
  detectedEncoding?: string;
}

interface UseCSVDataProps {
  fileSystemManager?: FileSystemManager | null;
  duckdbManager?: DuckDBManager | null;
}

interface UseCSVDataReturn {
  csvData: ParsedCSVData | null;
  isLoading: boolean;
  error: string | null;
  uploadCSV: (file: File, metadata?: Partial<CSVImportMetadata>, encoding?: 'UTF8' | 'SJIS' | 'EUCJP' | 'JIS' | 'AUTO') => Promise<void>;
  uploadMultipleCSVs: (files: File[], metadata?: Partial<CSVImportMetadata>, encoding?: 'UTF8' | 'SJIS' | 'EUCJP' | 'JIS' | 'AUTO') => Promise<void>;
  createChart: (config: ChartConfiguration) => void;
  updateChart: (chartId: string, config: Partial<ChartConfiguration>) => void;
  deleteChart: (chartId: string) => void;
  charts: ChartMetadata[];
  clearData: () => void;
  importHistory: CSVImportMetadata[];
  uploadProgress?: { current: number; total: number; fileName: string };
}

export function useCSVData({ fileSystemManager, duckdbManager }: UseCSVDataProps = {}): UseCSVDataReturn {
  const [csvData, setCSVData] = useState<ParsedCSVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartConfigs, setChartConfigs] = useState<ChartConfiguration[]>([]);
  const [charts, setCharts] = useState<ChartMetadata[]>([]);
  const [importHistory, setImportHistory] = useState<CSVImportMetadata[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | undefined>();

  const uploadCSV = useCallback(async (file: File, metadata?: Partial<CSVImportMetadata>, encoding?: 'UTF8' | 'SJIS' | 'EUCJP' | 'JIS' | 'AUTO') => {
    setIsLoading(true);
    setError(null);

    try {
      // Create parser with encoding option
      const parser = new CSVParser({ encoding: encoding || 'AUTO' });
      
      // Parse CSV for visualization
      const parsed = await parser.parseFile(file);
      setCSVData(parsed);
      
      // Show any parsing warnings
      if (parsed.errors && parsed.errors.length > 0) {
        console.warn('CSV parsing warnings:', parsed.errors);
      }

      // If storage managers are available, convert to Parquet and store
      if (fileSystemManager && duckdbManager && duckdbManager.isInitialized()) {
        try {
          // Parse CSV with special header for Parquet conversion
          const parseResult = await parseCSVWithSpecialHeader(file, undefined, encoding === 'AUTO' ? undefined : encoding);
          const { schema, records } = prepareDataForParquet(parseResult);
          
          // Validate metadata
          if (!metadata?.plant || !metadata?.machineNo) {
            throw new Error('Plant and Machine No are required');
          }
          
          // Create machine ID from plant and machine_no
          const machineId = `${metadata.plant}_${metadata.machineNo}`;
          
          // Partition data by month
          const partitions = partitionDataByMonth(records);
          
          // Convert and save each partition
          for (const [yearMonth, partitionData] of partitions) {
            // Convert partition to CSV format for DuckDB
            const csvData = convertToCSV(partitionData, Object.keys(schema));
            const csvBuffer = new TextEncoder().encode(csvData).buffer as ArrayBuffer;
            
            // Check if existing Parquet file exists for this partition
            let existingParquetData: ArrayBuffer | undefined;
            const existingFiles = fileSystemManager.getParquetFiles(machineId);
            if (existingFiles.includes(`${yearMonth}.parquet`)) {
              try {
                existingParquetData = await fileSystemManager.readParquetFile(
                  machineId,
                  `${yearMonth}.parquet`
                );
              } catch (err) {
                console.warn(`Could not read existing file for ${yearMonth}:`, err);
              }
            }
            
            // Convert CSV to Parquet with merge if existing data exists
            const parquetData = await duckdbManager.csvToParquetWithMerge(
              csvBuffer,
              machineId,
              yearMonth,
              existingParquetData,
              0 // No skip rows since we're providing clean CSV
            );
            
            // Save Parquet file
            await fileSystemManager.saveParquetFile(
              machineId,
              yearMonth,
              parquetData
            );
          }
          
          // Save import metadata
          const importMeta: CSVImportMetadata = {
            plant: metadata.plant,
            machineNo: metadata.machineNo,
            label: metadata.label,
            event: metadata.event,
            fileName: file.name,
            startTime: metadata.startTime || (records.length > 0 ? records[0].timestamp : new Date()),
            endTime: metadata.endTime || (records.length > 0 ? records[records.length - 1].timestamp : new Date()),
            importedAt: new Date(),
            detectedEncoding: parsed.detectedEncoding || encoding,
          };
          
          await fileSystemManager.saveImportMetadata(machineId, importMeta);
          setImportHistory(prev => [...prev, importMeta]);
          
          console.log(`Successfully converted and stored ${partitions.size} Parquet files for ${machineId}`);
        } catch (storageError) {
          console.error('Failed to store data as Parquet:', storageError);
          // Continue - visualization will still work even if storage fails
        }
      }
    } catch (err) {
      let errorMessage = 'Failed to parse CSV file';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // エンコーディング関連のエラーをより分かりやすくする
        if (err.message.includes('Failed to read CSV file')) {
          errorMessage = 'CSVファイルの読み込みに失敗しました。ファイルのエンコーディングを確認してください。';
        } else if (err.message.includes('encoding')) {
          errorMessage = 'ファイルのエンコーディング変換に失敗しました。別のエンコーディングを選択してください。';
        } else if (err.message.includes('無効な文字')) {
          errorMessage = 'ファイルに無効な文字が含まれています。エンコーディング設定を確認してください。';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fileSystemManager, duckdbManager]);

  const uploadMultipleCSVs = useCallback(async (files: File[], metadata?: Partial<CSVImportMetadata>, encoding?: 'UTF8' | 'SJIS' | 'EUCJP' | 'JIS' | 'AUTO') => {
    setIsLoading(true);
    setError(null);
    setUploadProgress({ current: 0, total: files.length, fileName: '' });

    try {
      // Create parser with encoding option
      const parser = new CSVParser({ encoding: encoding || 'AUTO' });
      
      // Parse all files to Long Format
      const fileResults: FileParseResult[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });
        
        try {
          // Parse each file
          const parsed = await parser.parseFile(file);
          
          // Convert to Long Format
          const longFormatResult = CSVParser.toLongFormat(parsed, file.name);
          fileResults.push(longFormatResult);
          
          // Collect any parsing warnings
          if (parsed.errors && parsed.errors.length > 0) {
            errors.push(...parsed.errors.map(e => `${file.name}: ${e}`));
          }
        } catch (fileError) {
          errors.push(`Failed to parse ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }
      
      if (fileResults.length === 0) {
        throw new Error('No files could be parsed successfully');
      }
      
      // Merge all files
      const mergeResult = CSVParser.mergeLongFormatFiles(fileResults);
      
      // Set the merged data for visualization
      setCSVData(mergeResult.mergedData);
      
      // Show warnings
      if (mergeResult.warnings.length > 0 || errors.length > 0) {
        console.warn('CSV import warnings:', [...errors, ...mergeResult.warnings]);
      }
      
      // If storage managers are available, convert to Parquet and store
      if (fileSystemManager && duckdbManager && duckdbManager.isInitialized()) {
        try {
          // Validate metadata
          if (!metadata?.plant || !metadata?.machineNo) {
            throw new Error('Plant and Machine No are required');
          }
          
          // Create machine ID from plant and machine_no
          const machineId = `${metadata.plant}_${metadata.machineNo}`;
          
          // Parse merged data for Parquet conversion
          const parseResult = await parseCSVWithSpecialHeader(
            new File([CSVParser.exportToCSV(mergeResult.mergedData)], 'merged.csv'),
            undefined,
            encoding === 'AUTO' ? undefined : encoding
          );
          const { schema, records } = prepareDataForParquet(parseResult);
          
          // Partition data by month
          const partitions = partitionDataByMonth(records);
          
          // Convert and save each partition
          for (const [yearMonth, partitionData] of partitions) {
            // Convert partition to CSV format for DuckDB
            const csvData = convertToCSV(partitionData, Object.keys(schema));
            const csvBuffer = new TextEncoder().encode(csvData).buffer as ArrayBuffer;
            
            // Check if existing Parquet file exists for this partition
            let existingParquetData: ArrayBuffer | undefined;
            const existingFiles = fileSystemManager.getParquetFiles(machineId);
            if (existingFiles.includes(`${yearMonth}.parquet`)) {
              try {
                existingParquetData = await fileSystemManager.readParquetFile(
                  machineId,
                  `${yearMonth}.parquet`
                );
              } catch (err) {
                console.warn(`Could not read existing file for ${yearMonth}:`, err);
              }
            }
            
            // Convert CSV to Parquet with merge if existing data exists
            const parquetData = await duckdbManager.csvToParquetWithMerge(
              csvBuffer,
              machineId,
              yearMonth,
              existingParquetData,
              0 // No skip rows since we're providing clean CSV
            );
            
            // Save Parquet file
            await fileSystemManager.saveParquetFile(
              machineId,
              yearMonth,
              parquetData
            );
          }
          
          // Save import metadata
          const importMeta: CSVImportMetadata = {
            plant: metadata.plant,
            machineNo: metadata.machineNo,
            label: metadata.label,
            event: metadata.event,
            fileName: `${files.length} files merged`,
            startTime: metadata.startTime || mergeResult.mergedData.timestamps[0],
            endTime: metadata.endTime || mergeResult.mergedData.timestamps[mergeResult.mergedData.timestamps.length - 1],
            importedAt: new Date(),
            detectedEncoding: encoding || 'AUTO',
          };
          
          await fileSystemManager.saveImportMetadata(machineId, importMeta);
          setImportHistory(prev => [...prev, importMeta]);
          
          console.log(`Successfully merged ${files.length} files and stored ${partitions.size} Parquet files for ${machineId}`);
        } catch (storageError) {
          console.error('Failed to store merged data as Parquet:', storageError);
          // Continue - visualization will still work even if storage fails
        }
      }
    } catch (err) {
      let errorMessage = 'Failed to parse CSV files';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setUploadProgress(undefined);
    }
  }, [fileSystemManager, duckdbManager]);

  const createChart = useCallback((config: ChartConfiguration & { queryData?: any }) => {
    let newChart: ChartMetadata;

    if (config.queryData) {
      // Chart from Parquet query
      const { data, parameters } = config.queryData;
      
      // Convert query data to chart format (timestamps in seconds for uPlot)
      const timestamps = data.map((row: any) => new Date(row.time || row.timestamp).getTime() / 1000);
      const values = parameters.map((param: string) => 
        data.map((row: any) => row[param] || 0)
      );
      
      newChart = {
        id: Date.now(),
        data: [timestamps, ...values] as MultiSeriesData,
        labels: parameters,
        title: config.title || 'Query Chart',
      };
    } else if (csvData) {
      // Chart from CSV data
      const selectedParams = csvData.parameters.filter(p => config.parameterIds.includes(p.id));
      newChart = {
        id: Date.now(),
        data: CSVParser.toChartData(csvData, config.parameterIds),
        labels: CSVParser.getParameterLabels(csvData, config.parameterIds),
        title: config.title || 'Chart',
        parameters: selectedParams.map(p => ({
          id: p.id,
          name: p.name,
          unit: p.unit
        }))
      };
    } else {
      return;
    }

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
    uploadMultipleCSVs,
    createChart,
    updateChart,
    deleteChart,
    charts,
    clearData,
    importHistory,
    uploadProgress,
  };
}