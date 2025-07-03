import { useState, useEffect } from 'react';
import { FileSystemManager } from '../lib/fileSystem/fileSystemManager';
import { DuckDBManager } from '../lib/duckdb/duckdbManager';

interface LocalStorageState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  fileSystemManager: FileSystemManager | null;
  duckdbManager: DuckDBManager | null;
}

export function useLocalStorage() {
  const [state, setState] = useState<LocalStorageState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    fileSystemManager: null,
    duckdbManager: null,
  });

  // Initialize managers
  const initialize = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create managers
      const fileSystemManager = new FileSystemManager();
      const duckdbManager = new DuckDBManager(fileSystemManager);

      // Check if already initialized (from session storage)
      const savedConfig = sessionStorage.getItem('storageConfig');
      if (savedConfig) {
        // TODO: Restore from saved config
      }

      setState({
        isInitialized: false,
        isLoading: false,
        error: null,
        fileSystemManager,
        duckdbManager,
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
    setState({
      isInitialized: true,
      isLoading: false,
      error: null,
      ...config,
    });

    // Save config to session storage
    sessionStorage.setItem('storageConfig', JSON.stringify({
      initialized: true,
      timestamp: new Date().toISOString(),
    }));
  };

  // Reset storage
  const resetStorage = () => {
    sessionStorage.removeItem('storageConfig');
    setState({
      isInitialized: false,
      isLoading: false,
      error: null,
      fileSystemManager: null,
      duckdbManager: null,
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
  };
}