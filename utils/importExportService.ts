import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { AppState } from '@/types';
import { StorageService } from './storage';

export interface ExportData {
  version: string;
  exportDate: string;
  data: Partial<AppState>;
  metadata: {
    totalTasks: number;
    totalDiaryEntries: number;
    totalGoals: number;
    totalHabits: number;
    totalPomodoroSessions: number;
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  importedData?: {
    tasks: number;
    diaryEntries: number;
    goals: number;
    habits: number;
    pomodoroSessions: number;
  };
}

export class ImportExportService {
  private static readonly EXPORT_VERSION = '1.0.0';
  private static readonly SUPPORTED_VERSIONS = ['1.0.0'];

  /**
   * Export all application data to a JSON file
   */
  static async exportData(): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      // Get all data from storage
      const allData = await StorageService.getAllData();

      // Create export data structure
      const exportData: ExportData = {
        version: this.EXPORT_VERSION,
        exportDate: new Date().toISOString(),
        data: allData,
        metadata: {
          totalTasks: allData.tasks?.length || 0,
          totalDiaryEntries: allData.diaryEntries?.length || 0,
          totalGoals: allData.goals?.length || 0,
          totalHabits: allData.habits?.length || 0,
          totalPomodoroSessions: allData.pomodoroSessions?.length || 0,
        },
      };

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `hearthlight-backup-${timestamp}.json`;

      if (Platform.OS === 'web') {
        // Web platform: use download
        return this.exportDataWeb(exportData, filename);
      } else {
        // Native platform: use file system
        return this.exportDataNative(exportData, filename);
      }
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Export data for web platform
   */
  private static async exportDataWeb(exportData: ExportData, filename: string): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: `Data exported successfully as ${filename}`,
        filePath: filename,
      };
    } catch (error) {
      throw new Error(`Web export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export data for native platform
   */
  private static async exportDataNative(exportData: ExportData, filename: string): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      // Create file path
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Write data to file
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Hearthlight Data',
        });
      }

      return {
        success: true,
        message: `Data exported successfully to ${filename}`,
        filePath: fileUri,
      };
    } catch (error) {
      throw new Error(`Native export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import data from a JSON file
   */
  static async importData(): Promise<ImportResult> {
    try {
      if (Platform.OS === 'web') {
        return this.importDataWeb();
      } else {
        return this.importDataNative();
      }
    } catch (error) {
      console.error('Import failed:', error);
      return {
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Import data for web platform
   */
  private static async importDataWeb(): Promise<ImportResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';

      input.onchange = async (event) => {
        try {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve({
              success: false,
              message: 'No file selected',
            });
            return;
          }

          const fileContent = await file.text();
          const result = await this.processImportData(fileContent);
          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            message: `Web import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      };

      input.oncancel = () => {
        resolve({
          success: false,
          message: 'Import cancelled by user',
        });
      };

      input.click();
    });
  }

  /**
   * Import data for native platform
   */
  private static async importDataNative(): Promise<ImportResult> {
    try {
      // Pick a document
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return {
          success: false,
          message: 'Import cancelled by user',
        };
      }

      const file = result.assets[0];

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return this.processImportData(fileContent);
    } catch (error) {
      throw new Error(`Native import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process import data (common for both platforms)
   */
  private static async processImportData(fileContent: string): Promise<ImportResult> {

    try {
      // Parse JSON
      let importData: ExportData;
      try {
        importData = JSON.parse(fileContent);
      } catch (parseError) {
        return {
          success: false,
          message: 'Invalid JSON file format',
        };
      }

      // Validate file format
      const validationResult = this.validateImportData(importData);
      if (!validationResult.valid) {
        return {
          success: false,
          message: validationResult.message,
        };
      }

      // Show confirmation dialog
      const shouldProceed = await this.showImportConfirmation(importData);
      if (!shouldProceed) {
        return {
          success: false,
          message: 'Import cancelled by user',
        };
      }

      // Backup current data before import
      await this.createBackupBeforeImport();

      // Import data
      const importResult = await this.performImport(importData);

      return importResult;
    } catch (error) {
      throw new Error(`Process import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate import data structure and version
   */
  private static validateImportData(data: any): { valid: boolean; message: string } {
    if (!data || typeof data !== 'object') {
      return { valid: false, message: 'Invalid file format' };
    }

    if (!data.version) {
      return { valid: false, message: 'Missing version information' };
    }

    if (!this.SUPPORTED_VERSIONS.includes(data.version)) {
      return {
        valid: false,
        message: `Unsupported version: ${data.version}. Supported versions: ${this.SUPPORTED_VERSIONS.join(', ')}`
      };
    }

    if (!data.data || typeof data.data !== 'object') {
      return { valid: false, message: 'Invalid data structure' };
    }

    return { valid: true, message: 'Valid' };
  }

  /**
   * Show confirmation dialog before import
   */
  private static async showImportConfirmation(importData: ExportData): Promise<boolean> {
    return new Promise((resolve) => {
      const { metadata } = importData;
      const message = `This will import:
• ${metadata.totalTasks} tasks
• ${metadata.totalDiaryEntries} diary entries
• ${metadata.totalGoals} goals
• ${metadata.totalHabits} habits
• ${metadata.totalPomodoroSessions} pomodoro sessions

Export Date: ${new Date(importData.exportDate).toLocaleString()}

This will replace your current data. Continue?`;

      Alert.alert(
        'Confirm Import',
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Import',
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  /**
   * Create backup before import
   */
  private static async createBackupBeforeImport(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `hearthlight-pre-import-backup-${timestamp}.json`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const currentData = await StorageService.getAllData();
      const backupData: ExportData = {
        version: this.EXPORT_VERSION,
        exportDate: new Date().toISOString(),
        data: currentData,
        metadata: {
          totalTasks: currentData.tasks?.length || 0,
          totalDiaryEntries: currentData.diaryEntries?.length || 0,
          totalGoals: currentData.goals?.length || 0,
          totalHabits: currentData.habits?.length || 0,
          totalPomodoroSessions: currentData.pomodoroSessions?.length || 0,
        },
      };

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(backupData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
    } catch (error) {
      console.warn('Failed to create pre-import backup:', error);
    }
  }

  /**
   * Perform the actual import operation
   */
  private static async performImport(importData: ExportData): Promise<ImportResult> {
    try {
      const { data } = importData;

      // Save imported data
      await StorageService.saveAllData(data);

      // Count imported items
      const importedData = {
        tasks: data.tasks?.length || 0,
        diaryEntries: data.diaryEntries?.length || 0,
        goals: data.goals?.length || 0,
        habits: data.habits?.length || 0,
        pomodoroSessions: data.pomodoroSessions?.length || 0,
      };

      return {
        success: true,
        message: 'Data imported successfully',
        importedData,
      };
    } catch (error) {
      console.error('Import operation failed:', error);
      return {
        success: false,
        message: `Import operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get export file info
   */
  static async getExportFileInfo(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    modificationTime?: number;
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      return {
        exists: fileInfo.exists,
        size: fileInfo.exists ? fileInfo.size : undefined,
        modificationTime: fileInfo.exists ? fileInfo.modificationTime : undefined,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Delete export file
   */
  static async deleteExportFile(filePath: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete export file:', error);
      return false;
    }
  }
}
