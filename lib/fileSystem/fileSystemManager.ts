/**
 * File System Access API Manager
 * Handles local file system operations for Parquet files
 */

import type { 
  StorageConfig, 
  FileSystemPermissionStatus,
  DirectoryStructure,
  MachineDirectory 
} from '../../types/fileSystem';

export class FileSystemManager {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private directories: DirectoryStructure = {
    machines: new Map(),
    duckdb: null,
    metadata: null,
  };

  /**
   * Initialize file system with user-selected directory
   */
  async initialize(): Promise<StorageConfig> {
    try {
      // Prompt user to select a directory
      this.rootHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });

      // Create directory structure
      await this.setupDirectoryStructure();

      return {
        rootDirectory: this.rootHandle,
        isInitialized: true,
        storagePath: this.rootHandle.name,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('User cancelled directory selection');
      }
      throw error;
    }
  }

  /**
   * Setup required directory structure
   */
  private async setupDirectoryStructure(): Promise<void> {
    if (!this.rootHandle) throw new Error('Root directory not initialized');

    // Create main directories
    const dataDir = await this.rootHandle.getDirectoryHandle('data', { create: true });
    const duckdbDir = await this.rootHandle.getDirectoryHandle('duckdb', { create: true });
    const metadataDir = await this.rootHandle.getDirectoryHandle('metadata', { create: true });

    this.directories.duckdb = duckdbDir;
    this.directories.metadata = metadataDir;

    // Scan existing machine directories
    await this.scanMachineDirectories(dataDir);
  }

  /**
   * Scan and index existing machine directories
   */
  private async scanMachineDirectories(machinesDir: FileSystemDirectoryHandle): Promise<void> {
    for await (const entry of machinesDir.values()) {
      if (entry.kind === 'directory') {
        const machineDir: MachineDirectory = {
          handle: entry,
          machineId: entry.name,
          parquetFiles: [],
        };

        // Scan for parquet files
        for await (const file of entry.values()) {
          if (file.kind === 'file' && file.name.endsWith('.parquet')) {
            machineDir.parquetFiles.push(file.name);
          } else if (file.name === 'metadata.json') {
            machineDir.metadataFile = file.name;
          }
        }

        this.directories.machines.set(entry.name, machineDir);
      }
    }
  }

  /**
   * Check and request permissions
   */
  async checkPermissions(): Promise<FileSystemPermissionStatus> {
    if (!this.rootHandle) {
      return {
        hasPermission: false,
        canWrite: false,
        canRead: false,
      };
    }

    const readPermission = await this.rootHandle.queryPermission({ mode: 'read' });
    const writePermission = await this.rootHandle.queryPermission({ mode: 'readwrite' });

    // Request permission if needed
    if (readPermission !== 'granted') {
      await this.rootHandle.requestPermission({ mode: 'read' });
    }

    if (writePermission !== 'granted') {
      await this.rootHandle.requestPermission({ mode: 'readwrite' });
    }

    return {
      hasPermission: true,
      canRead: readPermission === 'granted',
      canWrite: writePermission === 'granted',
    };
  }

  /**
   * Get or create machine directory
   */
  async getMachineDirectory(plant: string, machineNo: string): Promise<FileSystemDirectoryHandle> {
    if (!this.rootHandle) throw new Error('File system not initialized');

    const machineId = `${plant}_${machineNo}`;
    const machinesDir = await this.rootHandle.getDirectoryHandle('machines');
    const machineDir = await machinesDir.getDirectoryHandle(machineId, { create: true });

    // Update directory cache
    if (!this.directories.machines.has(machineId)) {
      this.directories.machines.set(machineId, {
        handle: machineDir,
        machineId,
        parquetFiles: [],
      });
    }

    return machineDir;
  }

  /**
   * Write file to machine directory
   */
  async writeParquetFile(
    machineId: string,
    fileName: string,
    data: ArrayBuffer
  ): Promise<void> {
    const machineDir = this.directories.machines.get(machineId);
    if (!machineDir) throw new Error(`Machine directory ${machineId} not found`);

    const fileHandle = await machineDir.handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();

    // Update file list
    if (!machineDir.parquetFiles.includes(fileName)) {
      machineDir.parquetFiles.push(fileName);
    }
  }

  /**
   * Read file from machine directory
   */
  async readParquetFile(
    machineId: string,
    fileName: string
  ): Promise<ArrayBuffer> {
    const machineDir = this.directories.machines.get(machineId);
    if (!machineDir) throw new Error(`Machine directory ${machineId} not found`);

    const fileHandle = await machineDir.handle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.arrayBuffer();
  }

  /**
   * List all machine directories
   */
  getMachineList(): string[] {
    return Array.from(this.directories.machines.keys());
  }

  /**
   * Get parquet files for a machine
   */
  getParquetFiles(machineId: string): string[] {
    const machineDir = this.directories.machines.get(machineId);
    return machineDir?.parquetFiles || [];
  }

  /**
   * Save metadata JSON
   */
  async saveMetadata(fileName: string, data: object): Promise<void> {
    if (!this.directories.metadata) throw new Error('Metadata directory not initialized');

    const fileHandle = await this.directories.metadata.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  }

  /**
   * Load metadata JSON
   */
  async loadMetadata(fileName: string): Promise<any> {
    if (!this.directories.metadata) throw new Error('Metadata directory not initialized');

    try {
      const fileHandle = await this.directories.metadata.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<{
    totalFiles: number;
    totalSize: number;
    machines: Array<{
      machineId: string;
      fileCount: number;
      totalSize: number;
    }>;
  }> {
    const info = {
      totalFiles: 0,
      totalSize: 0,
      machines: [] as any[],
    };

    for (const [machineId, machineDir] of this.directories.machines) {
      let machineSize = 0;
      let fileCount = 0;

      for (const fileName of machineDir.parquetFiles) {
        try {
          const fileHandle = await machineDir.handle.getFileHandle(fileName);
          const file = await fileHandle.getFile();
          machineSize += file.size;
          fileCount++;
        } catch (error) {
          console.error(`Error reading file ${fileName}:`, error);
        }
      }

      info.machines.push({
        machineId,
        fileCount,
        totalSize: machineSize,
      });

      info.totalFiles += fileCount;
      info.totalSize += machineSize;
    }

    return info;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.rootHandle !== null;
  }

  /**
   * Get or create directory helper
   */
  private async getOrCreateDirectory(
    parent: FileSystemDirectoryHandle,
    name: string
  ): Promise<FileSystemDirectoryHandle> {
    return await parent.getDirectoryHandle(name, { create: true });
  }

  /**
   * Save Parquet file with year-month partitioning
   */
  async saveParquetFile(
    machineId: string,
    yearMonth: string,
    data: ArrayBuffer
  ): Promise<void> {
    if (!this.rootHandle) throw new Error('File system not initialized');

    // Get or create machine directory under data
    const dataDir = await this.getOrCreateDirectory(this.rootHandle, 'data');
    const machineDir = await this.getOrCreateDirectory(dataDir, machineId);
    
    // Create filename with yearMonth
    const fileName = `${yearMonth}.parquet`;
    
    // Write file
    const fileHandle = await machineDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();

    // Update directory cache
    if (!this.directories.machines.has(machineId)) {
      this.directories.machines.set(machineId, {
        handle: machineDir,
        machineId,
        parquetFiles: [],
      });
    }
    
    const machineEntry = this.directories.machines.get(machineId)!;
    if (!machineEntry.parquetFiles.includes(fileName)) {
      machineEntry.parquetFiles.push(fileName);
    }
  }

  /**
   * Get list of machines
   */
  async getMachines(): Promise<string[]> {
    if (!this.rootHandle) throw new Error('File system not initialized');

    const machines: string[] = [];
    const dataDir = await this.getOrCreateDirectory(this.rootHandle, 'data');

    for await (const [name, handle] of dataDir.entries()) {
      if (handle.kind === 'directory') {
        machines.push(name);
      }
    }

    return machines;
  }

  /**
   * Save import metadata
   */
  async saveImportMetadata(machineId: string, metadata: any): Promise<void> {
    if (!this.rootHandle) throw new Error('File system not initialized');

    const metadataDir = await this.getOrCreateDirectory(this.rootHandle, 'metadata');
    const machineMetadataDir = await this.getOrCreateDirectory(metadataDir, machineId);
    
    const fileName = `import_${Date.now()}.json`;
    const fileHandle = await machineMetadataDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    
    await writable.write(JSON.stringify(metadata, null, 2));
    await writable.close();
  }

  /**
   * Get import metadata for a machine
   */
  async getImportMetadata(machineId: string): Promise<any[]> {
    if (!this.rootHandle) throw new Error('File system not initialized');

    try {
      const metadataDir = await this.getOrCreateDirectory(this.rootHandle, 'metadata');
      const machineMetadataDir = await metadataDir.getDirectoryHandle(machineId);
      
      const metadata: any[] = [];
      
      for await (const [name, handle] of machineMetadataDir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.json')) {
          const fileHandle = handle as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          const content = await file.text();
          metadata.push(JSON.parse(content));
        }
      }
      
      return metadata.sort((a, b) => 
        new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get import metadata:', error);
      return [];
    }
  }
}