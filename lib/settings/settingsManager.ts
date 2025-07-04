/**
 * Settings Manager
 * Handles persistent storage of application settings using localStorage
 */

import { AppSettings, DEFAULT_SETTINGS } from '../../types/settings';

const SETTINGS_KEY = 'time-series-viz-settings';
const SETTINGS_VERSION = '1.0.0';

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: AppSettings;
  private listeners: Set<(settings: AppSettings) => void> = new Set();

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): AppSettings {
    try {
      // Check if running in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return { ...DEFAULT_SETTINGS };
      }

      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) {
        return { ...DEFAULT_SETTINGS };
      }

      const parsed = JSON.parse(stored);
      
      // Check version and migrate if needed
      if (parsed.version !== SETTINGS_VERSION) {
        return this.migrateSettings(parsed);
      }

      // Merge with defaults to ensure all fields exist
      return this.mergeWithDefaults(parsed);
    } catch (error) {
      console.error('Failed to load settings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      // Check if running in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Migrate settings from older versions
   */
  private migrateSettings(oldSettings: any): AppSettings {
    // Implement migration logic here when needed
    console.log('Migrating settings from version:', oldSettings.version);
    return this.mergeWithDefaults(oldSettings);
  }

  /**
   * Merge settings with defaults
   */
  private mergeWithDefaults(settings: Partial<AppSettings>): AppSettings {
    return {
      version: SETTINGS_VERSION,
      fileSystem: {
        ...DEFAULT_SETTINGS.fileSystem,
        ...settings.fileSystem,
      },
      chart: {
        ...DEFAULT_SETTINGS.chart,
        ...settings.chart,
      },
      dataQuery: {
        ...DEFAULT_SETTINGS.dataQuery,
        ...settings.dataQuery,
      },
      ui: {
        ...DEFAULT_SETTINGS.ui,
        ...settings.ui,
      },
      import: {
        ...DEFAULT_SETTINGS.import,
        ...settings.import,
      },
    };
  }

  /**
   * Get all settings
   */
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Get a specific setting by path
   */
  get<T>(path: string): T | undefined {
    const keys = path.split('.');
    let value: any = this.settings;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value as T;
  }

  /**
   * Update a specific setting
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let target: any = this.settings;

    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }

    target[lastKey] = value;
    this.saveSettings();
  }

  /**
   * Update multiple settings
   */
  update(updates: Partial<AppSettings>): void {
    this.settings = this.mergeWithDefaults({
      ...this.settings,
      ...updates,
    });
    this.saveSettings();
  }

  /**
   * Reset settings to defaults
   */
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }

  /**
   * Reset a specific section
   */
  resetSection(section: keyof AppSettings): void {
    if (section === 'version') {
      this.settings.version = DEFAULT_SETTINGS.version;
    } else {
      const defaultValue = DEFAULT_SETTINGS[section as keyof Omit<AppSettings, 'version'>];
      (this.settings as any)[section] = { ...defaultValue };
    }
    this.saveSettings();
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of settings changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.getSettings());
    });
  }

  /**
   * Export settings as JSON
   */
  export(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON
   */
  import(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      this.settings = this.mergeWithDefaults(imported);
      this.saveSettings();
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    const value = this.get<boolean>(feature);
    return value === true;
  }

  /**
   * Get file system settings
   */
  getFileSystemSettings() {
    return { ...this.settings.fileSystem };
  }

  /**
   * Update file system settings
   */
  updateFileSystemSettings(updates: Partial<typeof this.settings.fileSystem>) {
    this.settings.fileSystem = {
      ...this.settings.fileSystem,
      ...updates,
    };
    this.saveSettings();
  }

  /**
   * Get recently used parameters
   */
  getFrequentlyUsedParameters(): string[] {
    return [...(this.settings.dataQuery.frequentlyUsedParameters || [])];
  }

  /**
   * Add a frequently used parameter
   */
  addFrequentlyUsedParameter(parameter: string, maxItems = 20): void {
    const parameters = this.settings.dataQuery.frequentlyUsedParameters || [];
    
    // Remove if already exists
    const filtered = parameters.filter(p => p !== parameter);
    
    // Add to beginning
    filtered.unshift(parameter);
    
    // Limit size
    this.settings.dataQuery.frequentlyUsedParameters = filtered.slice(0, maxItems);
    this.saveSettings();
  }
}