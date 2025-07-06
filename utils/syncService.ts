import { WebDAVConfig, SyncRecord, AppState } from '@/types';
import { StorageService } from './storage';
import { createWebDAVService } from './webdav';
import { Alert } from 'react-native';

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  mergedData?: Partial<AppState>;
}

export interface SyncConflict {
  type: 'data_conflict' | 'version_conflict';
  localData: Partial<AppState>;
  remoteData: Partial<AppState>;
  conflictingFields: string[];
}

export interface IncrementalSyncData {
  lastSyncTimestamp: string;
  changedItems: {
    tasks: any[];
    diaryEntries: any[];
    goals: any[];
    habits: any[];
    personalSummaries: any[];
  };
  deletedItems: {
    tasks: string[];
    diaryEntries: string[];
    goals: string[];
    habits: string[];
    personalSummaries: string[];
  };
}

/**
 * Manages data synchronization between the local device and a remote WebDAV server.
 * This service handles both manual and automatic synchronization, including conflict resolution.
 */
export class SyncService {
  private static instance: SyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isAutoSyncEnabled = false;
  private isSyncing = false;

  /**
   * Gets the singleton instance of the SyncService.
   * @returns The SyncService instance.
   */
  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Initializes auto-sync based on the user's settings.
   */
  async initializeAutoSync(): Promise<void> {
    const settings = await StorageService.getSettings();

    if (settings.webdav.enabled && settings.webdav.autoSync) {
      this.startAutoSync(settings.webdav);
    }
  }

  /**
   * Starts the automatic synchronization process.
   * @param config The WebDAV configuration.
   */
  startAutoSync(config: WebDAVConfig): void {
    this.stopAutoSync();

    if (!config.enabled || !config.autoSync) {
      return;
    }

    const intervalMs = this.getIntervalMs(config.syncFrequency);

    this.syncInterval = setInterval(async () => {
      try {
        await this.performAutoSync(config);
      } catch (error) {
        console.error('Auto sync failed:', error);
        await this.recordSyncError('Auto sync failed');
      }
    }, intervalMs) as any;

    this.isAutoSyncEnabled = true;
  }

  /**
   * Stops the automatic synchronization process.
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isAutoSyncEnabled = false;
  }

  /**
   * Converts a frequency string to milliseconds.
   * @param frequency The sync frequency ('hourly', 'daily', 'weekly').
   * @returns The interval in milliseconds.
   */
  private getIntervalMs(frequency: string): number {
    switch (frequency) {
      case 'hourly':
        return 60 * 60 * 1000; // 1 hour
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      default:
        return 60 * 60 * 1000; // Default to hourly
    }
  }

