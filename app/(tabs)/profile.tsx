import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, Settings, FileText, Cloud, Wifi, WifiOff,
  CircleCheck as CheckCircle, Circle as XCircle, Calendar,
  Plus, Bell, RefreshCw, Clock, Download, Upload, Trash2,
  FileDown, FileUp
} from 'lucide-react-native';
import { PersonalSummary, AppSettings, SyncRecord, AIProvider } from '@/types';
import { StorageService } from '@/utils/storage';
import { createWebDAVService } from '@/utils/webdav';
import { syncService } from '@/utils/syncService';
import { formatDisplayDate } from '@/utils/dateUtils';
import { ImportExportService } from '@/utils/importExportService';
import ModelSelector from '@/components/ModelSelector';

type ProfileTab = 'overview' | 'summaries' | 'sync' | 'settings';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [summaries, setSummaries] = useState<PersonalSummary[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [syncRecords, setSyncRecords] = useState<SyncRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>({});
  const [showNewSummary, setShowNewSummary] = useState(false);
  const [showWebDAVConfig, setShowWebDAVConfig] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [newSummary, setNewSummary] = useState({
    title: '',
    content: '',
    period: 'daily' as PersonalSummary['period'],
    achievements: [''],
    challenges: [''],
    learnings: [''],
    gratitude: [''],
  });

  const [webdavConfig, setWebdavConfig] = useState({
    url: '',
    username: '',
    password: '',
    enable: false,
    autoSync: false,
    syncInterval: 60,
    syncFrequency: 'daily' as 'hourly' | 'daily' | 'weekly' | 'manual',
  });



  useEffect(() => {
    loadData();
    loadSyncStatus();
    initializeAutoSync();
  }, []);

  const loadData = async () => {
    const [loadedSummaries, loadedSettings, loadedSyncRecords] = await Promise.all([
      StorageService.getPersonalSummaries(),
      StorageService.getSettings(),
      StorageService.getSyncRecords(),
    ]);

    setSummaries(loadedSummaries);
    setSettings(loadedSettings);
    setSyncRecords(loadedSyncRecords);
    setWebdavConfig({
      url: loadedSettings.webdav.url,
      username: loadedSettings.webdav.username,
      password: loadedSettings.webdav.password,
      enable: loadedSettings.webdav.enabled,
      autoSync: loadedSettings.webdav.autoSync,
      syncInterval: loadedSettings.webdav.syncInterval,
      syncFrequency: loadedSettings.webdav.syncFrequency,
    });
  };

  const loadSyncStatus = async () => {
    const status = await syncService.getLastSyncStatus();
    setSyncStatus(status);
  };

  const initializeAutoSync = async () => {
    await syncService.initializeAutoSync();
  };

  const saveSummary = async () => {
    if (!newSummary.title.trim() || !newSummary.content.trim()) {
      Alert.alert('Error', 'Please fill in title and content');
      return;
    }

    const summary: PersonalSummary = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      title: newSummary.title,
      content: newSummary.content,
      period: newSummary.period,
      achievements: newSummary.achievements.filter(a => a.trim()),
      challenges: newSummary.challenges.filter(c => c.trim()),
      learnings: newSummary.learnings.filter(l => l.trim()),
      gratitude: newSummary.gratitude.filter(g => g.trim()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedSummaries = [summary, ...summaries];
    setSummaries(updatedSummaries);
    await StorageService.savePersonalSummaries(updatedSummaries);

    setShowNewSummary(false);
    setNewSummary({
      title: '',
      content: '',
      period: 'daily',
      achievements: [''],
      challenges: [''],
      learnings: [''],
      gratitude: [''],
    });
  };

  const saveWebDAVConfig = async () => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      webdav: {
        ...settings.webdav,
        url: webdavConfig.url,
        username: webdavConfig.username,
        password: webdavConfig.password,
        enabled: webdavConfig.enable,
        autoSync: webdavConfig.autoSync,
        syncInterval: webdavConfig.syncInterval,
        syncFrequency: webdavConfig.syncFrequency,
      },
    };

    setSettings(updatedSettings);
    await StorageService.saveSettings(updatedSettings);

    // Restart auto sync with new config
    if (webdavConfig.enable && webdavConfig.autoSync) {
      syncService.startAutoSync(updatedSettings.webdav);
    } else {
      syncService.stopAutoSync();
    }

    setShowWebDAVConfig(false);
    Alert.alert('Success', 'WebDAV configuration saved successfully');
  };

  const testWebDAVConnection = async () => {
    if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
      Alert.alert('Error', 'Please fill in all WebDAV configuration fields');
      return;
    }

    try {
      const webdavService = createWebDAVService({
        ...webdavConfig,
        enabled: true,
      });
      const isConnected = await webdavService.testConnection();

      if (isConnected) {
        Alert.alert('Success', 'WebDAV connection successful!');
      } else {
        Alert.alert('Error', 'Failed to connect to WebDAV server');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection test failed');
    }
  };

  const performSync = async (type: 'upload' | 'download') => {
    if (!settings?.webdav.enabled) {
      Alert.alert('Error', 'WebDAV is not enabled');
      return;
    }

    setIsSyncing(true);
    try {
      const syncRecord = await syncService.triggerSync(type);

      // Reload data if download was successful
      if (type === 'download' && syncRecord.status === 'success') {
        await loadData();
      }

      // Update sync records
      const updatedSyncRecords = [syncRecord, ...syncRecords.slice(0, 49)];
      setSyncRecords(updatedSyncRecords);
      await loadSyncStatus();

      Alert.alert(
        syncRecord.status === 'success' ? 'Success' : 'Error',
        syncRecord.message
      );
    } catch (error) {
      Alert.alert('Error', 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const performIncrementalSync = async () => {
    if (!settings?.webdav.enabled) {
      Alert.alert('Error', 'WebDAV is not enabled');
      return;
    }

    setIsSyncing(true);
    try {
      const syncRecord = await syncService.performIncrementalSync(settings.webdav);

      // Reload data if sync was successful
      if (syncRecord.status === 'success') {
        await loadData();
      }

      // Update sync records
      const updatedSyncRecords = [syncRecord, ...syncRecords.slice(0, 49)];
      setSyncRecords(updatedSyncRecords);
      await loadSyncStatus();

      Alert.alert(
        syncRecord.status === 'success' ? 'Success' : 'Error',
        syncRecord.message
      );
    } catch (error) {
      Alert.alert('Error', 'Smart sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const exportAllData = async () => {
    setIsExporting(true);
    try {
      const result = await ImportExportService.exportData();

      if (result.success) {
        Alert.alert(
          'Export Complete',
          result.message,
          [
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const importData = async () => {
    setIsImporting(true);
    try {
      const result = await ImportExportService.importData();

      if (result.success) {
        await loadData(); // Reload data after successful import

        let message = result.message;
        if (result.importedData) {
          const { importedData } = result;
          message += `\n\nImported:
• ${importedData.tasks} tasks
• ${importedData.diaryEntries} diary entries
• ${importedData.goals} goals
• ${importedData.habits} habits
• ${importedData.pomodoroSessions} pomodoro sessions`;
        }

        Alert.alert('Import Complete', message);
      } else {
        Alert.alert('Import Failed', result.message);
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Import Error', errorMessage);
    } finally {
      setIsImporting(false);
    }
  };



  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.saveAllData({
                diaryEntries: [],
                tasks: [],
                pomodoroSessions: [],
                habits: [],
                personalSummaries: [],
                goals: [],
                syncRecords: [],
              });
              await loadData();
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const getOverviewStats = () => {
    const recentSummaries = summaries.length;
    return { recentSummaries };
  };

  const stats = getOverviewStats();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.overviewContent}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <FileText size={24} color="#F59E0B" />
                <Text style={styles.statNumber}>{stats.recentSummaries}</Text>
                <Text style={styles.statLabel}>Summaries</Text>
              </View>

              <View style={styles.statCard}>
                <Calendar size={24} color="#3B82F6" />
                <Text style={styles.statNumber}>
                  {syncStatus.lastSync ? formatDisplayDate(syncStatus.lastSync) : 'Never'}
                </Text>
                <Text style={styles.statLabel}>Last Sync</Text>
              </View>
            </View>

            <View style={styles.syncStatusCard}>
              <View style={styles.syncStatusHeader}>
                <Text style={styles.sectionTitle}>Sync Status</Text>
                <View style={styles.syncStatusIndicator}>
                  {syncService.isAutoSyncActive() ? (
                    <Wifi size={16} color="#10B981" />
                  ) : (
                    <WifiOff size={16} color="#EF4444" />
                  )}
                  <Text style={styles.syncStatusText}>
                    {syncService.isAutoSyncActive() ? 'Auto-sync Active' : 'Manual Only'}
                  </Text>
                </View>
              </View>

              {syncStatus.lastSync && (
                <Text style={styles.lastSyncText}>
                  Last sync: {formatDisplayDate(syncStatus.lastSync)}
                </Text>
              )}

              {syncStatus.nextSync && (
                <Text style={styles.nextSyncText}>
                  Next sync: {formatDisplayDate(syncStatus.nextSync)}
                </Text>
              )}
            </View>

            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {summaries.slice(0, 3).map((summary) => (
                <View key={summary.id} style={styles.activityItem}>
                  <Calendar size={16} color="#6B7280" />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{summary.title}</Text>
                    <Text style={styles.activityDate}>
                      {formatDisplayDate(summary.date)} • {summary.period}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );

      case 'summaries':
        return (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Personal Summaries</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowNewSummary(true)}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {summaries.map((summary) => (
              <View key={summary.id} style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>{summary.title}</Text>
                  <Text style={styles.summaryPeriod}>{summary.period}</Text>
                </View>

                <Text style={styles.summaryContent} numberOfLines={3}>
                  {summary.content}
                </Text>

                <Text style={styles.summaryDate}>
                  {formatDisplayDate(summary.date)}
                </Text>
              </View>
            ))}
          </View>
        );

      case 'sync':
        return (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Data Sync</Text>
              <TouchableOpacity
                style={styles.configButton}
                onPress={() => setShowWebDAVConfig(true)}
              >
                <Settings size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.syncStatus}>
              <View style={styles.syncStatusItem}>
                {settings?.webdav.enabled ? (
                  <Wifi size={20} color="#10B981" />
                ) : (
                  <WifiOff size={20} color="#EF4444" />
                )}
                <Text style={styles.syncStatusText}>
                  WebDAV: {settings?.webdav.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>

              <View style={styles.syncStatusItem}>
                {syncService.isAutoSyncActive() ? (
                  <RefreshCw size={20} color="#10B981" />
                ) : (
                  <Clock size={20} color="#6B7280" />
                )}
                <Text style={styles.syncStatusText}>
                  Auto-sync: {syncService.isAutoSyncActive() ? 'Active' : 'Disabled'}
                </Text>
              </View>

              {syncStatus.lastSync && (
                <Text style={styles.lastSyncText}>
                  Last sync: {formatDisplayDate(syncStatus.lastSync)}
                </Text>
              )}
            </View>

            <View style={styles.dataManagementSection}>
              <Text style={styles.sectionTitle}>Data Management</Text>

              {/* Cloud Sync Actions */}
              {settings?.webdav.enabled && (
                <View style={styles.syncSubsection}>
                  <Text style={styles.subsectionTitle}>Cloud Sync</Text>
                  <View style={styles.syncActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.uploadButton]}
                      onPress={() => performSync('upload')}
                      disabled={isSyncing || syncService.isSyncInProgress()}
                    >
                      {isSyncing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Upload size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.actionButtonText}>
                        {isSyncing ? 'Uploading...' : 'Upload'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.downloadButton]}
                      onPress={() => performSync('download')}
                      disabled={isSyncing || syncService.isSyncInProgress()}
                    >
                      {isSyncing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Download size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.actionButtonText}>
                        {isSyncing ? 'Downloading...' : 'Download'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.smartSyncButton]}
                      onPress={() => performIncrementalSync()}
                      disabled={isSyncing || syncService.isSyncInProgress()}
                    >
                      {isSyncing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <RefreshCw size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.actionButtonText}>
                        {isSyncing ? 'Syncing...' : 'Smart Sync'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Local Data Actions */}
              <View style={styles.localSubsection}>
                <Text style={styles.subsectionTitle}>Local Data</Text>
                <View style={styles.localActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.exportButton]}
                    onPress={exportAllData}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <FileDown size={16} color="#8B5CF6" />
                    )}
                    <Text style={[styles.actionButtonText, styles.localButtonText]}>Export File</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.importButton]}
                    onPress={importData}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <FileUp size={16} color="#8B5CF6" />
                    )}
                    <Text style={[styles.actionButtonText, styles.localButtonText]}>Import File</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.clearButton]}
                    onPress={clearAllData}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Clear All</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.syncHistory}>
              <Text style={styles.sectionTitle}>Sync History</Text>
              {syncRecords.slice(0, 10).map((record) => (
                <View key={record.id} style={styles.syncRecord}>
                  <View style={styles.syncRecordHeader}>
                    {record.status === 'success' ? (
                      <CheckCircle size={16} color="#10B981" />
                    ) : (
                      <XCircle size={16} color="#EF4444" />
                    )}
                    <Text style={styles.syncRecordType}>{record.type}</Text>
                    <Text style={styles.syncRecordTime}>
                      {new Date(record.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.syncRecordMessage}>{record.message}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'settings':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Settings</Text>

            <View style={styles.settingsSection}>
              <View style={styles.settingsSectionHeader}>
                <Bell size={20} color="#8B5CF6" />
                <Text style={styles.settingsSectionTitle}>Notifications</Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Task Reminders</Text>
                <Switch
                  value={settings?.notifications.taskReminders || false}
                  onValueChange={(value) => {
                    if (settings) {
                      const updatedSettings = {
                        ...settings,
                        notifications: { ...settings.notifications, taskReminders: value },
                      };
                      setSettings(updatedSettings);
                      StorageService.saveSettings(updatedSettings);
                    }
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                  thumbColor={settings?.notifications.taskReminders ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Sync Status</Text>
                <Switch
                  value={settings?.notifications.syncStatus || false}
                  onValueChange={(value) => {
                    if (settings) {
                      const updatedSettings = {
                        ...settings,
                        notifications: { ...settings.notifications, syncStatus: value },
                      };
                      setSettings(updatedSettings);
                      StorageService.saveSettings(updatedSettings);
                    }
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                  thumbColor={settings?.notifications.syncStatus ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Theme</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Switch
                  value={settings?.theme.darkMode || false}
                  onValueChange={(value) => {
                    if (settings) {
                      const updatedSettings = {
                        ...settings,
                        theme: { ...settings.theme, darkMode: value },
                      };
                      setSettings(updatedSettings);
                      StorageService.saveSettings(updatedSettings);
                    }
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                  thumbColor={settings?.theme.darkMode ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingsSectionHeader}>
                <User size={20} color="#8B5CF6" />
                <Text style={styles.settingsSectionTitle}>AI Model</Text>
              </View>
              <ModelSelector />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'summaries', label: 'Summaries', icon: FileText },
            { id: 'sync', label: 'Sync', icon: Cloud },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab.id as ProfileTab)}
              >
                <IconComponent
                  size={16}
                  color={activeTab === tab.id ? '#8B5CF6' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.id && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* WebDAV Config Modal */}
      <Modal
        visible={showWebDAVConfig}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWebDAVConfig(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>WebDAV Configuration</Text>
            <TouchableOpacity onPress={saveWebDAVConfig}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Server URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://your-webdav-server.com"
                value={webdavConfig.url}
                onChangeText={(text) => setWebdavConfig({ ...webdavConfig, url: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="your-username"
                value={webdavConfig.username}
                onChangeText={(text) => setWebdavConfig({ ...webdavConfig, username: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="your-password"
                value={webdavConfig.password}
                onChangeText={(text) => setWebdavConfig({ ...webdavConfig, password: text })}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <TouchableOpacity
              style={styles.testButton}
              onPress={testWebDAVConnection}
            >
              <Text style={styles.testButtonText}>Test Connection</Text>
            </TouchableOpacity>

            <View style={styles.switchGroup}>
              <Text style={styles.switchLabel}>Enable WebDAV Sync</Text>
              <Switch
                value={webdavConfig.enable}
                onValueChange={(value) => setWebdavConfig({ ...webdavConfig, enable: value })}
                trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                thumbColor={webdavConfig.enable ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.switchLabel}>Auto Sync</Text>
              <Switch
                value={webdavConfig.autoSync}
                onValueChange={(value) => setWebdavConfig({ ...webdavConfig, autoSync: value })}
                trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                thumbColor={webdavConfig.autoSync ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sync Frequency</Text>
              <View style={styles.frequencySelector}>
                {['hourly', 'daily', 'weekly', 'manual'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyOption,
                      webdavConfig.syncFrequency === freq && styles.selectedFrequency,
                    ]}
                    onPress={() => setWebdavConfig({ ...webdavConfig, syncFrequency: freq as any })}
                  >
                    <Text style={[
                      styles.frequencyText,
                      webdavConfig.syncFrequency === freq && styles.selectedFrequencyText,
                    ]}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>



      {/* New Summary Modal */}
      <Modal
        visible={showNewSummary}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewSummary(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Summary</Text>
            <TouchableOpacity onPress={saveSummary}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Summary title..."
                value={newSummary.title}
                onChangeText={(text) => setNewSummary({ ...newSummary, title: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your summary..."
                value={newSummary.content}
                onChangeText={(text) => setNewSummary({ ...newSummary, content: text })}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Period</Text>
              <View style={styles.frequencySelector}>
                {['daily', 'weekly', 'monthly', 'yearly'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.frequencyOption,
                      newSummary.period === period && styles.selectedFrequency,
                    ]}
                    onPress={() => setNewSummary({ ...newSummary, period: period as PersonalSummary['period'] })}
                  >
                    <Text style={[
                      styles.frequencyText,
                      newSummary.period === period && styles.selectedFrequencyText,
                    ]}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#111827',
  },
  tabBar: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#F3F4F6',
    borderColor: '#8B5CF6',
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  overviewContent: {
    paddingBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  syncStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  syncStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncStatusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  lastSyncText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  nextSyncText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#8B5CF6',
  },
  recentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityContent: {
    marginLeft: 12,
    flex: 1,
  },
  activityTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  activityDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tabContent: {
    paddingBottom: 20,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  summaryPeriod: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8B5CF6',
    textTransform: 'capitalize',
  },
  summaryContent: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  summaryDate: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  syncStatus: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  syncStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 3,
    marginBottom: 8,
    minWidth: '30%',
  },
  uploadButton: {
    backgroundColor: '#8B5CF6',
  },
  downloadButton: {
    backgroundColor: '#10B981',
  },
  incrementalButton: {
    backgroundColor: '#F59E0B',
  },
  syncButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  localDataSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  localDataActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  localDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    minWidth: '30%',
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
  },
  localDataButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#8B5CF6',
    marginLeft: 8,
  },
  dangerButtonText: {
    color: '#EF4444',
  },
  dataManagementSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  syncSubsection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  localSubsection: {
    marginBottom: 8,
  },
  subsectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  localActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginHorizontal: 3,
    marginBottom: 8,
    minWidth: '30%',
  },
  actionButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    marginLeft: 6,
  },
  smartSyncButton: {
    backgroundColor: '#F59E0B',
  },
  exportButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  importButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  clearButton: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  localButtonText: {
    color: '#8B5CF6',
  },
  syncHistory: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  syncRecord: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  syncRecordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  syncRecordType: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#111827',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  syncRecordTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 'auto',
  },
  syncRecordMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 24,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsSectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#111827',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cancelButton: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  saveButton: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#8B5CF6',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
  },
  testButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  switchLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  frequencySelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedFrequency: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  frequencyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  selectedFrequencyText: {
    color: '#111827',
  },

});