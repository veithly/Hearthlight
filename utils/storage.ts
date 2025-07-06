import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, WebDAVConfig, SyncRecord, AppSettings } from '@/types';

const STORAGE_KEYS = {
  DIARY_ENTRIES: 'diary_entries',
  TASKS: 'tasks',
  POMODORO_SESSIONS: 'pomodoro_sessions',
  HABITS: 'habits',
  PERSONAL_SUMMARIES: 'personal_summaries',
  GOALS: 'goals',
  SETTINGS: 'settings',
  SYNC_RECORDS: 'sync_records',
  CONVERSATIONS: 'conversations',
  FOCUS_SESSIONS: 'focus_sessions',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#3B82F6',
    accentColor: '#10B981',
    darkMode: false,
  },
  webdav: {
    url: '',
    username: '',
    password: '',
    enabled: false,
    autoSync: false,
    syncInterval: 60,
    syncFrequency: 'daily',
  },
  notifications: {
    enabled: true,
    taskReminders: true,
    habitReminders: true,
    pomodoroBreaks: true,
    goalDeadlines: true,
    syncStatus: true,
  },
  ai: {
    providers: [],
    activeProvider: '',
    features: {
      taskPlanning: true,
      diaryAssistance: true,
      goalAnalysis: true,
      autoSuggestions: true,
    },
  },
  reminders: [],
};

export const StorageService = {
  async getDiaryEntries() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DIARY_ENTRIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading diary entries:', error);
      return [];
    }
  },

  async saveDiaryEntries(entries: any[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DIARY_ENTRIES, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving diary entries:', error);
    }
  },

  async getTasks() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  },

  async saveTasks(tasks: any[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  },

  async getPomodoroSessions() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.POMODORO_SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading pomodoro sessions:', error);
      return [];
    }
  },

  async savePomodoroSessions(sessions: any[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.POMODORO_SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving pomodoro sessions:', error);
    }
  },

  async getHabits() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HABITS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading habits:', error);
      return [];
    }
  },

  async saveHabits(habits: any[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    } catch (error) {
      console.error('Error saving habits:', error);
    }
  },

  async getPersonalSummaries() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PERSONAL_SUMMARIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading personal summaries:', error);
      return [];
    }
  },

  async savePersonalSummaries(summaries: any[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PERSONAL_SUMMARIES, JSON.stringify(summaries));
    } catch (error) {
      console.error('Error saving personal summaries:', error);
    }
  },

  async getGoals() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading goals:', error);
      return [];
    }
  },

  async saveGoals(goals: any[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: AppSettings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  async getSyncRecords(): Promise<SyncRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_RECORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading sync records:', error);
      return [];
    }
  },

  async saveSyncRecords(records: SyncRecord[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_RECORDS, JSON.stringify(records));
    } catch (error) {
      console.error('Error saving sync records:', error);
    }
  },

  async getConversation(threadId: string) {
    try {
      const allConversations = await this.getAllConversations();
      return allConversations[threadId] || [];
    } catch (error) {
      console.error(`Error loading conversation ${threadId}:`, error);
      return [];
    }
  },

  async saveConversation(threadId: string, messages: any[]) {
    try {
      const allConversations = await this.getAllConversations();
      allConversations[threadId] = messages;
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(allConversations));
    } catch (error) {
      console.error(`Error saving conversation ${threadId}:`, error);
    }
  },

  async getAllConversations(): Promise<{ [key: string]: any[] }> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading all conversations:', error);
      return {};
    }
  },

  async deleteConversation(threadId: string) {
    try {
      const allConversations = await this.getAllConversations();
      delete allConversations[threadId];
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(allConversations));
    } catch (error) {
      console.error(`Error deleting conversation ${threadId}:`, error);
    }
  },

  async getFocusSessions() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FOCUS_SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading focus sessions:', error);
      return [];
    }
  },

  async saveFocusSessions(sessions: any[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOCUS_SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving focus sessions:', error);
    }
  },

  async getAllData(): Promise<Partial<AppState>> {
    try {
      const [
        diaryEntries,
        tasks,
        pomodoroSessions,
        habits,
        personalSummaries,
        goals,
        settings,
        syncRecords,
      ] = await Promise.all([
        this.getDiaryEntries(),
        this.getTasks(),
        this.getPomodoroSessions(),
        this.getHabits(),
        this.getPersonalSummaries(),
        this.getGoals(),
        this.getSettings(),
        this.getSyncRecords(),
      ]);

      return {
        diaryEntries,
        tasks,
        pomodoroSessions,
        habits,
        personalSummaries,
        goals,
        settings,
        syncRecords,
      };
    } catch (error) {
      console.error('Error loading all data:', error);
      return {};
    }
  },

  async saveAllData(data: Partial<AppState>) {
    try {
      const promises = [];

      if (data.diaryEntries) promises.push(this.saveDiaryEntries(data.diaryEntries));
      if (data.tasks) promises.push(this.saveTasks(data.tasks));
      if (data.pomodoroSessions) promises.push(this.savePomodoroSessions(data.pomodoroSessions));
      if (data.habits) promises.push(this.saveHabits(data.habits));
      if (data.personalSummaries) promises.push(this.savePersonalSummaries(data.personalSummaries));
      if (data.goals) promises.push(this.saveGoals(data.goals));
      if (data.settings) promises.push(this.saveSettings(data.settings));
      if (data.syncRecords) promises.push(this.saveSyncRecords(data.syncRecords));

      await Promise.all(promises);
    } catch (error) {
      console.error('Error saving all data:', error);
      throw error;
    }
  },
};