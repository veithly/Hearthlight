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
  Switch,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, Settings, ChartBar as BarChart3, Plus, Target, Clock, Calendar, Brain, Bell, Volume2, Trophy, Flame, Coffee, Zap } from 'lucide-react-native';
import { PomodoroSession, Task, AppSettings } from '@/types';
import { StorageService } from '@/utils/storage';
import { formatDate, formatDisplayDate } from '@/utils/dateUtils';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

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
  const { colors } = useTheme();
  const { t } = useI18n();
  const [settings, setSettings] = useState<AppSettings | null>(null);
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
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const rotationAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
      
      // Start animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      if (currentPhase === 'work') {
        Animated.loop(
          Animated.timing(rotationAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ).start();
      }
    } else if (timeLeft === 0) {
      handlePhaseComplete();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Stop animations
      pulseAnimation.setValue(1);
      rotationAnimation.setValue(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    const totalTime = currentPhase === 'work' ? workDuration : 
                   currentPhase === 'short-break' ? shortBreakDuration : longBreakDuration;
    const progress = 1 - (timeLeft / totalTime);
    
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [timeLeft, currentPhase]);

  const loadData = async () => {
    const [loadedSessions, loadedFocusSessions, loadedSettings] = await Promise.all([
      StorageService.getPomodoroSessions(),
      StorageService.getFocusSessions?.() || Promise.resolve([]),
      StorageService.getSettings(),
    ]);

    setSessions(loadedSessions);
    setFocusSessions(loadedFocusSessions);
    setSettings(loadedSettings);

    // Initialize timer durations from settings
    const workDurationSeconds = loadedSettings.pomodoro.workDuration * 60;
    const shortBreakSeconds = loadedSettings.pomodoro.shortBreakDuration * 60;
    const longBreakSeconds = loadedSettings.pomodoro.longBreakDuration * 60;

    setWorkDuration(workDurationSeconds);
    setShortBreakDuration(shortBreakSeconds);
    setLongBreakDuration(longBreakSeconds);
    setTimeLeft(workDurationSeconds);

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

  const savePomodoroSettings = async (newSettings: Partial<AppSettings['pomodoro']>) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      pomodoro: {
        ...settings.pomodoro,
        ...newSettings,
      },
    };

    setSettings(updatedSettings);
    await StorageService.saveSettings(updatedSettings);

    // Update timer durations if they changed
    if (newSettings.workDuration !== undefined) {
      const workDurationSeconds = newSettings.workDuration * 60;
      setWorkDuration(workDurationSeconds);
      if (currentPhase === 'work') setTimeLeft(workDurationSeconds);
    }
    if (newSettings.shortBreakDuration !== undefined) {
      const shortBreakSeconds = newSettings.shortBreakDuration * 60;
      setShortBreakDuration(shortBreakSeconds);
      if (currentPhase === 'short-break') setTimeLeft(shortBreakSeconds);
    }
    if (newSettings.longBreakDuration !== undefined) {
      const longBreakSeconds = newSettings.longBreakDuration * 60;
      setLongBreakDuration(longBreakSeconds);
      if (currentPhase === 'long-break') setTimeLeft(longBreakSeconds);
    }
  };

  const handlePhaseComplete = () => {
    setIsActive(false);

    if (currentPhase === 'work') {
      const newSessionsCount = sessionsCompleted + 1;
      setSessionsCompleted(newSessionsCount);
      setTotalFocusTime(prev => prev + workDuration);

      saveSession(workDuration);

      // Determine next break type using settings
      const longBreakInterval = settings?.pomodoro.longBreakInterval || 4;
      if (newSessionsCount % longBreakInterval === 0) {
        setCurrentPhase('long-break');
        setTimeLeft(longBreakDuration);
        Alert.alert(t('focus.work_complete'), t('focus.time_for_long_break'));
      } else {
        setCurrentPhase('short-break');
        setTimeLeft(shortBreakDuration);
        Alert.alert(t('focus.work_complete'), t('focus.time_for_short_break'));
      }
    } else {
      setCurrentPhase('work');
      setTimeLeft(workDuration);
      Alert.alert(t('focus.break_complete'), t('focus.ready_to_focus'));
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
      Alert.alert(t('focus.error'), t('focus.please_enter_session_title'));
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
      t('focus.focus_session'),
      t('focus.ready_to_start', { title: session.title, duration: session.duration }),
      [
        { text: t('focus.cancel'), style: 'cancel' },
        { text: t('focus.start'), onPress: () => setIsActive(true) },
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
        return colors.semantic.error;
      case 'short-break':
        return colors.semantic.success;
      case 'long-break':
        return colors.primary[500];
      default:
        return colors.accent[500];
    }
  };

  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'work':
        return t('focus.focus_time');
      case 'short-break':
        return t('focus.short_break');
      case 'long-break':
        return t('focus.long_break');
      default:
        return t('focus.focus_time');
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

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'work':
        return <Target size={24} color={getPhaseColor()} />;
      case 'short-break':
        return <Coffee size={24} color={getPhaseColor()} />;
      case 'long-break':
        return <Zap size={24} color={getPhaseColor()} />;
      default:
        return <Target size={24} color={getPhaseColor()} />;
    }
  };

  const getMotivationalMessage = () => {
    if (currentPhase === 'work') {
      const messages = [
        t('focus.stay_focused'),
        t('focus.deep_work_in_progress'),
        t('focus.concentration_is_key'),
        t('focus.flow_state_activated')
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    } else {
      return t('focus.time_to_recharge');
    }
  };

  const getStreakInfo = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayFormatted = formatDate(today);
    const yesterdayFormatted = formatDate(yesterday);
    
    const todaySessions = sessions.filter(s => s.date === todayFormatted);
    const yesterdaySessions = sessions.filter(s => s.date === yesterdayFormatted);
    
    const todayCompleted = todaySessions.length > 0;
    const yesterdayCompleted = yesterdaySessions.length > 0;
    
    if (todayCompleted && yesterdayCompleted) {
      return { streak: 2, emoji: "🔥" };
    } else if (todayCompleted) {
      return { streak: 1, emoji: "⭐" };
    } else {
      return { streak: 0, emoji: "💪" };
    }
  };

  const streakInfo = getStreakInfo();
  const motivationalMessage = getMotivationalMessage();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.text.primary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    content: {
      flex: 1,
    },
    timerContainer: {
      alignItems: 'center',
      paddingVertical: 40,
      position: 'relative',
    },
    timerCircle: {
      width: 280,
      height: 280,
      borderRadius: 140,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      position: 'relative',
      backgroundColor: colors.surface,
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    },
    timerRing: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      borderWidth: 4,
      borderColor: colors.neutral[100],
    },
    timerProgress: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      borderWidth: 8,
      borderColor: 'transparent',
      borderTopColor: getPhaseColor(),
      transform: [{ rotate: '-90deg' }],
    },
    timerText: {
      fontSize: 64,
      fontFamily: 'Poppins-Bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    phaseLabel: {
      fontSize: 18,
      fontFamily: 'Inter-Medium',
      marginBottom: 8,
      textAlign: 'center',
    },
    phaseIcon: {
      marginBottom: 12,
    },
    motivationalText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: 16,
      fontStyle: 'italic',
    },
    controls: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 16,
    },
    controlButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    playButton: {
      backgroundColor: colors.semantic.success,
      shadowColor: colors.semantic.success,
      shadowOpacity: 0.3,
    },
    pauseButton: {
      backgroundColor: colors.semantic.warning,
      shadowColor: colors.semantic.warning,
      shadowOpacity: 0.3,
    },
    resetButton: {
      backgroundColor: colors.neutral[100],
    },
    addButton: {
      backgroundColor: colors.primary[500],
      shadowColor: colors.primary[500],
      shadowOpacity: 0.3,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    statNumber: {
      fontFamily: 'Poppins-Bold',
      fontSize: 28,
      color: colors.text.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.tertiary,
      textAlign: 'center',
    },
    streakCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    streakEmoji: {
      fontSize: 32,
      marginRight: 12,
    },
    streakText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
    },
    streakSubtext: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.tertiary,
    },
    progressContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    progressTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: colors.text.primary,
      marginBottom: 12,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.neutral[200],
      borderRadius: 4,
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.tertiary,
    },
    sessionsContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
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
      color: colors.text.primary,
    },
    addSessionButton: {
      backgroundColor: colors.primary[500],
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sessionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    sessionInfo: {
      flex: 1,
    },
    sessionTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      color: colors.text.primary,
      marginBottom: 6,
    },
    sessionDuration: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.tertiary,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sessionActions: {
      flexDirection: 'row',
      gap: 8,
    },
    startButton: {
      backgroundColor: colors.semantic.success,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.semantic.success,
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    completeButton: {
      backgroundColor: colors.neutral[100],
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    completedBadge: {
      backgroundColor: colors.semantic.success,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    completedText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.text.inverse,
    },
    sessionDurationIcon: {
      marginRight: 4,
    },
    sessionDescription: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 8,
    },
    sessionMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sessionDate: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.text.tertiary,
    },
    sessionCompleted: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.semantic.success,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.neutral[100],
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: colors.text.primary,
      marginBottom: 8,
    },
    emptyText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.tertiary,
      textAlign: 'center',
      marginBottom: 16,
    },
    createSessionButton: {
      backgroundColor: colors.primary[500],
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
    },
    createSessionText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: colors.text.inverse,
    },
    quickStartContainer: {
      marginHorizontal: 20,
      marginBottom: 20,
    },
    quickStartTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: colors.text.primary,
      marginBottom: 12,
    },
    quickStartOptions: {
      flexDirection: 'row',
      gap: 12,
    },
    quickStartOption: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    quickStartText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: colors.text.inverse,
    },
    tipContainer: {
      margin: 20,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    tipTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 8,
    },
    tipText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[200],
    },
    modalTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 20,
      color: colors.text.primary,
    },
    cancelButton: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.primary[500],
    },
    saveButton: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.primary[500],
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.neutral[100],
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.text.primary,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    durationSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    durationOption: {
      backgroundColor: colors.neutral[100],
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    selectedDuration: {
      backgroundColor: colors.primary[500],
    },
    durationText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.text.tertiary,
    },
    selectedDurationText: {
      color: colors.text.inverse,
    },
    settingGroup: {
      marginBottom: 24,
    },
    settingLabel: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 12,
    },
    timeSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    timeOption: {
      backgroundColor: colors.neutral[100],
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    selectedTime: {
      backgroundColor: colors.primary[500],
    },
    timeText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.text.tertiary,
    },
    selectedTimeText: {
      color: colors.text.inverse,
    },
    switchSetting: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    settingWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statsSection: {
      marginBottom: 24,
    },
    statsSectionTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: colors.text.primary,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    statItem: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    sessionHistoryItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sessionHistoryInfo: {
      flex: 1,
    },
    sessionHistoryDate: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 2,
    },
    sessionHistoryDuration: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    sessionHistorySessions: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: colors.primary[500],
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Focus</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowStats(true)}
          >
            <BarChart3 size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettings(true)}
          >
            <Settings size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.timerContainer}>
          <Animated.View style={[
            styles.timerCircle,
            {
              transform: [{ scale: pulseAnimation }],
              borderColor: getPhaseColor(),
            }
          ]}>
            <View style={styles.timerRing} />
            <Animated.View style={[
              styles.timerProgress,
              {
                borderColor: getPhaseColor(),
                transform: [
                  { rotate: '-90deg' },
                  {
                    rotate: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]} />
            
            <View style={styles.phaseIcon}>
              {getPhaseIcon()}
            </View>
            
            <Text style={[styles.phaseLabel, { color: getPhaseColor() }]}>
              {getPhaseLabel()}
            </Text>
            
            <Text style={[styles.timerText, { color: getPhaseColor() }]}>
              {formatTime(timeLeft)}
            </Text>
            
            <Text style={styles.motivationalText}>
              {motivationalMessage}
            </Text>
            
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, styles.resetButton]}
                onPress={resetTimer}
              >
                <RotateCcw size={28} color={colors.text.tertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, isActive ? styles.pauseButton : styles.playButton, { backgroundColor: getPhaseColor() }]}
                onPress={toggleTimer}
              >
                {isActive ? (
                  <Pause size={36} color={colors.text.inverse} />
                ) : (
                  <Play size={36} color={colors.text.inverse} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.addButton]}
                onPress={() => setShowNewSession(true)}
              >
                <Plus size={28} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>{streakInfo.emoji}</Text>
          <View>
            <Text style={styles.streakText}>{streakInfo.streak} {t('focus.day_streak')}</Text>
            <Text style={styles.streakSubtext}>{t('focus.keep_up_great_work')}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{sessionsCompleted}</Text>
            <Text style={styles.statLabel}>{t('focus.sessions_today')}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{formatFocusTime(totalFocusTime)}</Text>
            <Text style={styles.statLabel}>{t('focus.focus_time_today')}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{weeklyStats.totalWeeklySessions}</Text>
            <Text style={styles.statLabel}>{t('focus.this_week')}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>{t('focus.todays_progress')}</Text>
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
            {t('focus.sessions_completed_count', { completed: sessionsCompleted })}
          </Text>
        </View>

        {focusSessions.length > 0 && (
          <View style={styles.sessionsContainer}>
            <View style={styles.sessionsHeader}>
              <Text style={styles.sessionsTitle}>{t('focus.focus_sessions')}</Text>
              <TouchableOpacity
                style={styles.addSessionButton}
                onPress={() => setShowNewSession(true)}
              >
                <Plus size={16} color={colors.accent[500]} />
              </TouchableOpacity>
            </View>

            {focusSessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <View style={styles.sessionDuration}>
                      <Clock size={16} color={colors.text.tertiary} style={styles.sessionDurationIcon} />
                      <Text>{session.duration} minutes</Text>
                    </View>
                  </View>
                  <View style={styles.sessionActions}>
                    {!session.completed ? (
                      <>
                        <TouchableOpacity
                          style={styles.startButton}
                          onPress={() => startFocusSession(session)}
                        >
                          <Play size={20} color={colors.text.inverse} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.completeButton}
                          onPress={() => completeFocusSession(session.id)}
                        >
                          <Target size={20} color={colors.semantic.success} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.completedBadge}>
                        <Trophy size={16} color={colors.text.inverse} />
                        <Text style={styles.completedText}>{t('focus.completed')}</Text>
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
                      {t('focus.target', { date: formatDisplayDate(session.targetDate) })}
                    </Text>
                  )}
                  {session.completedAt && (
                    <Text style={styles.sessionCompleted}>
                      {t('focus.completed_on', { date: new Date(session.completedAt).toLocaleDateString() })}
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
              <Brain size={64} color={colors.accent[500]} />
            </View>
            <Text style={styles.emptyTitle}>{t('focus.no_focus_sessions')}</Text>
            <Text style={styles.emptyText}>
              {t('focus.create_focus_session_description')}
            </Text>
            <TouchableOpacity
              style={styles.createSessionButton}
              onPress={() => setShowNewSession(true)}
            >
              <Plus size={20} color={colors.text.inverse} />
              <Text style={styles.createSessionText}>{t('focus.create_session')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.quickStartContainer}>
          <Text style={styles.quickStartTitle}>{t('focus.quick_start')}</Text>
          <View style={styles.quickStartOptions}>
            <TouchableOpacity
              style={[styles.quickStartOption, { backgroundColor: colors.semantic.success }]}
              onPress={() => {
                setTimeLeft(25 * 60);
                setCurrentPhase('work');
                setIsActive(true);
              }}
            >
              <Text style={styles.quickStartText}>{t('focus.work_25m')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickStartOption, { backgroundColor: colors.primary[500] }]}
              onPress={() => {
                setTimeLeft(5 * 60);
                setCurrentPhase('short-break');
                setIsActive(true);
              }}
            >
              <Text style={styles.quickStartText}>{t('focus.break_5m')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickStartOption, { backgroundColor: colors.accent[500] }]}
              onPress={() => {
                setTimeLeft(45 * 60);
                setCurrentPhase('work');
                setIsActive(true);
              }}
            >
              <Text style={styles.quickStartText}>{t('focus.deep_work_45m')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>💡 {t('focus.focus_tip')}</Text>
          <Text style={styles.tipText}>
            {t('focus.focus_tip_text')}
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
              <Text style={styles.cancelButton}>{t('focus.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('focus.new_session')}</Text>
            <TouchableOpacity onPress={saveFocusSession}>
              <Text style={styles.saveButton}>{t('focus.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('focus.session_title')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('focus.deep_work_on_project')}
                value={newSession.title}
                onChangeText={(text) => setNewSession({ ...newSession, title: text })}
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('focus.session_description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('focus.what_will_you_focus_on')}
                value={newSession.description}
                onChangeText={(text) => setNewSession({ ...newSession, description: text })}
                multiline
                textAlignVertical="top"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('focus.duration_minutes')}</Text>
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
                placeholder={t('focus.custom_duration')}
                value={newSession.duration.toString()}
                onChangeText={(text) => {
                  const duration = parseInt(text) || 60;
                  setNewSession({ ...newSession, duration });
                }}
                keyboardType="numeric"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('focus.target_date')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('focus.target_date_placeholder')}
                value={newSession.targetDate}
                onChangeText={(text) => setNewSession({ ...newSession, targetDate: text })}
                placeholderTextColor={colors.text.tertiary}
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
              <Text style={styles.cancelButton}>{t('focus.close')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('focus.focus_settings')}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Timer Durations */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>{t('focus.work_duration')}</Text>
              <View style={styles.timeSelector}>
                {[15, 25, 30, 45, 60].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.timeOption,
                      workDuration === minutes * 60 && styles.selectedTime,
                    ]}
                    onPress={() => savePomodoroSettings({ workDuration: minutes })}
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
              <Text style={styles.settingLabel}>{t('focus.short_break_duration')}</Text>
              <View style={styles.timeSelector}>
                {[3, 5, 10, 15].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.timeOption,
                      shortBreakDuration === minutes * 60 && styles.selectedTime,
                    ]}
                    onPress={() => savePomodoroSettings({ shortBreakDuration: minutes })}
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
              <Text style={styles.settingLabel}>{t('focus.long_break_duration')}</Text>
              <View style={styles.timeSelector}>
                {[15, 20, 30, 45].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.timeOption,
                      longBreakDuration === minutes * 60 && styles.selectedTime,
                    ]}
                    onPress={() => savePomodoroSettings({ longBreakDuration: minutes })}
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

            {/* Long Break Interval */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>{t('focus.long_break_after')}</Text>
              <View style={styles.timeSelector}>
                {[2, 3, 4, 5, 6].map((sessions) => (
                  <TouchableOpacity
                    key={sessions}
                    style={[
                      styles.timeOption,
                      settings?.pomodoro.longBreakInterval === sessions && styles.selectedTime,
                    ]}
                    onPress={() => savePomodoroSettings({ longBreakInterval: sessions })}
                  >
                    <Text style={[
                      styles.timeText,
                      settings?.pomodoro.longBreakInterval === sessions && styles.selectedTimeText,
                    ]}>
                      {sessions} sessions
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Auto-start Options */}
            <View style={styles.settingGroup}>
              <View style={styles.switchSetting}>
                <Text style={styles.settingLabel}>{t('focus.auto_start_breaks')}</Text>
                <Switch
                  value={settings?.pomodoro.autoStartBreaks || false}
                  onValueChange={(value) => savePomodoroSettings({ autoStartBreaks: value })}
                  trackColor={{ false: colors.neutral[200], true: colors.accent[500] }}
                  thumbColor={settings?.pomodoro.autoStartBreaks ? colors.text.inverse : colors.neutral[100]}
                />
              </View>
              <View style={styles.switchSetting}>
                <Text style={styles.settingLabel}>{t('focus.auto_start_work')}</Text>
                <Switch
                  value={settings?.pomodoro.autoStartWork || false}
                  onValueChange={(value) => savePomodoroSettings({ autoStartWork: value })}
                  trackColor={{ false: colors.neutral[200], true: colors.accent[500] }}
                  thumbColor={settings?.pomodoro.autoStartWork ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>
            </View>

            {/* Notification Options */}
            <View style={styles.settingGroup}>
              <View style={styles.switchSetting}>
                <View style={styles.settingWithIcon}>
                  <Volume2 size={16} color={colors.accent[500]} />
                  <Text style={styles.settingLabel}>{t('focus.sound_notifications')}</Text>
                </View>
                <Switch
                  value={settings?.pomodoro.soundEnabled || false}
                  onValueChange={(value) => savePomodoroSettings({ soundEnabled: value })}
                  trackColor={{ false: colors.neutral[200], true: colors.accent[500] }}
                  thumbColor={settings?.pomodoro.soundEnabled ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>
              <View style={styles.switchSetting}>
                <View style={styles.settingWithIcon}>
                  <Bell size={16} color={colors.accent[500]} />
                  <Text style={styles.settingLabel}>{t('focus.vibration')}</Text>
                </View>
                <Switch
                  value={settings?.pomodoro.vibrationEnabled || false}
                  onValueChange={(value) => savePomodoroSettings({ vibrationEnabled: value })}
                  trackColor={{ false: colors.neutral[200], true: colors.accent[500] }}
                  thumbColor={settings?.pomodoro.vibrationEnabled ? '#FFFFFF' : '#F3F4F6'}
                />
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
              <Text style={styles.cancelButton}>{t('focus.close')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('focus.focus_statistics')}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>{t('focus.this_week')}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{weeklyStats.totalWeeklySessions}</Text>
                  <Text style={styles.statLabel}>{t('focus.sessions_today')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatFocusTime(weeklyStats.totalWeeklyTime)}</Text>
                  <Text style={styles.statLabel}>{t('focus.focus_time_today')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>{t('focus.recent_sessions')}</Text>
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
                    {session.sessionsCompleted} {t('focus.sessions_today')}
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
