import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Smile, Meh, Frown, Zap, CircleAlert as AlertCircle, Sparkles } from 'lucide-react-native';
import MarkdownDisplay from 'react-native-markdown-display';
import { DiaryEntry } from '@/types';
import { formatDisplayDate } from '@/utils/dateUtils';
import GlassCard from './GlassCard';

interface DiaryCardProps {
  entry: DiaryEntry;
  onPress: () => void;
  onAnalyze: () => void;
}

const MoodIcon = ({ mood }: { mood: DiaryEntry['mood'] }) => {
  const iconProps = { size: 20, color: '#6B7280' };

  switch (mood) {
    case 'happy':
      return <Smile {...iconProps} color="#10B981" />;
    case 'excited':
      return <Zap {...iconProps} color="#F59E0B" />;
    case 'neutral':
      return <Meh {...iconProps} color="#6B7280" />;
    case 'stressed':
      return <AlertCircle {...iconProps} color="#EF4444" />;
    case 'sad':
      return <Frown {...iconProps} color="#8B5CF6" />;
    default:
      return <Meh {...iconProps} />;
  }
};

const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  heading1: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  heading2: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  heading3: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  code_inline: {
    fontFamily: 'FiraCode-Regular',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 12,
  },
  paragraph: {
    marginBottom: 4,
  },
});

export default function DiaryCard({ entry, onPress, onAnalyze }: DiaryCardProps) {
  return (
    <GlassCard onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.date}>{formatDisplayDate(entry.date)}</Text>
        <MoodIcon mood={entry.mood} />
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {entry.title}
      </Text>

      <View style={styles.contentContainer}>
        {entry.isMarkdown ? (
          <MarkdownDisplay style={markdownStyles}>
            {entry.content}
          </MarkdownDisplay>
        ) : (
          <Text style={styles.content} numberOfLines={3}>
            {entry.content}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        {entry.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {entry.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {entry.tags.length > 3 && (
              <Text style={styles.moreText}>+{entry.tags.length - 3} more</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.aiButton} onPress={onAnalyze}>
          <Sparkles size={16} color="#8B5CF6" />
          <Text style={styles.aiButtonText}>Analyze</Text>
        </TouchableOpacity>
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
  date: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 8,
  },
  content: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  contentContainer: {
    marginBottom: 12,
    maxHeight: 60, // Limit height for card preview
    overflow: 'hidden',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  moreText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8B5CF6',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
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