  /**
   * Performs the core auto-sync logic, deciding whether to upload or download.
   * @param config The WebDAV configuration.
   */
  private async performAutoSync(config: WebDAVConfig): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping auto sync');
      return;
    }

    this.isSyncing = true;
    const webdavService = createWebDAVService(config);
    const startTime = Date.now();

    try {
      const remoteBackup = await webdavService.downloadLatestBackup();
      const settings = await StorageService.getSettings();
      const lastSyncTime = new Date(settings.webdav.lastSync || 0).getTime();

      let syncRecord: SyncRecord;

      if (remoteBackup && new Date(remoteBackup.timestamp).getTime() > lastSyncTime) {
        // Check for conflicts before downloading
        const conflict = await this.detectConflicts(remoteBackup.data);

        if (conflict) {
          // Handle conflict with auto-resolution strategy
          const resolution = await this.resolveConflictAutomatically(conflict);
          syncRecord = await this.applySyncResolution(config, resolution);
        } else {
          // No conflicts, safe to download
          syncRecord = await this.downloadData(config);
        }
      } else {
        // Local is newer or no remote, upload
        const shouldUpload = await this.shouldPerformSync(config.lastSync);
        if (shouldUpload) {
          syncRecord = await this.uploadData(config);
        } else {
          return; // No changes to sync
        }
      }

      // Update last sync time
      settings.webdav.lastSync = new Date().toISOString();
      await StorageService.saveSettings(settings);

      // Record successful sync
      syncRecord.type = 'auto';
      syncRecord.duration = Date.now() - startTime;

    } catch (error) {
      await this.recordSyncError(`Auto sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Checks if any local data has been modified since the last sync.
   * @param lastSync The timestamp of the last successful sync.
   * @returns A promise that resolves to true if there are local changes, false otherwise.
   */
  private async shouldPerformSync(lastSync?: string): Promise<boolean> {
    if (!lastSync) {
      return true; // First sync
    }

    // Check if any data has been modified since last sync
    const lastSyncTime = new Date(lastSync).getTime();
    const data = await StorageService.getAllData();

    // Check if any data was modified after last sync
    const hasRecentChanges = [
      ...(data.diaryEntries || []),
      ...(data.tasks || []),
      ...(data.habits || []),
      ...(data.goals || []),
      ...(data.personalSummaries || []),
    ].some(item => {
      const updatedAt = new Date((item as any).updatedAt || (item as any).createdAt).getTime();
      return updatedAt > lastSyncTime;
    });

    return hasRecentChanges;
  }

  /**
   * Records a synchronization error to the sync history.
   * @param message The error message.
   */
  private async recordSyncError(message: string): Promise<void> {
    const syncRecord: SyncRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'auto',
      status: 'failed',
      message,
      dataTypes: [],
    };

    const existingRecords = await StorageService.getSyncRecords();
    const updatedRecords = [syncRecord, ...existingRecords.slice(0, 49)];
    await StorageService.saveSyncRecords(updatedRecords);
  }

  /**
   * Triggers a manual synchronization (upload or download).
   * @param type The type of sync to perform.
   * @returns A promise that resolves to the synchronization record.
   */
  async triggerSync(type: 'upload' | 'download'): Promise<SyncRecord> {
    const settings = await StorageService.getSettings();
    if (!settings.webdav.enabled) {
      throw new Error('WebDAV is not enabled.');
    }

    if (type === 'upload') {
      return this.uploadData(settings.webdav);
    } else {
      return this.downloadData(settings.webdav);
    }
  }

  /**
   * Uploads all local data to the WebDAV server.
   * @param config The WebDAV configuration.
   * @returns A promise that resolves to the synchronization record.
   */
  async uploadData(config: WebDAVConfig): Promise<SyncRecord> {
    const webdavService = createWebDAVService(config);
    const data = await StorageService.getAllData();
    const syncRecord = await webdavService.syncData('upload', data);

    const settings = await StorageService.getSettings();
    settings.webdav.lastSync = new Date().toISOString();
    await StorageService.saveSettings(settings);

    return syncRecord;
  }

  /**
   * Downloads the latest data from the WebDAV server and overwrites local data.
   * @param config The WebDAV configuration.
   * @returns A promise that resolves to the synchronization record.
   */
  async downloadData(config: WebDAVConfig): Promise<SyncRecord> {
    const webdavService = createWebDAVService(config);
    const syncRecord = await webdavService.syncData('download');

    const settings = await StorageService.getSettings();
    settings.webdav.lastSync = new Date().toISOString();
    await StorageService.saveSettings(settings);

    return syncRecord;
  }

  /**
   * Retrieves the status of the last synchronization.
   * @returns A promise that resolves to an object containing the last sync timestamp, status, and next scheduled sync.
   */
  async getLastSyncStatus(): Promise<{ lastSync?: string; status: string; nextSync?: string }> {
    const settings = await StorageService.getSettings();
    const syncRecords = await StorageService.getSyncRecords();

    const lastRecord = syncRecords[0];
    const lastSync = settings.webdav.lastSync;

    let nextSync: string | undefined;
    if (settings.webdav.enabled && settings.webdav.autoSync && lastSync) {
      const lastSyncTime = new Date(lastSync);
      const intervalMs = this.getIntervalMs(settings.webdav.syncFrequency);
      nextSync = new Date(lastSyncTime.getTime() + intervalMs).toISOString();
    }

    return {
      lastSync,
      status: lastRecord?.status || 'never',
      nextSync,
    };
  }

  /**
   * Detects conflicts between local and remote data.
   * @param remoteData The remote data to compare against local data.
   * @returns A conflict object if conflicts are detected, null otherwise.
   */
  private async detectConflicts(remoteData: Partial<AppState>): Promise<SyncConflict | null> {
    const localData = await StorageService.getAllData();
    const settings = await StorageService.getSettings();
    const lastSyncTime = new Date(settings.webdav.lastSync || 0).getTime();

    const conflictingFields: string[] = [];

    // Check for conflicts in each data type
    const dataTypes = ['tasks', 'diaryEntries', 'goals', 'habits', 'personalSummaries'];

    for (const dataType of dataTypes) {
      const localItems = (localData as any)[dataType] || [];
      const remoteItems = (remoteData as any)[dataType] || [];

      // Check if both local and remote have changes since last sync
      const localHasChanges = localItems.some((item: any) => {
        const updatedAt = new Date(item.updatedAt || item.createdAt).getTime();
        return updatedAt > lastSyncTime;
      });

      const remoteHasChanges = remoteItems.some((item: any) => {
        const updatedAt = new Date(item.updatedAt || item.createdAt).getTime();
        return updatedAt > lastSyncTime;
      });

      if (localHasChanges && remoteHasChanges) {
        conflictingFields.push(dataType);
      }
    }

    if (conflictingFields.length > 0) {
      return {
        type: 'data_conflict',
        localData,
        remoteData,
        conflictingFields,
      };
    }

    return null;
  }

  /**
   * Automatically resolves conflicts using a predefined strategy.
   * @param conflict The conflict to resolve.
   * @returns The resolution strategy and merged data if applicable.
   */
  private async resolveConflictAutomatically(conflict: SyncConflict): Promise<ConflictResolution> {
    // For auto-sync, use a simple strategy: prefer newer items
    const mergedData: Partial<AppState> = {};

    for (const field of conflict.conflictingFields) {
      const localItems = (conflict.localData as any)[field] || [];
      const remoteItems = (conflict.remoteData as any)[field] || [];

      // Create a map of items by ID for easier merging
      const itemsMap = new Map();

      // Add remote items first
      remoteItems.forEach((item: any) => {
        itemsMap.set(item.id, item);
      });

      // Add or update with local items (newer items win)
      localItems.forEach((localItem: any) => {
        const remoteItem = itemsMap.get(localItem.id);
        if (!remoteItem) {
          itemsMap.set(localItem.id, localItem);
        } else {
          const localTime = new Date(localItem.updatedAt || localItem.createdAt).getTime();
          const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt).getTime();

          if (localTime > remoteTime) {
            itemsMap.set(localItem.id, localItem);
          }
        }
      });

      (mergedData as any)[field] = Array.from(itemsMap.values());
    }

    return {
      strategy: 'merge',
      mergedData,
    };
  }

  /**
   * Applies the conflict resolution by saving the resolved data.
   * @param config The WebDAV configuration.
   * @param resolution The conflict resolution to apply.
   * @returns A sync record indicating the result.
   */
  private async applySyncResolution(config: WebDAVConfig, resolution: ConflictResolution): Promise<SyncRecord> {
    const startTime = Date.now();

    try {
      if (resolution.strategy === 'merge' && resolution.mergedData) {
        // Save merged data locally
        await StorageService.saveAllData(resolution.mergedData);

        // Upload merged data to remote
        const webdavService = createWebDAVService(config);
        const syncRecord = await webdavService.syncData('upload', resolution.mergedData);

        syncRecord.message = 'Conflict resolved automatically using merge strategy';
        syncRecord.duration = Date.now() - startTime;

        return syncRecord;
      } else {
        throw new Error('Unsupported resolution strategy');
      }
    } catch (error) {
      const syncRecord: SyncRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'auto',
        status: 'failed',
        message: `Conflict resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        dataTypes: [],
        duration: Date.now() - startTime,
      };

      const existingRecords = await StorageService.getSyncRecords();
      const updatedRecords = [syncRecord, ...existingRecords.slice(0, 49)];
      await StorageService.saveSyncRecords(updatedRecords);

      return syncRecord;
    }
  }

  /**
   * Performs incremental sync by only syncing changed items since last sync.
   * @param config The WebDAV configuration.
   * @returns A sync record indicating the result.
   */
  async performIncrementalSync(config: WebDAVConfig): Promise<SyncRecord> {
    const settings = await StorageService.getSettings();
    const lastSyncTime = settings.webdav.lastSync;

    if (!lastSyncTime) {
      // No previous sync, perform full sync
      return this.uploadData(config);
    }

    const incrementalData = await this.getIncrementalChanges(lastSyncTime);

    if (this.hasNoChanges(incrementalData)) {
      return {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'manual',
        status: 'success',
        message: 'No changes to sync',
        dataTypes: [],
      };
    }

    // For now, perform full sync if there are changes
    // In a more advanced implementation, we would sync only the changes
    return this.uploadData(config);
  }

  /**
   * Gets incremental changes since the last sync.
   * @param lastSyncTime The timestamp of the last sync.
   * @returns The incremental sync data.
   */
  private async getIncrementalChanges(lastSyncTime: string): Promise<IncrementalSyncData> {
    const data = await StorageService.getAllData();
    const lastSyncTimestamp = new Date(lastSyncTime).getTime();

    const changedItems = {
      tasks: [],
      diaryEntries: [],
      goals: [],
      habits: [],
      personalSummaries: [],
    };

    // Find items that were modified since last sync
    const dataTypes = ['tasks', 'diaryEntries', 'goals', 'habits', 'personalSummaries'];

    for (const dataType of dataTypes) {
      const items = (data as any)[dataType] || [];
      (changedItems as any)[dataType] = items.filter((item: any) => {
        const updatedAt = new Date(item.updatedAt || item.createdAt).getTime();
        return updatedAt > lastSyncTimestamp;
      });
    }

    return {
      lastSyncTimestamp: lastSyncTime,
      changedItems,
      deletedItems: {
        tasks: [],
        diaryEntries: [],
        goals: [],
        habits: [],
        personalSummaries: [],
      }, // TODO: Implement deletion tracking
    };
  }

  /**
   * Checks if there are no changes in the incremental data.
   * @param incrementalData The incremental sync data to check.
   * @returns True if there are no changes, false otherwise.
   */
  private hasNoChanges(incrementalData: IncrementalSyncData): boolean {
    const { changedItems, deletedItems } = incrementalData;

    const hasChangedItems = Object.values(changedItems).some(items => items.length > 0);
    const hasDeletedItems = Object.values(deletedItems).some(items => items.length > 0);

    return !hasChangedItems && !hasDeletedItems;
  }

  /**
   * Checks if auto-sync is currently active.
   * @returns True if auto-sync is enabled and running, false otherwise.
   */
  isAutoSyncActive(): boolean {
    return this.isAutoSyncEnabled;
  }

  /**
   * Checks if a sync operation is currently in progress.
   * @returns True if syncing, false otherwise.
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

/**
 * Singleton instance of the SyncService.
 */
export const syncService = SyncService.getInstance();