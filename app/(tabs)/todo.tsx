import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Filter, Clock, CircleAlert as AlertCircle, Target, Zap, Calendar, TrendingUp, Award, SquareCheck as CheckSquare, Sparkles, Archive, Search } from 'lucide-react-native';
import { Task, Goal, Habit, AIProvider, CompletedTask } from '@/types';
import { StorageService } from '@/utils/storage';
import { createAIService } from '@/utils/aiService';
import { formatDate, formatDisplayDate } from '@/utils/dateUtils';
import { processTaskCompletion, processRecurringTasks, getQuadrantStats } from '@/utils/taskUtils';
import { trackTaskCompletion, trackTaskCreation } from '@/utils/activityTracker';
import TaskCard from '@/components/TaskCard';
import HabitCard from '@/components/HabitCard';
import DatePicker from '@/components/DatePicker';
import TaskDetailModal from '@/components/TaskDetailModal';
import GlassBackground from '@/components/GlassBackground';

type TodoTab = 'tasks' | 'habits' | 'goals' | 'completed';

const QUADRANTS = [
  {
    id: 'urgent-important',
    title: 'Urgent & Important',
    subtitle: 'Do First',
    color: '#EF4444',
  },
  {
    id: 'not-urgent-important',
    title: 'Important, Not Urgent',
    subtitle: 'Schedule',
    color: '#F59E0B',
  },
  {
    id: 'urgent-not-important',
    title: 'Urgent, Not Important',
    subtitle: 'Delegate',
    color: '#8B5CF6',
  },
  {
    id: 'not-urgent-not-important',
    title: 'Neither Urgent nor Important',
    subtitle: 'Eliminate',
    color: '#6B7280',
  },
];

const HABIT_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

