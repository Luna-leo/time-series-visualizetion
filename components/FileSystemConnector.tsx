import React, { useState } from 'react';
import { FolderOpen, Check } from 'lucide-react';
import { Button } from './common/Button';
import { FileSystemManager } from '@/lib/fileSystem/fileSystemManager';
import { StorageManager } from '@/services/StorageManager';
import { MetadataManager } from '@/services/MetadataManager';
import { DatabaseManager } from '@/services/DatabaseManager';
import { DuckDBManager } from '@/lib/duckdb/duckdbManager';

interface FileSystemConnectorProps {
  onConnected: (
    rootHandle: FileSystemDirectoryHandle,
    managers: {
      storageManager: StorageManager;
      metadataManager: MetadataManager;
      fileSystemManager: FileSystemManager;
      databaseManager: DatabaseManager;
    }
  ) => void;
  onError: (error: string) => void;
}

export function FileSystemConnector({ onConnected, onError }: FileSystemConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [directoryName, setDirectoryName] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Check browser compatibility
      if (!('showDirectoryPicker' in window)) {
        throw new Error('Your browser does not support the File System Access API. Please use Chrome or Edge.');
      }

      // Request directory access
      const directoryHandle = await (window as Window & { showDirectoryPicker: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
        mode: 'readwrite'
      });

      // Initialize managers
      const fileSystemManager = new FileSystemManager();
      await fileSystemManager.initialize();
      
      // Initialize DuckDB
      const duckdbManager = new DuckDBManager(fileSystemManager);
      await duckdbManager.initialize();
      
      const storageManager = new StorageManager();
      storageManager.setFileSystemManager(fileSystemManager);
      storageManager.setDuckDBManager(duckdbManager);
      storageManager.setRootHandle(directoryHandle);
      
      const metadataManager = new MetadataManager();
      const databaseManager = new DatabaseManager();

      // Store directory name
      setDirectoryName(directoryHandle.name);
      setIsConnected(true);

      // Notify parent
      onConnected(directoryHandle, {
        storageManager,
        metadataManager,
        fileSystemManager,
        databaseManager
      });

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // User cancelled the picker
          return;
        }
        onError(err.message);
      } else {
        onError('Failed to connect to file system');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isConnected ? (
        <>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            {isConnecting ? '接続中...' : 'ディレクトリを選択'}
          </Button>
          
          <div className="text-xs text-gray-600 space-y-1">
            <p>• データを保存するディレクトリを選択してください</p>
            <p>• Parquet形式でデータが保存されます</p>
            <p>• 大規模データの効率的な管理が可能です</p>
          </div>
        </>
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">接続済み</p>
              <p className="text-sm text-green-700">{directoryName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}