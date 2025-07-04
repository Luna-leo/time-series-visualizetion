import React, { useState, useEffect, useCallback, memo } from 'react';
import { ChartMetadata } from '@/types/chart';
import { DataResponse } from '@/types/dataReference';
import { useDataWindow } from '@/hooks/useDataWindow';
import { MultiSeriesTimeSeriesChart } from './MultiSeriesTimeSeriesChart';
// import { ChartControls } from './ChartControls';
import { Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import { Button } from './common/Button';

interface OptimizedChartItemProps {
  metadata: {
    id: number;
    title: string;
    dataReferenceId: string;
    parameterIds: string[];
    labels: string[];
    layout?: Record<string, unknown>;
    config?: Record<string, unknown>;
  };
  onRemove: (id: number) => void;
  onConfigChange?: (id: number, config: Record<string, unknown>) => void;
}

export const OptimizedChartItem = memo(function OptimizedChartItem({
  metadata,
  onRemove,
  onConfigChange
}: OptimizedChartItemProps) {
  const [chartData, setChartData] = useState<ChartMetadata | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const {
    data,
    window,
    isLoading,
    error,
    zoomIn,
    zoomOut,
    pan,
    reset,
    setDownsampleMethod
  } = useDataWindow({
    dataReferenceId: metadata.dataReferenceId,
    parameterIds: metadata.parameterIds,
    initialWindow: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date(),
      targetPoints: 800 // Optimal for chart rendering
    },
    onDataLoaded: (response) => {
      // Convert response to chart format
      const convertedData = convertDataToChartFormat(response, metadata);
      setChartData(convertedData);
    }
  });

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`chart-${metadata.id}`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [metadata.id]);

  const convertDataToChartFormat = (response: DataResponse, meta: typeof metadata): ChartMetadata => {
    const { chunks } = response;
    if (chunks.length === 0) {
      return {
        id: meta.id,
        data: [],
        labels: [],
        title: meta.title
      };
    }

    // Use first chunk's timestamps
    const timestamps = chunks[0].timestamps;
    const data = [timestamps];
    const labels = ['Timestamp'];

    // Add each parameter's data
    chunks.forEach((chunk, index) => {
      data.push(chunk.values);
      labels.push(meta.labels[index + 1] || `Parameter ${index + 1}`);
    });

    return {
      id: meta.id,
      data,
      labels,
      title: meta.title,
      layout: meta.layout,
      config: meta.config
    };
  };

  const handleRemove = useCallback(() => {
    onRemove(metadata.id);
  }, [metadata.id, onRemove]);

  const handleDownsampleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setDownsampleMethod(e.target.value as 'average' | 'min' | 'max' | 'first' | 'last');
  }, [setDownsampleMethod]);

  return (
    <div
      id={`chart-${metadata.id}`}
      className="bg-white rounded-lg shadow-md p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{metadata.title}</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRemove}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Window controls */}
      <div className="flex items-center space-x-2 text-sm">
        <Button size="sm" variant="outline" onClick={() => zoomIn()}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => zoomOut()}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => pan('left')}>
          ←
        </Button>
        <Button size="sm" variant="outline" onClick={() => pan('right')}>
          →
        </Button>
        <Button size="sm" variant="outline" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <div className="flex-1" />
        
        <select
          className="px-2 py-1 border border-gray-300 rounded text-sm"
          onChange={handleDownsampleChange}
          defaultValue="average"
        >
          <option value="average">平均</option>
          <option value="min">最小</option>
          <option value="max">最大</option>
          <option value="first">最初</option>
          <option value="last">最後</option>
        </select>
        
        <span className="text-gray-600">
          {window.start.toLocaleDateString()} - {window.end.toLocaleDateString()}
        </span>
      </div>

      {/* Chart area */}
      <div className="relative h-96">
        {!isVisible ? (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded">
            <p className="text-gray-500">スクロールしてチャートを表示</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">データを読み込んでいます...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <span className="ml-2 text-red-600">{error.message}</span>
          </div>
        ) : chartData ? (
          <MultiSeriesTimeSeriesChart
            chart={chartData}
            onChange={(updates) => {
              onConfigChange?.(metadata.id, updates);
            }}
          />
        ) : null}
      </div>

      {/* Info footer */}
      {data && (
        <div className="text-xs text-gray-500 flex justify-between">
          <span>
            {data.metadata.actualPoints.toLocaleString()} / {data.metadata.totalPoints.toLocaleString()} ポイント
          </span>
          {data.metadata.downsampled && (
            <span className="text-orange-600">ダウンサンプル済み</span>
          )}
        </div>
      )}
    </div>
  );
});