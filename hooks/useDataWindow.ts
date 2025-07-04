import { useState, useCallback, useEffect, useRef } from 'react';
import { DataRequest, DataResponse } from '@/types/dataReference';
import { DataReferenceManager } from '@/services/DataReferenceManager';

interface DataWindow {
  start: Date;
  end: Date;
  targetPoints: number;
}

interface UseDataWindowProps {
  dataReferenceId: string;
  parameterIds: string[];
  initialWindow?: Partial<DataWindow>;
  onDataLoaded?: (data: DataResponse) => void;
  onError?: (error: Error) => void;
}

interface UseDataWindowReturn {
  data: DataResponse | null;
  window: DataWindow;
  isLoading: boolean;
  error: Error | null;
  
  // Window controls
  setWindow: (window: Partial<DataWindow>) => void;
  zoomIn: (factor?: number) => void;
  zoomOut: (factor?: number) => void;
  pan: (direction: 'left' | 'right', amount?: number) => void;
  reset: () => void;
  
  // Data controls
  refresh: () => void;
  setDownsampleMethod: (method: 'average' | 'min' | 'max' | 'first' | 'last') => void;
}

export function useDataWindow({
  dataReferenceId,
  parameterIds,
  initialWindow,
  onDataLoaded,
  onError
}: UseDataWindowProps): UseDataWindowReturn {
  const [data, setData] = useState<DataResponse | null>(null);
  const [window, setWindowState] = useState<DataWindow>(() => ({
    start: initialWindow?.start || new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: initialWindow?.end || new Date(),
    targetPoints: initialWindow?.targetPoints || 1000
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [downsampleMethod, setDownsampleMethodState] = useState<DataRequest['downsample']['method']>('average');
  
  const dataManagerRef = useRef<DataReferenceManager>();
  const loadingRef = useRef<AbortController | null>(null);
  
  // Get data manager instance
  useEffect(() => {
    dataManagerRef.current = DataReferenceManager.getInstance();
  }, []);
  
  // Load data when window or parameters change
  const loadData = useCallback(async () => {
    if (!dataManagerRef.current || !dataReferenceId || parameterIds.length === 0) {
      return;
    }
    
    // Cancel previous request
    if (loadingRef.current) {
      loadingRef.current.abort();
    }
    
    const abortController = new AbortController();
    loadingRef.current = abortController;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const request: DataRequest = {
        dataReference: dataReferenceId,
        parameterIds,
        timeRange: {
          start: window.start,
          end: window.end
        },
        downsample: {
          method: downsampleMethod,
          targetPoints: window.targetPoints
        }
      };
      
      const response = await dataManagerRef.current.loadData(request);
      
      // Check if request was aborted
      if (!abortController.signal.aborted) {
        setData(response);
        onDataLoaded?.(response);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        const error = err instanceof Error ? err : new Error('Failed to load data');
        setError(error);
        onError?.(error);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
        loadingRef.current = null;
      }
    }
  }, [dataReferenceId, parameterIds, window, downsampleMethod, onDataLoaded, onError]);
  
  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
    
    return () => {
      // Cleanup: cancel any pending requests
      if (loadingRef.current) {
        loadingRef.current.abort();
      }
    };
  }, [loadData]);
  
  // Window control functions
  const setWindow = useCallback((newWindow: Partial<DataWindow>) => {
    setWindowState(prev => ({
      ...prev,
      ...newWindow
    }));
  }, []);
  
  const zoomIn = useCallback((factor: number = 2) => {
    setWindowState(prev => {
      const duration = prev.end.getTime() - prev.start.getTime();
      const center = prev.start.getTime() + duration / 2;
      const newDuration = duration / factor;
      
      return {
        ...prev,
        start: new Date(center - newDuration / 2),
        end: new Date(center + newDuration / 2)
      };
    });
  }, []);
  
  const zoomOut = useCallback((factor: number = 2) => {
    setWindowState(prev => {
      const duration = prev.end.getTime() - prev.start.getTime();
      const center = prev.start.getTime() + duration / 2;
      const newDuration = duration * factor;
      
      return {
        ...prev,
        start: new Date(center - newDuration / 2),
        end: new Date(center + newDuration / 2)
      };
    });
  }, []);
  
  const pan = useCallback((direction: 'left' | 'right', amount?: number) => {
    setWindowState(prev => {
      const duration = prev.end.getTime() - prev.start.getTime();
      const shift = amount || duration * 0.2; // Default 20% shift
      const delta = direction === 'left' ? -shift : shift;
      
      return {
        ...prev,
        start: new Date(prev.start.getTime() + delta),
        end: new Date(prev.end.getTime() + delta)
      };
    });
  }, []);
  
  const reset = useCallback(() => {
    setWindowState({
      start: initialWindow?.start || new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: initialWindow?.end || new Date(),
      targetPoints: initialWindow?.targetPoints || 1000
    });
  }, [initialWindow]);
  
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);
  
  const setDownsampleMethod = useCallback((method: DataRequest['downsample']['method']) => {
    setDownsampleMethodState(method);
  }, []);
  
  return {
    data,
    window,
    isLoading,
    error,
    setWindow,
    zoomIn,
    zoomOut,
    pan,
    reset,
    refresh,
    setDownsampleMethod
  };
}