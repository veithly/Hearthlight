import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CircleCheck as CheckCircle2, Circle, Clock, Flame, Sparkles } from 'lucide-react-native';
import { Task } from '@/types';
import GlassCard from './GlassCard';

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  onSuggest?: () => void;
}

const QuadrantColors = {
  'urgent-important': '#EF4444',
  'not-urgent-important': '#F59E0B',
  'urgent-not-important': '#8B5CF6',
  'not-urgent-not-important': '#6B7280',
};

const QuadrantLabels = {
  'urgent-important': 'Urgent & Important',
  'not-urgent-important': 'Important',
  'urgent-not-important': 'Urgent',
  'not-urgent-not-important': 'Neither',
};

export default function TaskCard({ task, onToggle, onPress, onSuggest }: TaskCardProps) {
  const quadrantColor = QuadrantColors[task.quadrant];

  return (
    <GlassCard onPress={onPress}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onToggle} style={styles.checkButton}>
          {task.completed ? (
            <CheckCircle2 size={24} color="#10B981" />
          ) : (
            <Circle size={24} color="#6B7280" />
          )}
        </TouchableOpacity>

        <View style={[styles.quadrantBadge, { backgroundColor: quadrantColor }]}>
          <Text style={styles.quadrantText}>
            {QuadrantLabels[task.quadrant]}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, task.completed && styles.completed]}>
        {task.title}
      </Text>

      {task.description && (
        <Text style={[styles.description, task.completed && styles.completed]}>
          {task.description}
        </Text>
      )}

      <View style={styles.footer}>
        {task.dueDate && (
          <View style={styles.dueDateContainer}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.dueDate}>
              {new Date(task.dueDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        {task.pomodoroSessions > 0 && (
          <View style={styles.pomodoroContainer}>
            <Flame size={16} color="#F59E0B" />
            <Text style={styles.pomodoroText}>{task.pomodoroSessions}</Text>
          </View>
        )}

        {onSuggest && (
          <TouchableOpacity style={styles.aiButton} onPress={onSuggest}>
            <Sparkles size={16} color="#8B5CF6" />
            <Text style={styles.aiButtonText}>Suggest</Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkButton: {
    padding: 4,
  },
  quadrantBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quadrantText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#FFFFFF',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  completed: {
    opacity: 0.6,
    textDecorationLine: 'line-through',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDate: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  pomodoroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pomodoroText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8B5CF6',
    marginLeft: 4,
  },
});