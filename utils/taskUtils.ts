import { Task, CompletedTask } from '@/types';
import { StorageService } from './storage';

/**
 * Utility functions for task management including recurring tasks and completion tracking
 */

/**
 * Calculate the next due date for a recurring task
 */
export function calculateNextDueDate(task: Task): string | undefined {
  if (!task.isRecurring || !task.recurringType || !task.lastCompletedAt) {
    return undefined;
  }

  const lastCompleted = new Date(task.lastCompletedAt);
  const interval = task.recurringInterval || 1;

  switch (task.recurringType) {
    case 'daily':
      lastCompleted.setDate(lastCompleted.getDate() + interval);
      break;
    case 'weekly':
      lastCompleted.setDate(lastCompleted.getDate() + (interval * 7));
      break;
    case 'monthly':
      lastCompleted.setMonth(lastCompleted.getMonth() + interval);
      break;
    case 'yearly':
      lastCompleted.setFullYear(lastCompleted.getFullYear() + interval);
      break;
  }

  return lastCompleted.toISOString();
}

/**
 * Check if a recurring task should be reset to pending
 */
export function shouldResetRecurringTask(task: Task): boolean {
  if (!task.isRecurring || !task.completed || !task.nextDueDate) {
    return false;
  }

  const now = new Date();
  const nextDue = new Date(task.nextDueDate);
  
  return now >= nextDue;
}

/**
 * Reset a recurring task to pending state
 */
export function resetRecurringTask(task: Task): Task {
  const now = new Date().toISOString();
  
  return {
    ...task,
    completed: false,
    updatedAt: now,
    lastCompletedAt: task.completedAt,
    nextDueDate: calculateNextDueDate(task),
    completedAt: undefined,
  };
}

/**
 * Convert a completed one-time task to a CompletedTask
 */
export function createCompletedTask(task: Task, timeToComplete?: number): CompletedTask {
  return {
    ...task,
    completedAt: task.completedAt || new Date().toISOString(),
    timeToComplete,
    pomodoroSessionsUsed: task.pomodoroSessions,
  };
}

/**
 * Process task completion - handles both one-time and recurring tasks
 */
export async function processTaskCompletion(
  taskId: string,
  tasks: Task[],
  timeToComplete?: number
): Promise<{ updatedTasks: Task[]; completedTask?: CompletedTask }> {
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    throw new Error('Task not found');
  }

  const task = tasks[taskIndex];
  const now = new Date().toISOString();
  
  // Mark task as completed
  const completedTask = {
    ...task,
    completed: true,
    completedAt: now,
    updatedAt: now,
  };

  let updatedTasks = [...tasks];
  let archivedTask: CompletedTask | undefined;

  if (task.isRecurring) {
    // For recurring tasks, calculate next due date
    const nextDueDate = calculateNextDueDate(completedTask);
    updatedTasks[taskIndex] = {
      ...completedTask,
      nextDueDate,
    };
  } else {
    // For one-time tasks, remove from active tasks and add to completed tasks
    updatedTasks.splice(taskIndex, 1);
    archivedTask = createCompletedTask(completedTask, timeToComplete);
    
    // Save to completed tasks storage
    const existingCompletedTasks = await StorageService.getCompletedTasks();
    await StorageService.saveCompletedTasks([...existingCompletedTasks, archivedTask]);
  }

  return { updatedTasks, completedTask: archivedTask };
}

/**
 * Process all recurring tasks and reset those that are due
 */
export function processRecurringTasks(tasks: Task[]): Task[] {
  return tasks.map(task => {
    if (shouldResetRecurringTask(task)) {
      return resetRecurringTask(task);
    }
    return task;
  });
}

/**
 * Get task statistics for a quadrant
 */
export function getQuadrantStats(tasks: Task[], quadrant: string) {
  const quadrantTasks = tasks.filter(task => task.quadrant === quadrant);
  const completed = quadrantTasks.filter(task => task.completed).length;
  const total = quadrantTasks.length;
  
  // Calculate overdue tasks
  const now = new Date();
  const overdue = quadrantTasks.filter(task => {
    if (task.completed || !task.dueDate) return false;
    return new Date(task.dueDate) < now;
  }).length;

  return { completed, total, overdue };
}

/**
 * Filter completed tasks by date range
 */
export function filterCompletedTasksByDateRange(
  completedTasks: CompletedTask[],
  startDate: Date,
  endDate: Date
): CompletedTask[] {
  return completedTasks.filter(task => {
    const completedAt = new Date(task.completedAt);
    return completedAt >= startDate && completedAt <= endDate;
  });
}

/**
 * Search completed tasks by title or description
 */
export function searchCompletedTasks(
  completedTasks: CompletedTask[],
  searchTerm: string
): CompletedTask[] {
  const term = searchTerm.toLowerCase();
  return completedTasks.filter(task =>
    task.title.toLowerCase().includes(term) ||
    task.description.toLowerCase().includes(term)
  );
}

/**
 * Sort completed tasks by various criteria
 */
export function sortCompletedTasks(
  completedTasks: CompletedTask[],
  sortBy: 'completedAt' | 'title' | 'priority' | 'timeToComplete'
): CompletedTask[] {
  return [...completedTasks].sort((a, b) => {
    switch (sortBy) {
      case 'completedAt':
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'timeToComplete':
        return (b.timeToComplete || 0) - (a.timeToComplete || 0);
      default:
        return 0;
    }
  });
}
