# Time Series Visualization

A web application for visualizing time series data from CSV files with support for large datasets and multiple file merging.

## Features

- 📊 Interactive time series visualization using uPlot
- 📁 Multiple CSV file upload and automatic merging
- 🗜️ Efficient data storage using Parquet format with DuckDB
- 🌐 Support for Japanese encoding (Shift-JIS, EUC-JP, JIS)
- 💾 Large dataset handling with streaming and chunked processing
- ⚡ Automatic optimization for datasets based on size
- 🔧 Configurable processing parameters via environment variables

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd time-series-visualization

# Install dependencies
npm install
# or
yarn install
```

### Running the Application

```bash
# Development mode
npm run dev
# or
yarn dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## CSV File Format

The application expects CSV files with the following structure:

```csv
timestamp,PARAM001,PARAM002,PARAM003
タイムスタンプ,温度,圧力,流量
,°C,kPa,L/min
2024-01-01T00:00:00,25.5,101.3,10.2
2024-01-01T00:01:00,25.6,101.4,10.3
```

- Row 1: Parameter IDs
- Row 2: Parameter names (Japanese supported)
- Row 3: Units
- Row 4+: Data rows with ISO 8601 timestamps

## Configuration

### Environment Variables

Configure processing behavior using environment variables:

#### Batch Sizes
- `CSV_BATCH_SIZE` - Rows processed at once during CSV parsing (default: 1000)
- `MERGE_BATCH_SIZE` - Records processed during file merging (default: 5000)
- `STREAM_BATCH_SIZE` - Batch size for streaming operations (default: 5000)
- `CONVERT_BATCH_SIZE` - Batch size for format conversion (default: 1000)

#### Memory Management
- `MAX_HEAP_MB` - Maximum heap memory usage in MB (default: 1000)
- `HEAP_WARNING_MB` - Memory warning threshold in MB (default: 800)

#### DuckDB Integration
- `DUCKDB_FILE_SIZE_MB` - File size threshold for automatic DuckDB usage (default: 100)
- `DUCKDB_FILE_COUNT` - File count threshold for DuckDB (default: 10)
- `DUCKDB_RECORD_COUNT` - Record count threshold (default: 500000)

#### Other
- `PROGRESS_INTERVAL_MS` - Progress update interval in ms (default: 100)

### Usage Examples

#### Memory-Constrained Environment
```bash
# Reduce batch sizes for systems with limited memory
CSV_BATCH_SIZE=500 MERGE_BATCH_SIZE=2000 npm run dev
```

#### Large Dataset Processing
```bash
# Increase memory limits and batch sizes for large files
MAX_HEAP_MB=2000 MERGE_BATCH_SIZE=10000 npm run dev
```

#### Force DuckDB for Smaller Files
```bash
# Use DuckDB for files larger than 50MB
DUCKDB_FILE_SIZE_MB=50 npm run dev
```

#### Production Deployment
```bash
# Optimized settings for production
MAX_HEAP_MB=4000 \
MERGE_BATCH_SIZE=20000 \
DUCKDB_FILE_SIZE_MB=75 \
npm start
```

## Performance Guidelines

### File Size Limits
- **Single file**: Up to 50MB per file
- **Multiple files**: Up to 200MB total (JavaScript processing)
- **With DuckDB**: 1GB+ supported

### Optimization Tips
1. **For 10+ files**: The system automatically uses DuckDB for better performance
2. **For 100MB+ total size**: DuckDB is automatically enabled
3. **For memory-limited systems**: Reduce batch sizes using environment variables
4. **For maximum performance**: Increase batch sizes and memory limits

### Processing Modes
The application automatically selects the best processing mode:

1. **Standard Mode** (< 100MB, < 10 files)
   - JavaScript-based processing
   - Good for small to medium datasets

2. **Streaming Mode** (Medium datasets)
   - Chunked processing to reduce memory usage
   - Progress tracking with memory monitoring

3. **DuckDB Mode** (> 100MB or > 10 files)
   - SQL-based processing
   - Handles very large datasets efficiently
   - Automatic deduplication

## Troubleshooting

### "Files are too large to process" Error
This error occurs when the dataset exceeds memory limits. Solutions:

1. **Reduce batch sizes**:
   ```bash
   CSV_BATCH_SIZE=500 MERGE_BATCH_SIZE=2000 npm run dev
   ```

2. **Enable DuckDB for smaller files**:
   ```bash
   DUCKDB_FILE_SIZE_MB=50 npm run dev
   ```

3. **Split your data** into smaller time ranges or fewer parameters

### Memory Issues
Monitor memory usage and adjust configuration:

```bash
# For 512MB available memory
MAX_HEAP_MB=400 HEAP_WARNING_MB=350 npm run dev
```

### Encoding Problems
The application auto-detects encoding, but you can specify it manually in the UI:
- UTF-8 (default)
- Shift-JIS (SJIS)
- EUC-JP
- JIS

## Development

### Project Structure
```
├── app/              # Next.js app directory
├── components/       # React components
├── config/          # Configuration files
├── hooks/           # Custom React hooks
├── lib/             # Core libraries (DuckDB, FileSystem)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── public/          # Static assets
```

### Key Technologies
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **uPlot** - High-performance charts
- **DuckDB-WASM** - In-browser SQL database
- **Apache Parquet** - Columnar storage format
- **IndexedDB** - Browser storage

## License

[Your License Here]

## Contributing

[Contributing guidelines if applicable]