import { useState, useCallback, useEffect } from 'react';
import { DuckDBManager } from '../lib/duckdb/duckdbManager';
import { FileSystemManager } from '../lib/fileSystem/fileSystemManager';

interface TimeSeriesQuery {
  machineId: string;
  parameters: string[];
  startTime: Date;
  endTime: Date;
  interval?: string; // e.g., '1 minute', '5 minutes', '1 hour'
}

interface QueryResult {
  data: Array<{
    time: Date;
    [key: string]: number | Date;
  }>;
  parameters: string[];
  stats: {
    totalPoints: number;
    queryTime: number;
  };
}

interface UseParquetDataProps {
  duckdbManager: DuckDBManager | null;
  fileSystemManager: FileSystemManager | null;
}

export function useParquetData({ duckdbManager, fileSystemManager }: UseParquetDataProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMachines, setAvailableMachines] = useState<string[]>([]);
  const [availableParameters, setAvailableParameters] = useState<Map<string, string[]>>(new Map());

  // Load available machines on mount
  useEffect(() => {
    const loadMachines = async () => {
      if (!fileSystemManager?.isInitialized()) return;

      try {
        const machines = await fileSystemManager.getMachines();
        setAvailableMachines(machines);
      } catch (err) {
        console.error('Failed to load machines:', err);
      }
    };

    loadMachines();
  }, [fileSystemManager]);

  // Load available parameters for a machine
  const loadParametersForMachine = useCallback(async (machineId: string) => {
    if (!duckdbManager?.isInitialized() || !fileSystemManager?.isInitialized()) {
      return [];
    }

    try {
      const parameters = await duckdbManager.getAvailableParameters(machineId);
      setAvailableParameters(prev => new Map(prev).set(machineId, parameters));
      return parameters;
    } catch (err) {
      console.error(`Failed to load parameters for ${machineId}:`, err);
      return [];
    }
  }, [duckdbManager, fileSystemManager]);

  // Query time series data
  const queryTimeSeries = useCallback(async (query: TimeSeriesQuery): Promise<QueryResult | null> => {
    if (!duckdbManager?.isInitialized() || !fileSystemManager?.isInitialized()) {
      setError('Storage system not initialized');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const startTime = performance.now();

    try {
      const results = await duckdbManager.queryTimeSeries(
        query.machineId,
        query.parameters,
        query.startTime,
        query.endTime,
        query.interval
      );

      const queryTime = performance.now() - startTime;

      return {
        data: results,
        parameters: query.parameters,
        stats: {
          totalPoints: results.length,
          queryTime,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to query data';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [duckdbManager, fileSystemManager]);

  // Get statistics for a parameter
  const getParameterStatistics = useCallback(async (
    machineId: string,
    parameter: string
  ) => {
    if (!duckdbManager?.isInitialized()) {
      return null;
    }

    try {
      return await duckdbManager.getDataStatistics(machineId, parameter);
    } catch (err) {
      console.error('Failed to get parameter statistics:', err);
      return null;
    }
  }, [duckdbManager]);

  // Get import history for a machine
  const getImportHistory = useCallback(async (machineId: string) => {
    if (!fileSystemManager?.isInitialized()) {
      return [];
    }

    try {
      return await fileSystemManager.getImportMetadata(machineId);
    } catch (err) {
      console.error('Failed to get import history:', err);
      return [];
    }
  }, [fileSystemManager]);

  return {
    isLoading,
    error,
    availableMachines,
    availableParameters,
    loadParametersForMachine,
    queryTimeSeries,
    getParameterStatistics,
    getImportHistory,
  };
}