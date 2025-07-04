import { useState, useEffect, useCallback } from 'react';
import { FileSystemManager } from '../lib/fileSystem/fileSystemManager';
import { DuckDBManager } from '../lib/duckdb/duckdbManager';
import { useFileSystemSettings } from './useSettings';

interface LocalStorageState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  fileSystemManager: FileSystemManager | null;
  duckdbManager: DuckDBManager | null;
  lastUsedDirectory: { name: string; lastAccessTime: string } | null;
  canReconnect: boolean;
}

export function useLocalStorage() {
  const { fileSystemSettings } = useFileSystemSettings();
  const [state, setState] = useState<LocalStorageState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    fileSystemManager: null,
    duckdbManager: null,
    lastUsedDirectory: null,
    canReconnect: false,
  });

  // Initialize managers
  const initialize = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create managers
      const fileSystemManager = new FileSystemManager();
      const duckdbManager = new DuckDBManager(fileSystemManager);

      // Check for last used directory
      const lastUsedInfo = fileSystemManager.getLastUsedDirectoryInfo();
      const canReconnect = lastUsedInfo !== null && fileSystemSettings.autoReconnect;

      setState({
        isInitialized: false,
        isLoading: false,
        error: null,
        fileSystemManager,
        duckdbManager,
        lastUsedDirectory: lastUsedInfo,
        canReconnect,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize storage',
      }));
    }
  };

  // Setup storage with user-selected directory
  const setupStorage = async (config: {
    fileSystemManager: FileSystemManager;
    duckdbManager: DuckDBManager;
  }) => {
    setState(prev => ({
      ...prev,
      isInitialized: true,
      isLoading: false,
      error: null,
      fileSystemManager: config.fileSystemManager,
      duckdbManager: config.duckdbManager,
    }));

    // Save config to session storage
    sessionStorage.setItem('storageConfig', JSON.stringify({
      initialized: true,
      timestamp: new Date().toISOString(),
    }));
  };

  // Try to reconnect to previous directory
  const reconnectToLastDirectory = useCallback(async () => {
    if (!state.fileSystemManager || !state.lastUsedDirectory) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // First try to use the persisted handle
      const config = await state.fileSystemManager.tryReconnect();
      
      if (config) {
        // Successfully reconnected using persisted handle
        setState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          error: null,
        }));

        // Initialize DuckDB
        if (state.duckdbManager) {
          await state.duckdbManager.initialize();
        }
      } else {
        // Persisted handle didn't work, prompt user to re-select
        const handle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'documents',
        });

        // Use the selected directory
        const newConfig = await state.fileSystemManager.initializeWithHandle(handle);
        
        setState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          error: null,
        }));

        // Initialize DuckDB
        if (state.duckdbManager) {
          await state.duckdbManager.initialize();
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to reconnect',
      }));
    }
  }, [state.fileSystemManager, state.duckdbManager, state.lastUsedDirectory]);

  // Reset storage
  const resetStorage = () => {
    sessionStorage.removeItem('storageConfig');
    
    // Clear stored directory info
    if (state.fileSystemManager) {
      state.fileSystemManager.clearStoredDirectoryInfo();
    }

    setState({
      isInitialized: false,
      isLoading: false,
      error: null,
      fileSystemManager: null,
      duckdbManager: null,
      lastUsedDirectory: null,
      canReconnect: false,
    });
  };

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.duckdbManager) {
        state.duckdbManager.cleanup().catch(console.error);
      }
    };
  }, [state.duckdbManager]);

  return {
    ...state,
    setupStorage,
    resetStorage,
    reconnectToLastDirectory,
  };
}