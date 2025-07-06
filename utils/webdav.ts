import { WebDAVConfig, SyncRecord, AppState } from '@/types';
import { StorageService } from './storage';

/**
 * Provides services for interacting with a WebDAV server to upload and download application data.
 * This class handles authentication, file requests, and parsing of directory listings.
 */
export class WebDAVService {
  private config: WebDAVConfig;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  /**
   * @param config The WebDAV server configuration.
   */
  constructor(config: WebDAVConfig) {
    this.config = config;
  }

  /**
   * Generates the Basic authentication header from the user's credentials.
   * @returns The Authorization header string.
   */
  private getAuthHeader(): string {
    const credentials = btoa(`${this.config.username}:${this.config.password}`);
    return `Basic ${credentials}`;
  }

  /**
   * Makes a generic request to the WebDAV server with retry logic.
   * @param path The path to the resource on the server.
   * @param options The request options (method, headers, body, etc.).
   * @returns A promise that resolves to the server's response.
   */
  private async makeRequest(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.url.replace(/\/$/, '')}/${path}`;

    const headers = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return this.retryRequest(async () => {
      return fetch(url, {
        ...options,
        headers,
      });
    });
  }

  /**
   * Retries a request with exponential backoff.
   * @param requestFn The function that makes the request.
   * @returns A promise that resolves to the server's response.
   */
  private async retryRequest(requestFn: () => Promise<Response>): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await requestFn();

        // If the response is successful or a client error (4xx), don't retry
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // Server error (5xx), retry if we have attempts left
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Delays execution for the specified number of milliseconds.
   * @param ms The number of milliseconds to delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Tests the connection to the WebDAV server by making a PROPFIND request.
   * @returns A promise that resolves to true if the connection is successful, false otherwise.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('', {
        method: 'PROPFIND',
        headers: {
          'Depth': '0',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('WebDAV connection test failed:', error);
      return false;
    }
  }

  /**
   * Uploads application data to the WebDAV server as a timestamped JSON file.
   * @param data The application state data to upload.
   */
  async uploadData(data: Partial<AppState>): Promise<void> {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      const timestamp = new Date().toISOString();
      const filename = `productivity-backup-${timestamp}.json`;

      const response = await this.makeRequest(filename, {
        method: 'PUT',
        body: jsonData,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('WebDAV upload failed:', error);
      throw error;
    }
  }

  /**
   * Downloads the most recent backup file from the WebDAV server.
   * @returns A promise that resolves to an object containing the backup data and its timestamp, or null if no backups are found.
   */
  async downloadLatestBackup(): Promise<{ data: Partial<AppState>, timestamp: string } | null> {
    try {
      const response = await this.makeRequest('', {
        method: 'PROPFIND',
        headers: {
          'Depth': '1',
          'Content-Type': 'application/xml',
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:">
            <D:prop>
              <D:displayname/>
              <D:getlastmodified/>
            </D:prop>
          </D:propfind>`,
      });

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status}`);
      }

      const xmlText = await response.text();
      const backupFiles = this.parseBackupFiles(xmlText);

      if (backupFiles.length === 0) {
        return null;
      }

      const latestFile = backupFiles.sort((a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      )[0];

      const downloadResponse = await this.makeRequest(latestFile.name);

      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.status}`);
      }

      const data = await downloadResponse.json();
      return { data, timestamp: latestFile.lastModified };
    } catch (error) {
      console.error('WebDAV download failed:', error);
      throw error;
    }
  }

  /**
   * Parses the XML response from a PROPFIND request to extract backup file names and modification dates.
   * @param xmlText The XML response text.
   * @returns An array of objects, each containing a file name and its last modified date.
   */
  private parseBackupFiles(xmlText: string): { name: string; lastModified: string }[] {
    const files: { name: string; lastModified: string }[] = [];
    const lines = xmlText.split('\n');
    let currentFile: any = {};

    for (const line of lines) {
      if (line.includes('<D:displayname>') && line.includes('productivity-backup-')) {
        const match = line.match(/<D:displayname>(.*?)<\/D:displayname>/);
        if (match) {
          currentFile.name = match[1];
        }
      }

      if (line.includes('<D:getlastmodified>')) {
        const match = line.match(/<D:getlastmodified>(.*?)<\/D:getlastmodified>/);
        if (match) {
          currentFile.lastModified = match[1];
          if (currentFile.name) {
            files.push({ ...currentFile });
            currentFile = {};
          }
        }
      }
    }

    return files;
  }

  /**
   * Performs a synchronization operation (upload or download) and records the result.
   * @param type The type of synchronization to perform ('upload' or 'download').
   * @param data The data to upload (required for 'upload' type).
   * @returns A promise that resolves to the synchronization record.
   */
  async syncData(type: 'upload' | 'download', data?: Partial<AppState>): Promise<SyncRecord> {
    const syncRecord: SyncRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'manual',
      status: 'success',
      message: '',
      dataTypes: [],
    };

    try {
      if (type === 'upload') {
        if (!data) {
          throw new Error('No data provided for upload.');
        }
        await this.uploadData(data);
        syncRecord.message = 'Data successfully uploaded to WebDAV server';
        syncRecord.dataTypes = Object.keys(data);
      } else {
        const backup = await this.downloadLatestBackup();
        if (backup) {
          await StorageService.saveAllData(backup.data);
          syncRecord.message = 'Data successfully downloaded from WebDAV server';
          syncRecord.dataTypes = Object.keys(backup.data);
        } else {
          syncRecord.message = 'No backup files found on server';
        }
      }
    } catch (error) {
      syncRecord.status = 'failed';
      syncRecord.message = error instanceof Error ? error.message : 'Unknown error occurred';
    }

    const existingRecords = await StorageService.getSyncRecords();
    const updatedRecords = [syncRecord, ...existingRecords.slice(0, 49)];
    await StorageService.saveSyncRecords(updatedRecords);

    return syncRecord;
  }
}

/**
 * Factory function to create a new instance of the WebDAVService.
 * @param config The WebDAV server configuration.
 * @returns A new WebDAVService instance.
 */
export const createWebDAVService = (config: WebDAVConfig): WebDAVService => {
  return new WebDAVService(config);
};