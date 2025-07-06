import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, Settings, ChartBar as BarChart3, Plus, Target, Clock, Calendar, Brain } from 'lucide-react-native';
import { PomodoroSession, Task } from '@/types';
import { StorageService } from '@/utils/storage';
import { formatDate, formatDisplayDate } from '@/utils/dateUtils';

interface FocusSession {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  targetDate?: string;
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
  actualDuration?: number;
}

export default function FocusScreen() {
  const [workDuration, setWorkDuration] = useState(25 * 60); // 25 minutes
  const [shortBreakDuration, setShortBreakDuration] = useState(5 * 60); // 5 minutes
  const [longBreakDuration, setLongBreakDuration] = useState(15 * 60); // 15 minutes

  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'work' | 'short-break' | 'long-break'>('work');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    duration: 60, // minutes
    targetDate: '',
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handlePhaseComplete();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft]);

  const loadData = async () => {
    const [loadedSessions, loadedFocusSessions] = await Promise.all([
      StorageService.getPomodoroSessions(),
      StorageService.getFocusSessions?.() || Promise.resolve([]),
    ]);

    setSessions(loadedSessions);
    setFocusSessions(loadedFocusSessions);
    loadTodayStats(loadedSessions);
  };

  const loadTodayStats = (loadedSessions: PomodoroSession[]) => {
    const today = formatDate(new Date());
    const todaySessions = loadedSessions.filter((session: PomodoroSession) => session.date === today);

    const totalSessions = todaySessions.reduce((sum: number, session: PomodoroSession) => sum + session.sessionsCompleted, 0);
    const totalTime = todaySessions.reduce((sum: number, session: PomodoroSession) => sum + session.totalFocusTime, 0);

    setSessionsCompleted(totalSessions);
    setTotalFocusTime(totalTime);
  };

  const handlePhaseComplete = () => {
    setIsActive(false);

    if (currentPhase === 'work') {
      const newSessionsCount = sessionsCompleted + 1;
      setSessionsCompleted(newSessionsCount);
      setTotalFocusTime(prev => prev + workDuration);

      saveSession(workDuration);

      // Determine next break type
      if (newSessionsCount % 4 === 0) {
        setCurrentPhase('long-break');
        setTimeLeft(longBreakDuration);
        Alert.alert('Work Complete!', 'Time for a long break!');
      } else {
        setCurrentPhase('short-break');
        setTimeLeft(shortBreakDuration);
        Alert.alert('Work Complete!', 'Time for a short break!');
      }
    } else {
      setCurrentPhase('work');
      setTimeLeft(workDuration);
      Alert.alert('Break Complete!', 'Ready to focus again?');
    }
  };

  const saveSession = async (focusTime: number) => {
    const session: PomodoroSession = {
      id: Date.now().toString(),
      date: formatDate(new Date()),
      workDuration,
      breakDuration: currentPhase === 'long-break' ? longBreakDuration : shortBreakDuration,
      sessionsCompleted: 1,
      totalFocusTime: focusTime,
      taskId: currentTask?.id,
    };

    const updatedSessions = [...sessions, session];
    setSessions(updatedSessions);
    await StorageService.savePomodoroSessions(updatedSessions);

    // Update task pomodoro count if applicable
    if (currentTask) {
      const tasks = await StorageService.getTasks();
      const updatedTasks = tasks.map((task: Task) =>
        task.id === currentTask.id
          ? { ...task, pomodoroSessions: task.pomodoroSessions + 1 }
          : task
      );
      await StorageService.saveTasks(updatedTasks);
    }
  };

  const saveFocusSession = async () => {
    if (!newSession.title.trim()) {
      Alert.alert('Error', 'Please enter a session title');
      return;
    }

    const session: FocusSession = {
      id: Date.now().toString(),
      title: newSession.title,
      description: newSession.description,
      duration: newSession.duration,
      targetDate: newSession.targetDate || undefined,
      completed: false,
    };

    const updatedSessions = [...focusSessions, session];
    setFocusSessions(updatedSessions);
    await StorageService.saveFocusSessions?.(updatedSessions);

    setShowNewSession(false);
    setNewSession({
      title: '',
      description: '',
      duration: 60,
      targetDate: '',
    });
  };

  const startFocusSession = (session: FocusSession) => {
    setTimeLeft(session.duration * 60);
    setCurrentPhase('work');
    setIsActive(false);
    startTimeRef.current = Date.now();

    Alert.alert(
      'Focus Session',
      `Ready to start "${session.title}" for ${session.duration} minutes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: () => setIsActive(true) },
      ]
    );
  };

  const completeFocusSession = async (sessionId: string) => {
    const updatedSessions = focusSessions.map(session =>
      session.id === sessionId
        ? {
            ...session,
            completed: true,
            completedAt: new Date().toISOString(),
            actualDuration: startTimeRef.current
              ? Math.round((Date.now() - startTimeRef.current) / 60000)
              : session.duration,
          }
        : session
    );

    setFocusSessions(updatedSessions);
    await StorageService.saveFocusSessions?.(updatedSessions);
  };

  const toggleTimer = () => {
    if (!isActive) {
      startTimeRef.current = Date.now();
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setCurrentPhase('work');
    setTimeLeft(workDuration);
    startTimeRef.current = null;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFocusTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'work':
        return '#EF4444';
      case 'short-break':
        return '#10B981';
      case 'long-break':
        return '#3B82F6';
      default:
        return '#8B5CF6';
    }
  };

  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'work':
        return 'Focus Time';
      case 'short-break':
        return 'Short Break';
      case 'long-break':
        return 'Long Break';
      default:
        return 'Focus Time';
    }
  };

  const getWeeklyStats = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= weekStart && sessionDate <= today;
    });

    const totalWeeklyTime = weekSessions.reduce((sum, session) => sum + session.totalFocusTime, 0);
    const totalWeeklySessions = weekSessions.reduce((sum, session) => sum + session.sessionsCompleted, 0);

    return { totalWeeklyTime, totalWeeklySessions };
  };

  const weeklyStats = getWeeklyStats();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Focus</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowStats(true)}
          >
            <BarChart3 size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettings(true)}
          >
            <Settings size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.timerContainer}>
          <View style={[styles.timerCircle, { borderColor: getPhaseColor() }]}>
            <Text style={styles.phaseLabel}>{getPhaseLabel()}</Text>
            <Text style={[styles.timerText, { color: getPhaseColor() }]}>
              {formatTime(timeLeft)}
            </Text>
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, styles.resetButton]}
                onPress={resetTimer}
              >
                <RotateCcw size={24} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.playButton, { backgroundColor: getPhaseColor() }]}
                onPress={toggleTimer}
              >
                {isActive ? (
                  <Pause size={32} color="#FFFFFF" />
                ) : (
                  <Play size={32} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.addButton]}
                onPress={() => setShowNewSession(true)}
              >
                <Plus size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{sessionsCompleted}</Text>
            <Text style={styles.statLabel}>Sessions Today</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{formatFocusTime(totalFocusTime)}</Text>
            <Text style={styles.statLabel}>Focus Time Today</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{weeklyStats.totalWeeklySessions}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((sessionsCompleted / 8) * 100, 100)}%`,
                  backgroundColor: getPhaseColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {sessionsCompleted}/8 sessions completed
          </Text>
        </View>

        {focusSessions.length > 0 && (
          <View style={styles.sessionsContainer}>
            <View style={styles.sessionsHeader}>
              <Text style={styles.sessionsTitle}>Focus Sessions</Text>
              <TouchableOpacity
                style={styles.addSessionButton}
                onPress={() => setShowNewSession(true)}
              >
                <Plus size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {focusSessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionDuration}>
                      {session.duration} minutes
                    </Text>
                  </View>
                  <View style={styles.sessionActions}>
                    {!session.completed ? (
                      <>
                        <TouchableOpacity
                          style={styles.startButton}
                          onPress={() => startFocusSession(session)}
                        >
                          <Play size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.completeButton}
                          onPress={() => completeFocusSession(session.id)}
                        >
                          <Target size={16} color="#10B981" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedText}>✓ Completed</Text>
                      </View>
                    )}
                  </View>
                </View>

                {session.description && (
                  <Text style={styles.sessionDescription}>{session.description}</Text>
                )}

                <View style={styles.sessionMeta}>
                  {session.targetDate && (
                    <Text style={styles.sessionDate}>
                      Target: {formatDisplayDate(session.targetDate)}
                    </Text>
                  )}
                  {session.completedAt && (
                    <Text style={styles.sessionCompleted}>
                      Completed: {new Date(session.completedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {focusSessions.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Brain size={64} color="#8B5CF6" />
            </View>
            <Text style={styles.emptyTitle}>No Focus Sessions</Text>
            <Text style={styles.emptyText}>
              Create custom focus sessions with specific goals and durations
            </Text>
            <TouchableOpacity
              style={styles.createSessionButton}
              onPress={() => setShowNewSession(true)}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.createSessionText}>Create Session</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>💡 Focus Tip</Text>
          <Text style={styles.tipText}>
            During work sessions, eliminate all distractions and focus on a single task.
            Use break time to rest your mind and eyes.
          </Text>
        </View>
      </ScrollView>

      {/* New Session Modal */}
      <Modal
        visible={showNewSession}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewSession(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Focus Session</Text>
            <TouchableOpacity onPress={saveFocusSession}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Session Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Deep work on project..."
                value={newSession.title}
                onChangeText={(text) => setNewSession({ ...newSession, title: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What will you focus on?"
                value={newSession.description}
                onChangeText={(text) => setNewSession({ ...newSession, description: text })}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (Minutes)</Text>
              <View style={styles.durationSelector}>
                {[30, 45, 60, 90, 120].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationOption,
                      newSession.duration === duration && styles.selectedDuration,
                    ]}
                    onPress={() => setNewSession({ ...newSession, duration })}
                  >
                    <Text style={[
                      styles.durationText,
                      newSession.duration === duration && styles.selectedDurationText,
                    ]}>
                      {duration}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Custom duration..."
                value={newSession.duration.toString()}
                onChangeText={(text) => {
                  const duration = parseInt(text) || 60;
                  setNewSession({ ...newSession, duration });
                }}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Date (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={newSession.targetDate}
                onChangeText={(text) => setNewSession({ ...newSession, targetDate: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Focus Settings</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Work Duration</Text>
              <View style={styles.timeSelector}>
                {[15, 25, 30, 45, 60].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.timeOption,
                      workDuration === minutes * 60 && styles.selectedTime,
                    ]}
                    onPress={() => {
                      setWorkDuration(minutes * 60);
                      if (currentPhase === 'work') setTimeLeft(minutes * 60);
                    }}
                  >
                    <Text style={[
                      styles.timeText,
                      workDuration === minutes * 60 && styles.selectedTimeText,
                    ]}>
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Short Break</Text>
              <View style={styles.timeSelector}>
                {[3, 5, 10, 15].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.timeOption,
                      shortBreakDuration === minutes * 60 && styles.selectedTime,
                    ]}
                    onPress={() => setShortBreakDuration(minutes * 60)}
                  >
                    <Text style={[
                      styles.timeText,
                      shortBreakDuration === minutes * 60 && styles.selectedTimeText,
                    ]}>
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Long Break</Text>
              <View style={styles.timeSelector}>
                {[15, 20, 30, 45].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.timeOption,
                      longBreakDuration === minutes * 60 && styles.selectedTime,
                    ]}
                    onPress={() => setLongBreakDuration(minutes * 60)}
                  >
                    <Text style={[
                      styles.timeText,
                      longBreakDuration === minutes * 60 && styles.selectedTimeText,
                    ]}>
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Stats Modal */}
      <Modal
        visible={showStats}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowStats(false)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Focus Statistics</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>This Week</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{weeklyStats.totalWeeklySessions}</Text>
                  <Text style={styles.statLabel}>Sessions</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatFocusTime(weeklyStats.totalWeeklyTime)}</Text>
                  <Text style={styles.statLabel}>Focus Time</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Recent Sessions</Text>
              {sessions.slice(0, 10).map((session) => (
                <View key={session.id} style={styles.sessionHistoryItem}>
                  <View style={styles.sessionHistoryInfo}>
                    <Text style={styles.sessionHistoryDate}>
                      {formatDisplayDate(session.date)}
                    </Text>
                    <Text style={styles.sessionHistoryDuration}>
                      {formatFocusTime(session.totalFocusTime)}
                    </Text>
                  </View>
                  <Text style={styles.sessionHistorySessions}>
                    {session.sessionsCompleted} sessions
                  </Text>
                </View>
              ))}
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
  headerButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  timerCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  phaseLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  timerText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 48,
    marginBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
  },
  addButton: {
    backgroundColor: '#F3F4F6',
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
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressContainer: {
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
  progressTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  sessionsContainer: {
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
  sessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  addSessionButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  sessionDuration: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  completeButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  completedText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#10B981',
  },
  sessionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionDate: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8B5CF6',
  },
  sessionCompleted: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  createSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  createSessionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  tipContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  tipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
    minHeight: 80,
  },
  durationSelector: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  durationOption: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedDuration: {
    backgroundColor: '#8B5CF6',
  },
  durationText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  selectedDurationText: {
    color: '#FFFFFF',
  },
  settingGroup: {
    marginBottom: 24,
  },
  settingLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  timeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeOption: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    marginBottom: 8,
  },
  selectedTime: {
    backgroundColor: '#8B5CF6',
  },
  timeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  selectedTimeText: {
    color: '#FFFFFF',
  },
  statsSection: {
    marginBottom: 24,
  },
  statsSectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#111827',
    marginBottom: 4,
  },
  sessionHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sessionHistoryInfo: {
    flex: 1,
  },
  sessionHistoryDate: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  sessionHistoryDuration: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sessionHistorySessions: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8B5CF6',
  },
});