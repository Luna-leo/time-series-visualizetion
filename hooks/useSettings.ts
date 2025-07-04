/**
 * React hook for managing application settings
 */

import { useState, useEffect, useCallback } from 'react';
import { SettingsManager } from '../lib/settings/settingsManager';
import { AppSettings } from '../types/settings';

export function useSettings() {
  const settingsManager = SettingsManager.getInstance();
  const [settings, setSettings] = useState<AppSettings>(settingsManager.getSettings());

  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = settingsManager.subscribe((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, [settingsManager]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    settingsManager.update(updates);
  }, [settingsManager]);

  const setSetting = useCallback((path: string, value: any) => {
    settingsManager.set(path, value);
  }, [settingsManager]);

  const getSetting = useCallback(<T>(path: string): T | undefined => {
    return settingsManager.get<T>(path);
  }, [settingsManager]);

  const resetSettings = useCallback(() => {
    settingsManager.reset();
  }, [settingsManager]);

  const resetSection = useCallback((section: keyof AppSettings) => {
    settingsManager.resetSection(section);
  }, [settingsManager]);

  const exportSettings = useCallback((): string => {
    return settingsManager.export();
  }, [settingsManager]);

  const importSettings = useCallback((json: string): boolean => {
    return settingsManager.import(json);
  }, [settingsManager]);

  return {
    settings,
    updateSettings,
    setSetting,
    getSetting,
    resetSettings,
    resetSection,
    exportSettings,
    importSettings,
  };
}

/**
 * Hook for file system settings
 */
export function useFileSystemSettings() {
  const settingsManager = SettingsManager.getInstance();
  const [fileSystemSettings, setFileSystemSettings] = useState(
    settingsManager.getFileSystemSettings()
  );

  useEffect(() => {
    const unsubscribe = settingsManager.subscribe((newSettings) => {
      setFileSystemSettings(newSettings.fileSystem);
    });

    return unsubscribe;
  }, [settingsManager]);

  const updateFileSystemSettings = useCallback((updates: Partial<typeof fileSystemSettings>) => {
    settingsManager.updateFileSystemSettings(updates);
  }, [settingsManager]);

  const setLastUsedDirectory = useCallback((directoryName: string) => {
    settingsManager.updateFileSystemSettings({
      lastUsedDirectoryName: directoryName,
      lastAccessTime: new Date().toISOString(),
    });
  }, [settingsManager]);

  const clearLastUsedDirectory = useCallback(() => {
    settingsManager.updateFileSystemSettings({
      lastUsedDirectoryName: undefined,
      lastAccessTime: undefined,
    });
  }, [settingsManager]);

  return {
    fileSystemSettings,
    updateFileSystemSettings,
    setLastUsedDirectory,
    clearLastUsedDirectory,
  };
}