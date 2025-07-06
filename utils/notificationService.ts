import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Reminder, Task, Habit, Goal } from '@/types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      // Web notifications require different handling
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async scheduleReminder(reminder: Reminder): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return this.scheduleWebNotification(reminder);
      }

      const trigger = this.createTrigger(reminder);
      if (!trigger) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.message,
          data: { reminderId: reminder.id, type: reminder.type },
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  private scheduleWebNotification(reminder: Reminder): string | null {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }

    const reminderTime = new Date(reminder.time);
    const now = new Date();
    const delay = reminderTime.getTime() - now.getTime();

    if (delay <= 0) return null;

    const timeoutId = setTimeout(() => {
      new Notification(reminder.title, {
        body: reminder.message,
        icon: '/icon.png',
        tag: reminder.id,
      });
    }, delay);

    return timeoutId.toString();
  }

  private createTrigger(reminder: Reminder): any {
    const reminderTime = new Date(reminder.time);
    const now = new Date();

    switch (reminder.frequency) {
      case 'once':
        if (reminderTime <= now) return null;
        return { date: reminderTime };

      case 'daily':
        return {
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
          repeats: true,
        };

      case 'weekly':
        return {
          weekday: reminderTime.getDay() + 1, // Expo uses 1-7 for Sunday-Saturday
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
          repeats: true,
        };

      case 'monthly':
        return {
          day: reminderTime.getDate(),
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
          repeats: true,
        };

      default:
        return null;
    }
  }

  async cancelReminder(notificationId: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        clearTimeout(parseInt(notificationId));
        return;
      }

      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async scheduleTaskReminder(task: Task): Promise<void> {
    if (!task.dueDate) return;

    const dueDate = new Date(task.dueDate);
    const reminderTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before

    const reminder: Reminder = {
      id: `task-${task.id}`,
      title: 'Task Due Tomorrow',
      message: `Don't forget: ${task.title}`,
      type: 'task',
      time: reminderTime.toISOString(),
      frequency: 'once',
      enabled: true,
      targetId: task.id,
      createdAt: new Date().toISOString(),
    };

    await this.scheduleReminder(reminder);
  }

  async scheduleHabitReminder(habit: Habit): Promise<void> {
    for (const reminder of habit.reminders) {
      if (reminder.enabled) {
        await this.scheduleReminder(reminder);
      }
    }
  }

  async scheduleGoalDeadlineReminder(goal: Goal): Promise<void> {
    const targetDate = new Date(goal.targetDate);
    const reminderTime = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week before

    const reminder: Reminder = {
      id: `goal-${goal.id}`,
      title: 'Goal Deadline Approaching',
      message: `Your goal "${goal.title}" is due in one week`,
      type: 'goal',
      time: reminderTime.toISOString(),
      frequency: 'once',
      enabled: true,
      targetId: goal.id,
      createdAt: new Date().toISOString(),
    };

    await this.scheduleReminder(reminder);
  }

  async showSyncNotification(success: boolean, message: string): Promise<void> {
    if (Platform.OS === 'web') {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(success ? 'Sync Successful' : 'Sync Failed', {
          body: message,
          icon: '/icon.png',
        });
      }
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: success ? 'Sync Successful' : 'Sync Failed',
        body: message,
      },
      trigger: null, // Show immediately
    });
  }
}

export const notificationService = NotificationService.getInstance();