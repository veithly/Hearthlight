export interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: 'happy' | 'neutral' | 'sad' | 'excited' | 'stressed';
  tags: string[];
  template: 'free' | 'gratitude' | 'reflection' | 'goals';
  createdAt: string;
  updatedAt: string;
  isMarkdown?: boolean;
  aiSuggestions?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  quadrant: 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important';
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  pomodoroSessions: number;
  priority: 'low' | 'medium' | 'high';
  estimatedTime?: number;
  aiGenerated?: boolean;
  parentGoalId?: string;
  // Recurring task properties
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringInterval?: number; // e.g., every 2 days, every 3 weeks
  lastCompletedAt?: string;
  nextDueDate?: string;
  // Completion tracking
  completedAt?: string;
  isOneTime?: boolean; // true for one-time tasks, false for recurring
}

export interface CompletedTask extends Task {
  completedAt: string;
  timeToComplete?: number; // in minutes
  pomodoroSessionsUsed?: number;
}

export interface UserActivity {
  id: string;
  type: 'task_completed' | 'task_created' | 'diary_entry_created' | 'diary_entry_updated' | 'goal_created' | 'goal_updated' | 'habit_completed' | 'pomodoro_completed' | 'ai_interaction';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    taskId?: string;
    diaryEntryId?: string;
    goalId?: string;
    habitId?: string;
    pomodoroSessionId?: string;
    aiConversationId?: string;
    duration?: number; // in minutes
    quadrant?: string;
    mood?: string;
    category?: string;
    [key: string]: any;
  };
}

export interface PomodoroSession {
  id: string;
  date: string;
  workDuration: number;
  breakDuration: number;
  sessionsCompleted: number;
  totalFocusTime: number;
  taskId?: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  color: string;
  frequency: 'daily' | 'weekly';
  targetDays: number[];
  currentStreak: number;
  longestStreak: number;
  completedDates: string[];
  createdAt: string;
  reminders: Reminder[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'personal' | 'career' | 'health' | 'finance' | 'learning' | 'relationship';
  type: 'yearly' | 'monthly' | 'weekly';
  targetDate: string;
  progress: number;
  milestones: Milestone[];
  subGoals: Goal[];
  parentGoalId?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  progress: number;
}

export interface Reminder {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'habit' | 'goal' | 'custom';
  time: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  targetId?: string;
  createdAt: string;
}

export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'gemini' | 'claude' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

export interface AIConfig {
  providers: AIProvider[];
  activeProvider: string;
  features: {
    taskPlanning: boolean;
    diaryAssistance: boolean;
    goalAnalysis: boolean;
    autoSuggestions: boolean;
  };
  conversation: {
    startFreshByDefault: boolean;
    allowContinuePrevious: boolean;
    autoSaveConversations: boolean;
  };
}

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // in minutes
  lastSync?: string;
  syncFrequency: 'hourly' | 'daily' | 'weekly' | 'manual';
}

export interface SyncRecord {
  id: string;
  timestamp: string;
  type: 'manual' | 'auto';
  status: 'success' | 'failed' | 'in-progress';
  message: string;
  dataTypes: string[];
  duration?: number;
}

export interface PomodoroSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // after how many work sessions
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  customReminders: {
    diaryLogging: {
      enabled: boolean;
      interval: number; // in minutes
      message: string;
    };
    taskPlanning: {
      enabled: boolean;
      interval: number; // in minutes
      message: string;
    };
    goalSetting: {
      enabled: boolean;
      interval: number; // in minutes
      message: string;
    };
    regularCheckIn: {
      enabled: boolean;
      interval: number; // in minutes
      message: string;
    };
  };
}

export interface AppSettings {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    darkMode: boolean;
  };
  webdav: WebDAVConfig;
  ai: AIConfig;
  pomodoro: PomodoroSettings;
  notifications: {
    enabled: boolean;
    taskReminders: boolean;
    habitReminders: boolean;
    pomodoroBreaks: boolean;
    goalDeadlines: boolean;
    syncStatus: boolean;
  };
  reminders: Reminder[];
}

export interface PersonalSummary {
  id: string;
  date: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  title: string;
  content: string;
  achievements: string[];
  challenges: string[];
  learnings: string[];
  gratitude: string[];
  createdAt: string;
  updatedAt: string;
  aiInsights?: string;
}

export interface AppState {
  diaryEntries: DiaryEntry[];
  tasks: Task[];
  pomodoroSessions: PomodoroSession[];
  habits: Habit[];
  personalSummaries: PersonalSummary[];
  goals: Goal[];
  settings: AppSettings;
  syncRecords: SyncRecord[];
  reminders: Reminder[];
}