export default function TodoScreen() {
  const [activeTab, setActiveTab] = useState<TodoTab>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewHabit, setShowNewHabit] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'created' | 'dueDate' | 'priority'>('created');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    quadrant: 'not-urgent-important' as Task['quadrant'],
    dueDate: '',
    priority: 'medium' as Task['priority'],
    estimatedTime: 60,
  });

  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    color: HABIT_COLORS[0],
    frequency: 'daily' as 'daily' | 'weekly',
  });

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'personal' as Goal['category'],
    type: 'monthly' as Goal['type'],
    targetDate: '',
    priority: 'medium' as Goal['priority'],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [loadedTasks, loadedHabits, loadedGoals, loadedCompletedTasks] = await Promise.all([
      StorageService.getTasks(),
      StorageService.getHabits(),
      StorageService.getGoals(),
      StorageService.getCompletedTasks(),
    ]);

    // Process recurring tasks to reset those that are due
    const processedTasks = processRecurringTasks(loadedTasks);

    // Save processed tasks if any were reset
    if (JSON.stringify(processedTasks) !== JSON.stringify(loadedTasks)) {
      await StorageService.saveTasks(processedTasks);
    }

    setTasks(processedTasks);
    setHabits(loadedHabits);
    setGoals(loadedGoals);
    setCompletedTasks(loadedCompletedTasks);
  };

  const saveTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      quadrant: newTask.quadrant,
      completed: false,
      dueDate: newTask.dueDate || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pomodoroSessions: 0,
      priority: newTask.priority,
      estimatedTime: newTask.estimatedTime,
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    await StorageService.saveTasks(updatedTasks);

    // Track task creation activity
    trackTaskCreation(task.id, task.title, task.quadrant);

    setShowNewTask(false);
    setNewTask({
      title: '',
      description: '',
      quadrant: 'not-urgent-important',
      dueDate: '',
      priority: 'medium',
      estimatedTime: 60,
    });
  };

  const saveHabit = async () => {
    if (!newHabit.name.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    const habit: Habit = {
      id: Date.now().toString(),
      name: newHabit.name,
      description: newHabit.description,
      color: newHabit.color,
      frequency: newHabit.frequency,
      targetDays: newHabit.frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5],
      currentStreak: 0,
      longestStreak: 0,
      completedDates: [],
      createdAt: new Date().toISOString(),
      reminders: [],
    };

    const updatedHabits = [...habits, habit];
    setHabits(updatedHabits);
    await StorageService.saveHabits(updatedHabits);

    setShowNewHabit(false);
    setNewHabit({
      name: '',
      description: '',
      color: HABIT_COLORS[0],
      frequency: 'daily',
    });
  };

  const saveGoal = async () => {
    if (!newGoal.title.trim() || !newGoal.targetDate) {
      Alert.alert('Error', 'Please fill in title and target date');
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      description: newGoal.description,
      category: newGoal.category,
      type: newGoal.type,
      targetDate: newGoal.targetDate,
      progress: 0,
      milestones: [],
      subGoals: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: newGoal.priority,
    };

    const updatedGoals = [...goals, goal];
    setGoals(updatedGoals);
    await StorageService.saveGoals(updatedGoals);

    setShowNewGoal(false);
    setNewGoal({
      title: '',
      description: '',
      category: 'personal',
      type: 'monthly',
      targetDate: '',
      priority: 'medium',
    });
  };

  const toggleTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      if (!task.completed) {
        // Completing the task
        const { updatedTasks, completedTask } = await processTaskCompletion(taskId, tasks);
        setTasks(updatedTasks);
        await StorageService.saveTasks(updatedTasks);

        // Track task completion activity
        trackTaskCompletion(task.id, task.title, task.quadrant, task.estimatedTime);

        if (completedTask) {
          // Update completed tasks state
          setCompletedTasks(prev => [completedTask, ...prev]);
        }
      } else {
        // Uncompleting the task (for recurring tasks)
        const updatedTasks = tasks.map(t =>
          t.id === taskId
            ? { ...t, completed: false, completedAt: undefined, updatedAt: new Date().toISOString() }
            : t
        );
        setTasks(updatedTasks);
        await StorageService.saveTasks(updatedTasks);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleTaskDetailClose = () => {
    setShowTaskDetail(false);
    setSelectedTask(null);
  };

  const handleTaskUpdate = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  };

  const toggleHabit = async (habitId: string) => {
    const today = formatDate(new Date());

    const updatedHabits = habits.map(habit => {
      if (habit.id !== habitId) return habit;

      const isCompletedToday = habit.completedDates.includes(today);
      let newCompletedDates = [...habit.completedDates];
      let newCurrentStreak = habit.currentStreak;
      let newLongestStreak = habit.longestStreak;

      if (isCompletedToday) {
        newCompletedDates = newCompletedDates.filter(date => date !== today);
        newCurrentStreak = Math.max(0, newCurrentStreak - 1);
      } else {
        newCompletedDates.push(today);
        newCompletedDates.sort();
        newCurrentStreak = calculateStreak(newCompletedDates);
        newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
      }

      return {
        ...habit,
        completedDates: newCompletedDates,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
      };
    });

    setHabits(updatedHabits);
    await StorageService.saveHabits(updatedHabits);
  };

  const calculateStreak = (completedDates: string[]): number => {
    if (completedDates.length === 0) return 0;

    const sortedDates = completedDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const today = new Date();
    let streak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (formatDate(date) === formatDate(expectedDate)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const getTasksByQuadrant = (quadrant: string) => {
    let quadrantTasks = tasks.filter(task => task.quadrant === quadrant);

    switch (sortBy) {
      case 'dueDate':
        quadrantTasks.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        quadrantTasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        break;
      default:
        quadrantTasks.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return quadrantTasks;
  };



  const handleSuggestTasks = async () => {
    try {
      const settings = await StorageService.getSettings();
      const activeProvider = settings.ai.providers.find(p => p.id === settings.ai.activeProvider);

      if (!activeProvider || !activeProvider.enabled || !settings.ai.features.autoSuggestions) {
        Alert.alert('AI Assistant', 'Please configure an AI provider and enable task suggestions in the AI Assistant tab first.');
        return;
      }

      const goals = await StorageService.getGoals();
      const aiService = createAIService(activeProvider);
      const suggestions = await aiService.generateTaskSuggestions(goals, tasks);

      if (suggestions.length > 0) {
        Alert.alert(
          'AI Task Suggestions',
          `The AI has suggested ${suggestions.length} new tasks. Would you like to add them to your list?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add All',
              onPress: async () => {
                const updatedTasks = [...tasks, ...suggestions];
                setTasks(updatedTasks);
                await StorageService.saveTasks(updatedTasks);
              },
            },
          ]
        );
      } else {
        Alert.alert('AI Assistant', 'No new task suggestions at this time.');
      }
    } catch (error) {
      console.error('Failed to generate task suggestions:', error);
      Alert.alert('AI Assistant', 'Unable to generate task suggestions at this time.');
    }
  };

  const getOverallStats = () => {
    const today = formatDate(new Date());
    const completedHabitsToday = habits.filter(habit =>
      habit.completedDates.includes(today)
    ).length;

    const activeGoals = goals.filter(g => g.status === 'active').length;
    const completedTasks = tasks.filter(t => t.completed).length;

    return { completedHabitsToday, totalHabits: habits.length, activeGoals, completedTasks };
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tasks':
        return (
          <View style={styles.tabContent}>
            <View style={styles.sortIndicator}>
              <Text style={styles.sortText}>
                Sorted by: {sortBy === 'created' ? 'Created Date' : sortBy === 'dueDate' ? 'Due Date' : 'Priority'}
              </Text>
            </View>

            <View style={styles.quadrantsGrid}>
              {QUADRANTS.filter((quadrant) => {
                const stats = getQuadrantStats(tasks, quadrant.id);
                return stats.total > 0; // Only show quadrants with tasks
              }).map((quadrant) => {
                const stats = getQuadrantStats(tasks, quadrant.id);
                const quadrantTasks = getTasksByQuadrant(quadrant.id);

                return (
                  <View key={quadrant.id} style={styles.quadrantContainer}>
                    <TouchableOpacity
                      style={[styles.quadrantHeader, { borderLeftColor: quadrant.color }]}
                      onPress={() => setSelectedQuadrant(
                        selectedQuadrant === quadrant.id ? null : quadrant.id
                      )}
                    >
                      <View>
                        <Text style={styles.quadrantTitle}>{quadrant.title}</Text>
                        <Text style={styles.quadrantSubtitle}>{quadrant.subtitle}</Text>
                      </View>
                      <View style={styles.statsContainer}>
                        <Text style={styles.statsText}>
                          {stats.completed}/{stats.total}
                        </Text>
                        {stats.overdue > 0 && (
                          <View style={styles.overdueIndicator}>
                            <AlertCircle size={12} color="#EF4444" />
                            <Text style={styles.overdueText}>{stats.overdue}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {(selectedQuadrant === quadrant.id || selectedQuadrant === null) && (
                      <View style={styles.tasksContainer}>
                        {quadrantTasks.length === 0 ? (
                          <Text style={styles.emptyText}>No tasks in this quadrant</Text>
                        ) : (
                          quadrantTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onToggle={() => toggleTask(task.id)}
                              onPress={() => handleTaskPress(task)}
                              onSuggest={handleSuggestTasks}
                            />
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Show empty state if no quadrants have tasks */}
            {QUADRANTS.filter((quadrant) => {
              const stats = getQuadrantStats(tasks, quadrant.id);
              return stats.total > 0;
            }).length === 0 && (
              <View style={styles.emptyState}>
                <CheckSquare size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No tasks yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first task to get started with the Eisenhower Matrix
                </Text>
              </View>
            )}
          </View>
        );

      case 'habits':
        return (
          <View style={styles.tabContent}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <TrendingUp size={20} color="#10B981" />
                <Text style={styles.statNumber}>{getOverallStats().completedHabitsToday}/{getOverallStats().totalHabits}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>

              <View style={styles.statCard}>
                <Calendar size={20} color="#3B82F6" />
                <Text style={styles.statNumber}>
                  {habits.length > 0 ? Math.round(habits.reduce((sum, h) => sum + h.currentStreak, 0) / habits.length) : 0}
                </Text>
                <Text style={styles.statLabel}>Avg. Streak</Text>
              </View>

              <View style={styles.statCard}>
                <Award size={20} color="#F59E0B" />
                <Text style={styles.statNumber}>
                  {Math.max(...habits.map(h => h.longestStreak), 0)}
                </Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>

            {habits.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No habits yet</Text>
                <Text style={styles.emptyText}>Start building positive habits today</Text>
              </View>
            ) : (
              habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggle={() => toggleHabit(habit.id)}
                />
              ))
            )}
          </View>
        );

      case 'goals':
        return (
          <View style={styles.tabContent}>
            <View style={styles.goalTypeTabs}>
              {['yearly', 'monthly', 'weekly'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.goalTypeTab}
                >
                  <Text style={styles.goalTypeTabText}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {goals.map((goal) => (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <View style={[styles.goalStatus,
                    goal.status === 'completed' && styles.goalStatusCompleted
                  ]}>
                    <Text style={[styles.goalStatusText,
                      goal.status === 'completed' && styles.goalStatusTextCompleted
                    ]}>
                      {goal.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.goalDescription} numberOfLines={2}>
                  {goal.description}
                </Text>

                <View style={styles.goalProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${goal.progress}%` }]}
                    />
                  </View>
                  <Text style={styles.progressText}>{goal.progress}%</Text>
                </View>

                <View style={styles.goalMeta}>
                  <Text style={styles.goalCategory}>{goal.category}</Text>
                  <Text style={styles.goalType}>{goal.type}</Text>
                  <Text style={styles.goalDate}>
                    Due: {formatDisplayDate(goal.targetDate)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        );

      case 'completed':
        return (
          <View style={styles.tabContent}>
            <View style={styles.completedHeader}>
              <Text style={styles.completedTitle}>
                Completed Tasks ({completedTasks.length})
              </Text>
              <TouchableOpacity style={styles.searchButton}>
                <Search size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.completedList}>
              {completedTasks.length === 0 ? (
                <View style={styles.completedEmptyState}>
                  <Archive size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateText}>No completed tasks yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Complete some tasks to see them here
                  </Text>
                </View>
              ) : (
                completedTasks.map((task) => (
                  <View key={task.id} style={styles.completedTaskCard}>
                    <View style={styles.completedTaskHeader}>
                      <Text style={styles.completedTaskTitle}>{task.title}</Text>
                      <Text style={styles.completedTaskDate}>
                        {formatDisplayDate(task.completedAt)}
                      </Text>
                    </View>
                    {task.description && (
                      <Text style={styles.completedTaskDescription}>
                        {task.description}
                      </Text>
                    )}
                    <View style={styles.completedTaskMeta}>
                      <View style={styles.completedTaskQuadrant}>
                        <Text style={styles.completedTaskQuadrantText}>
                          {QUADRANTS.find(q => q.id === task.quadrant)?.subtitle}
                        </Text>
                      </View>
                      {task.timeToComplete && (
                        <Text style={styles.completedTaskTime}>
                          {task.timeToComplete}min
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Todo</Text>
          <View style={styles.headerActions}>
            {activeTab === 'tasks' && (
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => {
                  const sortOptions = ['created', 'dueDate', 'priority'];
                  const currentIndex = sortOptions.indexOf(sortBy);
                  const nextIndex = (currentIndex + 1) % sortOptions.length;
                  setSortBy(sortOptions[nextIndex] as any);
                }}
              >
                <Filter size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                if (activeTab === 'tasks') setShowNewTask(true);
                else if (activeTab === 'habits') setShowNewHabit(true);
                else if (activeTab === 'goals') setShowNewGoal(true);
              }}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'habits', label: 'Habits', icon: Zap },
            { id: 'goals', label: 'Goals', icon: Target },
            { id: 'completed', label: 'Completed', icon: Archive },
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab.id as TodoTab)}
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

      {/* Task Modal */}
      <Modal
        visible={showNewTask}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewTask(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Task</Text>
            <TouchableOpacity onPress={saveTask}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.titleInput}
              placeholder="Task title..."
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              style={styles.descriptionInput}
              placeholder="Description (optional)..."
              value={newTask.description}
              onChangeText={(text) => setNewTask({ ...newTask, description: text })}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.prioritySection}>
              <Text style={styles.sectionTitle}>Priority</Text>
              <View style={styles.priorityOptions}>
                {['low', 'medium', 'high'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      newTask.priority === priority && styles.selectedPriority,
                    ]}
                    onPress={() => setNewTask({ ...newTask, priority: priority as Task['priority'] })}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        newTask.priority === priority && styles.selectedPriorityText,
                      ]}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.dueDateSection}>
              <Text style={styles.sectionTitle}>Due Date (Optional)</Text>
              <DatePicker
                value={newTask.dueDate}
                onChange={(date) => setNewTask({ ...newTask, dueDate: date })}
                placeholder="Select due date"
              />
            </View>

            <View style={styles.quadrantSelector}>
              <Text style={styles.sectionTitle}>Choose Quadrant</Text>
              {QUADRANTS.map((quadrant) => (
                <TouchableOpacity
                  key={quadrant.id}
                  style={[
                    styles.quadrantOption,
                    newTask.quadrant === quadrant.id && {
                      backgroundColor: quadrant.color,
                    },
                  ]}
                  onPress={() => setNewTask({ ...newTask, quadrant: quadrant.id as Task['quadrant'] })}
                >
                  <Text
                    style={[
                      styles.quadrantOptionText,
                      newTask.quadrant === quadrant.id && { color: '#FFFFFF' },
                    ]}
                  >
                    {quadrant.title}
                  </Text>
                  <Text
                    style={[
                      styles.quadrantOptionSubtext,
                      newTask.quadrant === quadrant.id && { color: '#FFFFFF' },
                    ]}
                  >
                    {quadrant.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Habit Modal */}
      <Modal
        visible={showNewHabit}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewHabit(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Habit</Text>
            <TouchableOpacity onPress={saveHabit}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.titleInput}
              placeholder="Habit name..."
              value={newHabit.name}
              onChangeText={(text) => setNewHabit({ ...newHabit, name: text })}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              style={styles.descriptionInput}
              placeholder="Description (optional)..."
              value={newHabit.description}
              onChangeText={(text) => setNewHabit({ ...newHabit, description: text })}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.colorSelector}>
              <Text style={styles.sectionTitle}>Choose Color</Text>
              <View style={styles.colorGrid}>
                {HABIT_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newHabit.color === color && styles.selectedColor,
                    ]}
                    onPress={() => setNewHabit({ ...newHabit, color })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.frequencySelector}>
              <Text style={styles.sectionTitle}>Frequency</Text>
              <View style={styles.frequencyOptions}>
                <TouchableOpacity
                  style={[
                    styles.frequencyOption,
                    newHabit.frequency === 'daily' && styles.selectedFrequency,
                  ]}
                  onPress={() => setNewHabit({ ...newHabit, frequency: 'daily' })}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      newHabit.frequency === 'daily' && styles.selectedFrequencyText,
                    ]}
                  >
                    Daily
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.frequencyOption,
                    newHabit.frequency === 'weekly' && styles.selectedFrequency,
                  ]}
                  onPress={() => setNewHabit({ ...newHabit, frequency: 'weekly' })}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      newHabit.frequency === 'weekly' && styles.selectedFrequencyText,
                    ]}
                  >
                    Weekly
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Goal Modal */}
      <Modal
        visible={showNewGoal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewGoal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Goal</Text>
            <TouchableOpacity onPress={saveGoal}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.titleInput}
              placeholder="Goal title..."
              value={newGoal.title}
              onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              style={styles.descriptionInput}
              placeholder="Goal description..."
              value={newGoal.description}
              onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.dueDateSection}>
              <Text style={styles.sectionTitle}>Target Date</Text>
              <DatePicker
                value={newGoal.targetDate}
                onChange={(date) => setNewGoal({ ...newGoal, targetDate: date })}
                placeholder="Select target date"
              />
            </View>

            <View style={styles.goalTypeSelector}>
              <Text style={styles.sectionTitle}>Goal Type</Text>
              <View style={styles.typeOptions}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newGoal.type === 'weekly' && styles.selectedType,
                  ]}
                  onPress={() => setNewGoal({ ...newGoal, type: 'weekly' })}
                >
                  <Text
                    style={[
                      styles.typeText,
                      newGoal.type === 'weekly' && styles.selectedTypeText,
                    ]}
                  >
                    Weekly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newGoal.type === 'monthly' && styles.selectedType,
                  ]}
                  onPress={() => setNewGoal({ ...newGoal, type: 'monthly' })}
                >
                  <Text
                    style={[
                      styles.typeText,
                      newGoal.type === 'monthly' && styles.selectedTypeText,
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newGoal.type === 'yearly' && styles.selectedType,
                  ]}
                  onPress={() => setNewGoal({ ...newGoal, type: 'yearly' })}
                >
                  <Text
                    style={[
                      styles.typeText,
                      newGoal.type === 'yearly' && styles.selectedTypeText,
                    ]}
                  >
                    Yearly
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Task Detail Modal */}
      <TaskDetailModal
        visible={showTaskDetail}
        task={selectedTask}
        onClose={handleTaskDetailClose}
        onUpdate={handleTaskUpdate}
      />
    </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
  tabContent: {
    paddingBottom: 20,
  },
  sortIndicator: {
    marginBottom: 16,
  },
  sortText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  quadrantsGrid: {
    paddingBottom: 20,
  },
  quadrantContainer: {
    marginBottom: 20,
  },
  quadrantHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quadrantTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  quadrantSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  overdueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  overdueText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#EF4444',
    marginLeft: 2,
  },
  tasksContainer: {
    marginTop: 12,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  goalTypeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  goalTypeTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  goalTypeTabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  goalCard: {
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
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  goalStatus: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  goalStatusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  goalStatusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  goalStatusTextCompleted: {
    color: '#10B981',
  },
  goalDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#6B7280',
  },
  goalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalCategory: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8B5CF6',
    textTransform: 'capitalize',
  },
  goalType: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  goalDate: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
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
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    marginBottom: 20,
  },
  prioritySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  priorityOptions: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedPriority: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priorityText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  selectedPriorityText: {
    color: '#111827',
  },
  dueDateSection: {
    marginBottom: 20,
  },
  quadrantSelector: {
    marginBottom: 20,
  },
  quadrantOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quadrantOptionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  quadrantOptionSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  colorSelector: {
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  frequencySelector: {
    marginBottom: 20,
  },
  frequencyOptions: {
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
  goalTypeSelector: {
    marginBottom: 20,
  },
  typeOptions: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedType: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  selectedTypeText: {
    color: '#111827',
  },
  // Completed tasks styles
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  completedTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  completedList: {
    flex: 1,
  },
  completedEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  completedTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completedTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  completedTaskTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  completedTaskDate: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  completedTaskDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  completedTaskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedTaskQuadrant: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedTaskQuadrantText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  completedTaskTime: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8B5CF6',
  },
});