import { UserActivity } from '@/types';
import { StorageService } from './storage';

/**
 * Activity tracking service for recording user interactions
 */
export class ActivityTracker {
  private static instance: ActivityTracker;
  private activities: UserActivity[] = [];
  private maxActivities = 1000; // Keep last 1000 activities

  private constructor() {
    this.loadActivities();
  }

  static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker();
    }
    return ActivityTracker.instance;
  }

  private async loadActivities() {
    try {
      this.activities = await StorageService.getUserActivities();
    } catch (error) {
      console.error('Failed to load activities:', error);
      this.activities = [];
    }
  }

  private async saveActivities() {
    try {
      // Keep only the most recent activities
      if (this.activities.length > this.maxActivities) {
        this.activities = this.activities.slice(-this.maxActivities);
      }
      await StorageService.saveUserActivities(this.activities);
    } catch (error) {
      console.error('Failed to save activities:', error);
    }
  }

  /**
   * Record a new user activity
   */
  async recordActivity(activity: Omit<UserActivity, 'id' | 'timestamp'>) {
    const newActivity: UserActivity = {
      ...activity,
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.activities.unshift(newActivity); // Add to beginning for chronological order
    await this.saveActivities();
  }

  /**
   * Get recent activities with optional filtering
   */
  getRecentActivities(
    limit: number = 50,
    type?: UserActivity['type'],
    since?: Date
  ): UserActivity[] {
    let filtered = this.activities;

    if (type) {
      filtered = filtered.filter(activity => activity.type === type);
    }

    if (since) {
      filtered = filtered.filter(activity => new Date(activity.timestamp) >= since);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Get activities for today
   */
  getTodayActivities(): UserActivity[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getRecentActivities(100, undefined, today);
  }

  /**
   * Get activity statistics for a time period
   */
  getActivityStats(since?: Date): {
    totalActivities: number;
    taskCompletions: number;
    diaryEntries: number;
    goalUpdates: number;
    habitCompletions: number;
    pomodoroSessions: number;
    aiInteractions: number;
  } {
    const activities = since ? 
      this.activities.filter(activity => new Date(activity.timestamp) >= since) :
      this.activities;

    return {
      totalActivities: activities.length,
      taskCompletions: activities.filter(a => a.type === 'task_completed').length,
      diaryEntries: activities.filter(a => a.type === 'diary_entry_created').length,
      goalUpdates: activities.filter(a => a.type === 'goal_updated').length,
      habitCompletions: activities.filter(a => a.type === 'habit_completed').length,
      pomodoroSessions: activities.filter(a => a.type === 'pomodoro_completed').length,
      aiInteractions: activities.filter(a => a.type === 'ai_interaction').length,
    };
  }

  /**
   * Get activity timeline for display
   */
  getActivityTimeline(days: number = 7): UserActivity[] {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.getRecentActivities(200, undefined, since);
  }

  /**
   * Clear old activities (keep only recent ones)
   */
  async clearOldActivities(keepDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);
    
    this.activities = this.activities.filter(
      activity => new Date(activity.timestamp) >= cutoffDate
    );
    
    await this.saveActivities();
  }
}

// Convenience functions for common activity types
export const activityTracker = ActivityTracker.getInstance();

export const trackTaskCompletion = (taskId: string, title: string, quadrant: string, duration?: number) => {
  activityTracker.recordActivity({
    type: 'task_completed',
    title: `Completed: ${title}`,
    metadata: { taskId, quadrant, duration }
  });
};

export const trackTaskCreation = (taskId: string, title: string, quadrant: string) => {
  activityTracker.recordActivity({
    type: 'task_created',
    title: `Created task: ${title}`,
    metadata: { taskId, quadrant }
  });
};

export const trackDiaryEntry = (entryId: string, title: string, mood?: string) => {
  activityTracker.recordActivity({
    type: 'diary_entry_created',
    title: `New diary entry: ${title}`,
    metadata: { diaryEntryId: entryId, mood }
  });
};

export const trackGoalCreation = (goalId: string, title: string, category: string) => {
  activityTracker.recordActivity({
    type: 'goal_created',
    title: `Created goal: ${title}`,
    metadata: { goalId, category }
  });
};

export const trackGoalUpdate = (goalId: string, title: string, progress: number) => {
  activityTracker.recordActivity({
    type: 'goal_updated',
    title: `Updated goal: ${title}`,
    description: `Progress: ${progress}%`,
    metadata: { goalId, progress }
  });
};

export const trackHabitCompletion = (habitId: string, name: string) => {
  activityTracker.recordActivity({
    type: 'habit_completed',
    title: `Completed habit: ${name}`,
    metadata: { habitId }
  });
};

export const trackPomodoroSession = (sessionId: string, duration: number, taskId?: string) => {
  activityTracker.recordActivity({
    type: 'pomodoro_completed',
    title: `Completed ${duration}min focus session`,
    metadata: { pomodoroSessionId: sessionId, duration, taskId }
  });
};

export const trackAIInteraction = (conversationId: string, message: string) => {
  activityTracker.recordActivity({
    type: 'ai_interaction',
    title: 'AI Assistant interaction',
    description: message.length > 100 ? message.substring(0, 100) + '...' : message,
    metadata: { aiConversationId: conversationId }
  });
};
