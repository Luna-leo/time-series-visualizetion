# Processing Configuration

This directory contains configuration files for the CSV processing system.

## Environment Variables

You can override the default configuration values using environment variables:

### Batch Sizes
- `CSV_BATCH_SIZE` - Number of rows to process at once when parsing CSV files (default: 1000)
- `MERGE_BATCH_SIZE` - Number of records to process when merging files (default: 5000)
- `STREAM_BATCH_SIZE` - Batch size for streaming operations (default: 5000)
- `CONVERT_BATCH_SIZE` - Batch size for format conversion (default: 1000)

### Memory Management
- `MAX_HEAP_MB` - Maximum heap memory usage in MB (default: 1000)
- `HEAP_WARNING_MB` - Memory usage warning threshold in MB (default: 800)

### DuckDB Auto-Use Thresholds
- `DUCKDB_FILE_SIZE_MB` - File size threshold for automatic DuckDB usage (default: 100)
- `DUCKDB_FILE_COUNT` - Number of files threshold (default: 10)
- `DUCKDB_RECORD_COUNT` - Estimated record count threshold (default: 500000)

### Progress Updates
- `PROGRESS_INTERVAL_MS` - Progress update interval in milliseconds (default: 100)

## Example Usage

```bash
# Use smaller batch sizes for memory-constrained environments
CSV_BATCH_SIZE=500 MERGE_BATCH_SIZE=2000 npm run dev

# Force DuckDB usage for smaller files
DUCKDB_FILE_SIZE_MB=50 npm run dev

# Increase memory limits for large datasets
MAX_HEAP_MB=2000 npm run dev
```

## Configuration in Code

You can also programmatically adjust the configuration:

```typescript
import { getProcessingConfig, adjustBatchSizesForMemory } from './config/processing.config';

// Get current configuration
const config = getProcessingConfig();

// Adjust for available memory
const availableMemory = 500; // MB
const adjustedConfig = adjustBatchSizesForMemory(config, availableMemory);
```