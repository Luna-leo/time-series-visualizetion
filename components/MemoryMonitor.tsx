import React from 'react';
import { useMemoryManager } from '@/hooks/useMemoryManager';
import { AlertTriangle, Trash2, Activity, AlertCircle } from 'lucide-react';
import { Button } from './common/Button';

interface MemoryMonitorProps {
  onWarning?: (message: string) => void;
  compact?: boolean;
}

export function MemoryMonitor({ onWarning, compact = false }: MemoryMonitorProps) {
  const {
    usage,
    warning,
    clearCache,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  } = useMemoryManager({
    onWarning: (warn) => onWarning?.(warn.message),
    autoCleanup: true
  });

  const getProgressColor = () => {
    if (usage.percentage >= 95) return 'bg-red-600';
    if (usage.percentage >= 85) return 'bg-orange-600';
    if (usage.percentage >= 70) return 'bg-yellow-600';
    if (usage.percentage >= 50) return 'bg-blue-600';
    return 'bg-green-600';
  };

  const getWarningIcon = () => {
    if (!warning) return null;
    
    switch (warning.level) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4 text-blue-600" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
        <Activity className={`w-4 h-4 ${isMonitoring ? 'text-green-600' : 'text-gray-400'}`} />
        <div className="flex-1">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${usage.percentage}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-gray-600">
          {usage.humanReadable.used} / {usage.humanReadable.max}
        </span>
        {getWarningIcon()}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Activity className={`w-5 h-5 ${isMonitoring ? 'text-green-600' : 'text-gray-400'}`} />
          <span>メモリ使用状況</span>
        </h3>
        <div className="flex items-center space-x-2">
          {warning && getWarningIcon()}
          <Button
            size="sm"
            variant="outline"
            onClick={() => isMonitoring ? stopMonitoring() : startMonitoring()}
          >
            {isMonitoring ? '停止' : '開始'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearCache}
            title="キャッシュをクリア"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">使用量</span>
          <span className="font-medium">
            {usage.humanReadable.used} / {usage.humanReadable.max} ({usage.percentage.toFixed(1)}%)
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${usage.percentage}%` }}
          />
        </div>

        {warning && (
          <div className={`p-2 rounded-md text-sm flex items-center space-x-2 ${
            warning.level === 'critical' ? 'bg-red-50 text-red-800' :
            warning.level === 'high' ? 'bg-orange-50 text-orange-800' :
            warning.level === 'medium' ? 'bg-yellow-50 text-yellow-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {getWarningIcon()}
            <span>{warning.message}</span>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• データは必要に応じて自動的にロード/アンロードされます</p>
        <p>• メモリ使用率が95%を超えると自動的にキャッシュがクリアされます</p>
      </div>
    </div>
  );
}