'use client';

import React, { useState, useCallback } from 'react';
import { useOptimizedCSVData } from '@/hooks/useOptimizedCSVData';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/common/Toast';
import { OptimizedParameterSelector } from '@/components/OptimizedParameterSelector';
import { OptimizedChartItem } from '@/components/OptimizedChartItem';
import { MemoryMonitor } from '@/components/MemoryMonitor';
import { PersistenceIndicator } from '@/components/PersistenceIndicator';
import { FileUploadButton } from '@/components/FileUploadButton';
import { FileSystemConnector } from '@/components/FileSystemConnector';
import { StorageManager } from '@/services/StorageManager';
import { MetadataManager } from '@/services/MetadataManager';
import { FileSystemManager } from '@/services/FileSystemManager';
import { DatabaseManager } from '@/services/DatabaseManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FolderOpen } from 'lucide-react';

interface ChartReference {
  id: number;
  title: string;
  dataReferenceId: string;
  parameterIds: string[];
  labels: string[];
  layout?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export default function OptimizedPage() {
  const { toast, showToast } = useToast();
  const [charts, setCharts] = useState<ChartReference[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  
  const {
    dataReferences,
    currentMetadata,
    availableParameters,
    loadCSVFiles,
    createChart,
    isLoading,
    setStorageManager,
    setMetadataManager,
    setFileSystemManager,
    setDatabaseManager,
    persistenceStatus
  } = useOptimizedCSVData(showToast);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    await loadCSVFiles(files);
  }, [loadCSVFiles]);

  // Handle chart creation from parameter selector
  const handleCreateChart = useCallback(async (parameterIds: string[], chartTitle?: string) => {
    const chart = await createChart(parameterIds, { title: chartTitle });
    
    if (chart && currentMetadata) {
      const chartRef: ChartReference = {
        id: chart.id,
        title: chart.title || 'Time Series Chart',
        dataReferenceId: currentMetadata.dataReference,
        parameterIds,
        labels: chart.labels,
        layout: chart.layout,
        config: chart.config
      };
      
      setCharts(prev => [...prev, chartRef]);
    }
  }, [createChart, currentMetadata]);

  // Handle chart removal
  const handleRemoveChart = useCallback((chartId: number) => {
    setCharts(prev => prev.filter(c => c.id !== chartId));
  }, []);

  // Handle file system connection
  const handleFileSystemConnected = useCallback((
    rootHandle: FileSystemDirectoryHandle,
    managers: {
      storageManager: StorageManager;
      metadataManager: MetadataManager;
      fileSystemManager: FileSystemManager;
      databaseManager: DatabaseManager;
    }
  ) => {
    setStorageManager(managers.storageManager);
    setMetadataManager(managers.metadataManager);
    setFileSystemManager(managers.fileSystemManager);
    setDatabaseManager(managers.databaseManager);
    showToast('ファイルシステムに接続しました', 'success');
  }, [setStorageManager, setMetadataManager, setFileSystemManager, setDatabaseManager, showToast]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold">時系列データ可視化 (最適化版)</h1>
            <MemoryMonitor compact onWarning={showToast} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Data source tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  アップロード
                </TabsTrigger>
                <TabsTrigger value="filesystem">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  ファイルシステム
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <FileUploadButton
                  onFileSelect={handleFileUpload}
                  accept=".csv"
                  multiple
                  disabled={isLoading}
                  className="w-full"
                />
                {dataReferences.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      {dataReferences.length} ファイル読み込み済み
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      合計 {dataReferences.reduce((sum, ref) => sum + ref.totalRows, 0).toLocaleString()} 行
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="filesystem">
                <FileSystemConnector
                  onConnected={handleFileSystemConnected}
                  onError={(error) => showToast(error, 'error')}
                />
              </TabsContent>
            </Tabs>

            {/* Parameter selector */}
            {availableParameters.length > 0 && (
              <div className="bg-white rounded-lg shadow h-[600px]">
                <OptimizedParameterSelector
                  parameters={availableParameters}
                  onCreateChart={handleCreateChart}
                />
              </div>
            )}

            {/* Memory monitor */}
            <MemoryMonitor onWarning={showToast} />
          </div>

          {/* Chart area */}
          <div className="lg:col-span-3">
            {charts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500 mb-4">
                  チャートがありません。左のパネルからデータをアップロードしてパラメータを選択してください。
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>✓ メモリ効率的なデータ管理</p>
                  <p>✓ 必要なデータのみをオンデマンドでロード</p>
                  <p>✓ 自動ダウンサンプリングとデータウィンドウ管理</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {charts.map(chart => (
                  <OptimizedChartItem
                    key={chart.id}
                    metadata={chart}
                    onRemove={handleRemoveChart}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Toast notifications */}
      {toast && <Toast {...toast} />}
      
      {/* Persistence indicator */}
      <PersistenceIndicator status={persistenceStatus} />
    </div>
  );
}