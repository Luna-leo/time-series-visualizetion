/**
 * Application settings type definitions
 */

export interface FileSystemSettings {
  lastUsedDirectoryName?: string;
  autoReconnect: boolean;
  lastAccessTime?: string;
}

export interface ChartSettings {
  defaultGridSize: string;
  defaultTheme?: 'light' | 'dark';
  defaultColors?: string[];
}

export interface DataQuerySettings {
  defaultTimeRange?: string;
  frequentlyUsedParameters?: string[];
  savedQueries?: SavedQuery[];
}

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  parameters: string[];
  createdAt: string;
}

export interface UISettings {
  sidebarOpen?: boolean;
  showDataQueryPanel?: boolean;
  defaultView?: 'upload' | 'query';
}

export interface ImportSettings {
  defaultEncoding?: string;
  defaultPlant?: string;
  defaultTimestampFormat?: string;
  rememberMetadata: boolean;
}

export interface AppSettings {
  version: string;
  fileSystem: FileSystemSettings;
  chart: ChartSettings;
  dataQuery: DataQuerySettings;
  ui: UISettings;
  import: ImportSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: '1.0.0',
  fileSystem: {
    autoReconnect: true,
  },
  chart: {
    defaultGridSize: '2x2',
  },
  dataQuery: {
    frequentlyUsedParameters: [],
    savedQueries: [],
  },
  ui: {
    defaultView: 'upload',
  },
  import: {
    defaultEncoding: 'UTF-8',
    rememberMetadata: true,
  },
};

export interface SettingsUpdate<T = AppSettings> {
  path: string;
  value: any;
}