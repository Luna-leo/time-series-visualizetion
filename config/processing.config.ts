/**
 * Processing configuration for CSV parsing and merging
 * These values can be overridden by environment variables
 */

export interface ProcessingConfig {
  batchSizes: {
    csvParsing: number;      // Batch size for parsing CSV files
    merging: number;         // Batch size for merging files
    streaming: number;       // Batch size for streaming operations
    conversion: number;      // Batch size for format conversion
  };
  memory: {
    maxHeapUsage: number;    // Maximum heap usage in MB
    warningThreshold: number; // Warning threshold in MB
  };
  duckdb: {
    autoUseThreshold: {
      fileSize: number;      // File size threshold in MB
      fileCount: number;     // Number of files threshold
      recordCount: number;   // Estimated record count threshold
    };
  };
  progress: {
    updateInterval: number;  // Progress update interval in ms
  };
}

// Default configuration
export const defaultConfig: ProcessingConfig = {
  batchSizes: {
    csvParsing: parseInt(process.env.CSV_BATCH_SIZE || '1000'),
    merging: parseInt(process.env.MERGE_BATCH_SIZE || '5000'),
    streaming: parseInt(process.env.STREAM_BATCH_SIZE || '5000'),
    conversion: parseInt(process.env.CONVERT_BATCH_SIZE || '1000'),
  },
  memory: {
    maxHeapUsage: parseInt(process.env.MAX_HEAP_MB || '1000'),
    warningThreshold: parseInt(process.env.HEAP_WARNING_MB || '800'),
  },
  duckdb: {
    autoUseThreshold: {
      fileSize: parseInt(process.env.DUCKDB_FILE_SIZE_MB || '100'),
      fileCount: parseInt(process.env.DUCKDB_FILE_COUNT || '10'),
      recordCount: parseInt(process.env.DUCKDB_RECORD_COUNT || '500000'),
    },
  },
  progress: {
    updateInterval: parseInt(process.env.PROGRESS_INTERVAL_MS || '100'),
  },
};

/**
 * Get processing configuration with environment variable overrides
 */
export function getProcessingConfig(): ProcessingConfig {
  // In a real application, this could also read from a JSON file
  // or fetch from a configuration service
  return defaultConfig;
}

/**
 * Adjust batch sizes based on available memory
 */
export function adjustBatchSizesForMemory(
  config: ProcessingConfig,
  availableMemoryMB: number
): ProcessingConfig {
  const memoryRatio = availableMemoryMB / config.memory.maxHeapUsage;
  
  if (memoryRatio < 0.5) {
    // Low memory: reduce batch sizes
    return {
      ...config,
      batchSizes: {
        csvParsing: Math.floor(config.batchSizes.csvParsing * memoryRatio),
        merging: Math.floor(config.batchSizes.merging * memoryRatio),
        streaming: Math.floor(config.batchSizes.streaming * memoryRatio),
        conversion: Math.floor(config.batchSizes.conversion * memoryRatio),
      },
    };
  }
  
  return config;
}