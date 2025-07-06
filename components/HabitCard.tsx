import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CircleCheck as CheckCircle2, Circle, Flame, Calendar } from 'lucide-react-native';
import { Habit } from '@/types';
import { isToday, formatDate } from '@/utils/dateUtils';
import GlassCard from './GlassCard';

interface HabitCardProps {
  habit: Habit;
  onToggle: () => void;
}

export default function HabitCard({ habit, onToggle }: HabitCardProps) {
  const today = formatDate(new Date());
  const isCompletedToday = habit.completedDates.includes(today);

  return (
    <GlassCard>
      <View style={styles.header}>
        <View style={styles.habitInfo}>
          <View style={[styles.colorDot, { backgroundColor: habit.color }]} />
          <View>
            <Text style={styles.title}>{habit.name}</Text>
            {habit.description && (
              <Text style={styles.description}>{habit.description}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={onToggle} style={styles.checkButton}>
          {isCompletedToday ? (
            <CheckCircle2 size={32} color={habit.color} />
          ) : (
            <Circle size={32} color="#D1D5DB" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Flame size={16} color="#F59E0B" />
          <Text style={styles.statText}>
            {habit.currentStreak} day streak
          </Text>
        </View>

        <View style={styles.stat}>
          <Calendar size={16} color="#6B7280" />
          <Text style={styles.statText}>
            Best: {habit.longestStreak} days
          </Text>
        </View>
      </View>

      <View style={styles.weekView}>
        {[-6, -5, -4, -3, -2, -1, 0].map((offset) => {
          const date = new Date();
          date.setDate(date.getDate() + offset);
          const dateString = formatDate(date);
          const isCompleted = habit.completedDates.includes(dateString);
          const isTodayDate = isToday(dateString);

          return (
            <View
              key={offset}
              style={[
                styles.dayDot,
                isCompleted && { backgroundColor: habit.color },
                isTodayDate && styles.todayDot,
              ]}
            />
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  checkButton: {
    padding: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  weekView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  todayDot: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
});