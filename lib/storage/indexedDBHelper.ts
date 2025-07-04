/**
 * IndexedDB helper for persisting FileSystemDirectoryHandle
 * Allows reconnecting to previously selected directories without re-prompting
 */

const DB_NAME = 'TimeSeriesVisualization';
const DB_VERSION = 1;
const STORE_NAME = 'directoryHandles';

export class IndexedDBHelper {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for directory handles
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  /**
   * Save a directory handle to IndexedDB
   */
  async saveDirectoryHandle(handle: FileSystemDirectoryHandle, id: string = 'default'): Promise<void> {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await store.put({
        id,
        handle,
        name: handle.name,
        savedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save directory handle:', error);
      throw error;
    }
  }

  /**
   * Retrieve a directory handle from IndexedDB
   */
  async getDirectoryHandle(id: string = 'default'): Promise<FileSystemDirectoryHandle | null> {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise<FileSystemDirectoryHandle | null>((resolve) => {
        const request = store.get(id);
        
        request.onsuccess = async () => {
          const result = request.result;
          
          if (result?.handle) {
            // Verify the handle is still valid
            try {
              // Check if we can query permission
              await result.handle.queryPermission({ mode: 'readwrite' });
              resolve(result.handle);
            } catch (error) {
              console.warn('Stored handle is no longer valid:', error);
              // Handle is no longer valid, remove it
              await this.removeDirectoryHandle(id);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('Failed to retrieve directory handle:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Failed to retrieve directory handle:', error);
      return null;
    }
  }

  /**
   * Remove a directory handle from IndexedDB
   */
  async removeDirectoryHandle(id: string = 'default'): Promise<void> {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await store.delete(id);
    } catch (error) {
      console.error('Failed to remove directory handle:', error);
    }
  }

  /**
   * Check if a directory handle exists in IndexedDB
   */
  async hasDirectoryHandle(id: string = 'default'): Promise<boolean> {
    try {
      const handle = await this.getDirectoryHandle(id);
      return handle !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all stored directory handles
   */
  async clearAllHandles(): Promise<void> {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await store.clear();
    } catch (error) {
      console.error('Failed to clear directory handles:', error);
    }
  }
}

// Singleton instance
let instance: IndexedDBHelper | null = null;

export function getIndexedDBHelper(): IndexedDBHelper {
  if (!instance) {
    instance = new IndexedDBHelper();
  }
  return instance;
}