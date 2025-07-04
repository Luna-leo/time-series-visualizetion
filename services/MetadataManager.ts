import { TimeSeriesMetadata } from '@/types/dataReference';

export class MetadataManager {
  private metadataCache: Map<string, TimeSeriesMetadata> = new Map();

  async saveMetadata(id: string, metadata: TimeSeriesMetadata): Promise<void> {
    this.metadataCache.set(id, metadata);
    // Would persist to IndexedDB or file system
  }

  async loadMetadata(id: string): Promise<TimeSeriesMetadata | null> {
    return this.metadataCache.get(id) || null;
  }

  async listMetadata(): Promise<string[]> {
    return Array.from(this.metadataCache.keys());
  }

  async deleteMetadata(id: string): Promise<void> {
    this.metadataCache.delete(id);
  }
}