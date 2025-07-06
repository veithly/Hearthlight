import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { formatDisplayDate } from '@/utils/dateUtils';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  style?: any;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  style,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleDateSelect = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    onChange(dateString);
    setShowPicker(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return date.toDateString() === selectedDate.toDateString();
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <View style={style}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setShowPicker(true)}
      >
        <Calendar size={20} color="#8B5CF6" />
        <Text style={styles.triggerText}>
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.picker}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth('prev')}
              >
                <ChevronLeft size={20} color="#6B7280" />
              </TouchableOpacity>
              
              <Text style={styles.monthYear}>{monthYear}</Text>
              
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth('next')}
              >
                <ChevronRight size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendar}>
              {days.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.day,
                    date && isToday(date) && styles.today,
                    date && isSelected(date) && styles.selected,
                  ]}
                  onPress={() => date && handleDateSelect(date)}
                  disabled={!date}
                >
                  {date && (
                    <Text
                      style={[
                        styles.dayText,
                        isToday(date) && styles.todayText,
                        isSelected(date) && styles.selectedText,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPicker(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  triggerText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  picker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    paddingVertical: 8,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  today: {
    backgroundColor: '#F3F4F6',
  },
  selected: {
    backgroundColor: '#8B5CF6',
  },
  dayText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#111827',
  },
  todayText: {
    color: '#8B5CF6',
    fontFamily: 'Inter-SemiBold',
  },
  selectedText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
  },
});