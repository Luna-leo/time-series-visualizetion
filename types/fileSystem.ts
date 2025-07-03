// File System Access API types
export interface StorageConfig {
  rootDirectory: FileSystemDirectoryHandle | null;
  isInitialized: boolean;
  storagePath?: string;
}

export interface FileSystemPermissionStatus {
  hasPermission: boolean;
  canWrite: boolean;
  canRead: boolean;
}

export interface DirectoryStructure {
  machines: Map<string, MachineDirectory>;
  duckdb: FileSystemDirectoryHandle | null;
  metadata: FileSystemDirectoryHandle | null;
}

export interface MachineDirectory {
  handle: FileSystemDirectoryHandle;
  machineId: string;
  parquetFiles: string[];
  metadataFile?: string;
}

export interface ParquetFileInfo {
  fileName: string;
  yearMonth: string;
  fileSize: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  parameters: string[];
  recordCount: number;
}