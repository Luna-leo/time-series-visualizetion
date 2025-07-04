import { useState, useEffect, useCallback, useRef } from 'react';
import { DataReferenceManager } from '@/services/DataReferenceManager';

interface MemoryUsage {
  used: number;
  max: number;
  percentage: number;
  humanReadable: {
    used: string;
    max: string;
  };
}

interface MemoryWarning {
  level: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
}

interface UseMemoryManagerProps {
  warningThresholds?: {
    low: number;      // Default: 50%
    medium: number;   // Default: 70%
    high: number;     // Default: 85%
    critical: number; // Default: 95%
  };
  checkInterval?: number; // Default: 5000ms
  onWarning?: (warning: MemoryWarning) => void;
  autoCleanup?: boolean; // Default: true
}

interface UseMemoryManagerReturn {
  usage: MemoryUsage;
  warning: MemoryWarning | null;
  
  // Manual controls
  clearCache: () => void;
  forceGarbageCollection: () => void;
  setMaxMemory: (bytes: number) => void;
  
  // Monitoring
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

export function useMemoryManager({
  warningThresholds = {
    low: 0.5,
    medium: 0.7,
    high: 0.85,
    critical: 0.95
  },
  checkInterval = 5000,
  onWarning,
  autoCleanup = true
}: UseMemoryManagerProps = {}): UseMemoryManagerReturn {
  const [usage, setUsage] = useState<MemoryUsage>({
    used: 0,
    max: 100 * 1024 * 1024, // 100MB default
    percentage: 0,
    humanReadable: {
      used: '0 MB',
      max: '100 MB'
    }
  });
  const [warning, setWarning] = useState<MemoryWarning | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const dataManagerRef = useRef<DataReferenceManager>();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastWarningLevelRef = useRef<string | null>(null);
  
  // Initialize data manager
  useEffect(() => {
    dataManagerRef.current = DataReferenceManager.getInstance();
  }, []);
  
  // Format bytes to human readable
  const formatBytes = useCallback((bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }, []);
  
  // Check memory usage
  const checkMemory = useCallback(() => {
    if (!dataManagerRef.current) return;
    
    const memoryInfo = dataManagerRef.current.getMemoryUsage();
    const percentage = (memoryInfo.used / memoryInfo.max) * 100;
    
    const newUsage: MemoryUsage = {
      used: memoryInfo.used,
      max: memoryInfo.max,
      percentage,
      humanReadable: {
        used: formatBytes(memoryInfo.used),
        max: formatBytes(memoryInfo.max)
      }
    };
    
    setUsage(newUsage);
    
    // Check warning levels
    let newWarning: MemoryWarning | null = null;
    
    if (percentage >= warningThresholds.critical * 100) {
      newWarning = {
        level: 'critical',
        message: `メモリ使用率が危険域に達しています (${percentage.toFixed(1)}%)`,
        threshold: warningThresholds.critical
      };
    } else if (percentage >= warningThresholds.high * 100) {
      newWarning = {
        level: 'high',
        message: `メモリ使用率が高くなっています (${percentage.toFixed(1)}%)`,
        threshold: warningThresholds.high
      };
    } else if (percentage >= warningThresholds.medium * 100) {
      newWarning = {
        level: 'medium',
        message: `メモリ使用率が中程度です (${percentage.toFixed(1)}%)`,
        threshold: warningThresholds.medium
      };
    } else if (percentage >= warningThresholds.low * 100) {
      newWarning = {
        level: 'low',
        message: `メモリ使用率が上昇しています (${percentage.toFixed(1)}%)`,
        threshold: warningThresholds.low
      };
    }
    
    setWarning(newWarning);
    
    // Trigger warning callback if level changed
    if (newWarning && newWarning.level !== lastWarningLevelRef.current) {
      lastWarningLevelRef.current = newWarning.level;
      onWarning?.(newWarning);
      
      // Auto cleanup on critical
      if (autoCleanup && newWarning.level === 'critical') {
        performAutoCleanup();
      }
    } else if (!newWarning) {
      lastWarningLevelRef.current = null;
    }
    
    // Also check browser memory if available
    if ('memory' in performance && (performance as any).memory) {
      const browserMemory = (performance as any).memory;
      console.debug('Browser memory:', {
        usedJSHeapSize: formatBytes(browserMemory.usedJSHeapSize),
        totalJSHeapSize: formatBytes(browserMemory.totalJSHeapSize),
        jsHeapSizeLimit: formatBytes(browserMemory.jsHeapSizeLimit)
      });
    }
  }, [warningThresholds, formatBytes, onWarning, autoCleanup]);
  
  // Auto cleanup when critical
  const performAutoCleanup = useCallback(() => {
    if (!dataManagerRef.current) return;
    
    console.warn('Performing automatic memory cleanup...');
    dataManagerRef.current.clearCache();
    
    // Force garbage collection if available (Chrome with --expose-gc flag)
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
    }
  }, []);
  
  // Manual controls
  const clearCache = useCallback(() => {
    if (!dataManagerRef.current) return;
    dataManagerRef.current.clearCache();
    checkMemory(); // Update usage immediately
  }, [checkMemory]);
  
  const forceGarbageCollection = useCallback(() => {
    // This only works in Chrome with --expose-gc flag
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
      console.log('Garbage collection triggered');
    } else {
      console.warn('Garbage collection not available. Run Chrome with --expose-gc flag.');
    }
  }, []);
  
  const setMaxMemory = useCallback((bytes: number) => {
    if (!dataManagerRef.current) return;
    
    // This would need to be implemented in DataReferenceManager
    // For now, we'll just update our local state
    setUsage(prev => ({
      ...prev,
      max: bytes,
      percentage: (prev.used / bytes) * 100,
      humanReadable: {
        ...prev.humanReadable,
        max: formatBytes(bytes)
      }
    }));
  }, [formatBytes]);
  
  // Monitoring controls
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;
    
    setIsMonitoring(true);
    checkMemory(); // Initial check
    
    intervalRef.current = setInterval(() => {
      checkMemory();
    }, checkInterval);
  }, [checkMemory, checkInterval]);
  
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);
  
  // Auto-start monitoring if requested
  useEffect(() => {
    if (autoCleanup) {
      startMonitoring();
    }
  }, [autoCleanup, startMonitoring]);
  
  return {
    usage,
    warning,
    clearCache,
    forceGarbageCollection,
    setMaxMemory,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  };
}