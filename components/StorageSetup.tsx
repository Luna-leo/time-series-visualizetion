'use client';

import React, { useState, useEffect } from 'react';
import { FileSystemManager } from '../lib/fileSystem/fileSystemManager';
import { DuckDBManager } from '../lib/duckdb/duckdbManager';
import type { StorageConfig } from '../types/fileSystem';
import { useFileSystemSettings } from '../hooks/useSettings';

interface StorageSetupProps {
  onSetupComplete: (config: {
    fileSystemManager: FileSystemManager;
    duckdbManager: DuckDBManager;
  }) => void;
  fileSystemManager: FileSystemManager | null;
  duckdbManager: DuckDBManager | null;
  lastUsedDirectory: { name: string; lastAccessTime: string } | null;
  canReconnect: boolean;
  onReconnect: () => Promise<void>;
}

export const StorageSetup: React.FC<StorageSetupProps> = ({ 
  onSetupComplete,
  fileSystemManager,
  duckdbManager,
  lastUsedDirectory,
  canReconnect,
  onReconnect
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageConfig, setStorageConfig] = useState<StorageConfig | null>(null);
  const [setupProgress, setSetupProgress] = useState<{
    step: string;
    progress: number;
  }>({ step: '', progress: 0 });
  const { fileSystemSettings, updateFileSystemSettings } = useFileSystemSettings();

  // Check for browser compatibility
  useEffect(() => {
    if (!('showDirectoryPicker' in window)) {
      setError('Your browser does not support the File System Access API. Please use Chrome, Edge, or another compatible browser.');
    }
  }, []);

  const handleSelectDirectory = async (useNewDirectory = true) => {
    setIsLoading(true);
    setError(null);

    try {
      let fsManager = fileSystemManager;
      let dbManager = duckdbManager;

      if (useNewDirectory || !fsManager || !dbManager) {
        // Step 1: Initialize file system
        setSetupProgress({ step: 'Selecting directory...', progress: 10 });
        fsManager = new FileSystemManager();
        const config = await fsManager.initialize();
        setStorageConfig(config);

        // Step 2: Check permissions
        setSetupProgress({ step: 'Checking permissions...', progress: 30 });
        const permissions = await fsManager.checkPermissions();
        if (!permissions.canWrite) {
          throw new Error('Write permission denied. Please grant permission to save data.');
        }

        // Step 3: Initialize DuckDB
        setSetupProgress({ step: 'Initializing DuckDB...', progress: 50 });
        dbManager = new DuckDBManager(fsManager);
        await dbManager.initialize();
      }

      // Step 4: Scan existing data
      setSetupProgress({ step: 'Scanning existing data...', progress: 80 });
      const storageInfo = await fsManager!.getStorageInfo();
      console.log('Storage info:', storageInfo);

      // Complete setup
      setSetupProgress({ step: 'Setup complete!', progress: 100 });
      
      // Notify parent component
      setTimeout(() => {
        onSetupComplete({ fileSystemManager: fsManager!, duckdbManager: dbManager! });
      }, 500);

    } catch (err) {
      console.error('Setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to setup storage');
      setStorageConfig(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      setSetupProgress({ step: 'Reconnecting to previous directory...', progress: 50 });
      await onReconnect();
    } catch (err) {
      console.error('Reconnect error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reconnect');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          {!error.includes('browser') && (
            <button
              onClick={() => handleSelectDirectory()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          )}
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <p className="text-lg font-medium mb-2">{setupProgress.step}</p>
          <div className="w-64 mx-auto bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${setupProgress.progress}%` }}
            ></div>
          </div>
        </div>
      );
    }

    if (storageConfig?.isInitialized) {
      return (
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-green-600">Storage initialized!</p>
          <p className="text-sm text-gray-600 mt-2">Location: {storageConfig.storagePath}</p>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="mb-8">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Setup Local Storage</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Select a folder on your computer where time series data will be stored. 
          This folder will contain Parquet files organized by machine.
        </p>
        
        {/* Show reconnect option if available */}
        {canReconnect && lastUsedDirectory && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              Previously used directory:
            </p>
            <p className="font-medium text-blue-700 mb-3">
              {lastUsedDirectory.name}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Last accessed: {new Date(lastUsedDirectory.lastAccessTime).toLocaleString()}
            </p>
            <button
              onClick={handleReconnect}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Use Previous Directory
            </button>
          </div>
        )}
        
        <button
          onClick={() => handleSelectDirectory()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {canReconnect ? 'Select New Directory' : 'Select Storage Folder'}
        </button>
        
        {/* Settings for auto-reconnect */}
        <div className="mt-6">
          <label className="inline-flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={fileSystemSettings.autoReconnect}
              onChange={(e) => updateFileSystemSettings({ autoReconnect: e.target.checked })}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Remember this directory for next time
          </label>
        </div>
        
        <div className="mt-8 text-xs text-gray-500">
          <p>Your data remains on your computer and is never uploaded.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
        {renderContent()}
      </div>
    </div>
  );
};