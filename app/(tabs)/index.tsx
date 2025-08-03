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
import { Plus, Calendar, Search, Sparkles, Lightbulb, CreditCard as Edit3, Trash2, Tag, Filter, Eye, EyeOff, BookOpen, FileText } from 'lucide-react-native';
import { DiaryEntry, AIProvider } from '@/types';
import { StorageService } from '@/utils/storage';
import { formatDate, formatDisplayDate } from '@/utils/dateUtils';
import { trackDiaryEntry } from '@/utils/activityTracker';
import { createAIService } from '@/utils/aiService';
import DiaryCard from '@/components/DiaryCard';
import MarkdownEditor from '@/components/MarkdownEditor';
import GlassBackground from '@/components/GlassBackground';
import GlassCard from '@/components/GlassCard';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

export default function DiaryScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showViewEntry, setShowViewEntry] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    mood: 'neutral' as DiaryEntry['mood'],
    tags: [] as string[],
    template: 'free' as DiaryEntry['template'],
    isMarkdown: false,
  });
  const [newTag, setNewTag] = useState('');

  // Create styles inside component to access colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
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
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterButton: {
      borderRadius: 12,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    addButton: {
      borderRadius: 16,
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchContainer: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      marginLeft: 12,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
    },
    filtersContainer: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    filterSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    filterLabel: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      marginRight: 12,
    },
    filterChip: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
    },
    filterChipActive: {
      // backgroundColor will be set dynamically
    },
    filterChipText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
    },
    filterChipTextActive: {
      // color will be set dynamically
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 20,
      marginBottom: 8,
    },
    emptyText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    cancelButton: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
    },
    modalTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
    },
    saveButton: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
    },
    entryActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: 8,
      marginLeft: 8,
    },
    modalContent: {
      flex: 1,
      padding: 20,
    },
    dateSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    dateText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      marginLeft: 12,
    },
    templateSelector: {
      marginBottom: 20,
    },
    templateOption: {
      borderRadius: 12,
      padding: 16,
      marginRight: 12,
      minWidth: 160,
      borderWidth: 1,
    },
    selectedTemplate: {
      borderWidth: 2,
    },
    templateLabel: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      marginBottom: 4,
    },
    templateDescription: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
    },
    selectedTemplateText: {
      fontWeight: '600',
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    titleInput: {
      flex: 1,
      borderRadius: 12,
      padding: 16,
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
    },
    aiButton: {
      borderRadius: 12,
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },
    moodSelector: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      marginBottom: 12,
    },
    moodOption: {
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 12,
      borderWidth: 1,
    },
    moodText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
    },
    tagsSection: {
      marginBottom: 20,
    },
    tagInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    tagInput: {
      flex: 1,
      borderRadius: 12,
      padding: 16,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
    },
    addTagButton: {
      borderRadius: 12,
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 8,
    },
    tagText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
    },
    removeTagText: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      marginLeft: 8,
    },
    markdownToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    contentContainer: {
      flex: 1,
      minHeight: 300,
    },
    markdownEditor: {
      minHeight: 300,
    },
    contentInput: {
      borderRadius: 12,
      padding: 16,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      minHeight: 300,
    },
    readOnlyMarkdown: {
      minHeight: 200,
    },
    entryHeader: {
      marginBottom: 20,
    },
    entryDate: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.primary[500],
      marginBottom: 8,
    },
    entryMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    entryMood: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.text.tertiary,
    },
    entryTemplate: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.text.tertiary,
    },
    entryTitle: {
      fontFamily: 'Poppins-Bold',
      fontSize: 24,
      color: colors.text.primary,
      marginBottom: 20,
    },
    entryContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
    },
    entryText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.text.secondary,
      lineHeight: 24,
    },
    entryTagsContainer: {
      marginBottom: 20,
    },
    entryTagsTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 12,
    },
    entryTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    entryTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[100],
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 8,
    },
    entryTagText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: colors.primary[500],
      marginLeft: 4,
    },
    aiInsightsContainer: {
      backgroundColor: colors.semantic.warning + '20',
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: colors.semantic.warning,
    },
    aiInsightsTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 12,
    },
    aiInsight: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    aiInsightText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.secondary,
      marginLeft: 8,
      flex: 1,
      lineHeight: 20,
    },
    entryFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.neutral[200],
      paddingTop: 16,
    },
    entryTimestamp: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.text.tertiary,
      marginBottom: 4,
    },
    aiModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    aiModalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    aiModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    aiModalTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: colors.text.primary,
      marginLeft: 12,
    },
    aiSuggestionsList: {
      maxHeight: 300,
    },
    aiSuggestionItem: {
      backgroundColor: colors.neutral[50],
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    aiSuggestionText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    aiModalCloseButton: {
      backgroundColor: colors.neutral[100],
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    aiModalCloseText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.tertiary,
    },
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const loadedEntries = await StorageService.getDiaryEntries();
    setEntries(loadedEntries.sort((a: DiaryEntry, b: DiaryEntry) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ));
  };

  const generateAiSuggestions = async () => {
    try {
      const settings = await StorageService.getSettings();
      const activeProvider = settings.ai.providers.find(p => p.id === settings.ai.activeProvider);

      if (!activeProvider || !activeProvider.enabled || !settings.ai.features.diaryAssistance) {
        Alert.alert('AI Assistant', 'Please configure an AI provider in the AI Assistant tab first.');
        return;
      }

      const aiService = createAIService(activeProvider);
      const suggestions = await aiService.generateDiaryPrompts(newEntry.mood, entries.slice(0, 5));
      setAiSuggestions(suggestions);
      setShowAiSuggestions(true);
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      Alert.alert('AI Assistant', 'Unable to generate suggestions at this time.');
    }
  };

  const saveEntry = async () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }

    const entry: DiaryEntry = editingEntry ? {
      ...editingEntry,
      title: newEntry.title,
      content: newEntry.content,
      mood: newEntry.mood,
      tags: newEntry.tags,
      template: newEntry.template,
      isMarkdown: newEntry.isMarkdown,
      updatedAt: new Date().toISOString(),
    } : {
      id: Date.now().toString(),
      date: selectedDate,
      title: newEntry.title,
      content: newEntry.content,
      mood: newEntry.mood,
      tags: newEntry.tags,
      template: newEntry.template,
      isMarkdown: newEntry.isMarkdown,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Get AI insights if enabled
    try {
      const settings = await StorageService.getSettings();
      const activeProvider = settings.ai.providers.find(p => p.id === settings.ai.activeProvider);

      if (activeProvider && activeProvider.enabled && settings.ai.features.diaryAssistance) {
        const aiService = createAIService(activeProvider);
        const insights = await aiService.analyzeDiaryEntry(entry);
        entry.aiSuggestions = insights;
      }
    } catch (error) {
      console.error('Failed to get AI insights:', error);
    }

    let updatedEntries;
    if (editingEntry) {
      updatedEntries = entries.map(e => e.id === editingEntry.id ? entry : e);
    } else {
      updatedEntries = [entry, ...entries];
    }

    setEntries(updatedEntries);
    await StorageService.saveDiaryEntries(updatedEntries);

    // Track diary entry activity
    if (!editingEntry) {
      trackDiaryEntry(entry.id, entry.title, entry.mood);
    }

    closeModal();
  };

  const deleteEntry = async (entryId: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this diary entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedEntries = entries.filter(e => e.id !== entryId);
            setEntries(updatedEntries);
            await StorageService.saveDiaryEntries(updatedEntries);
            setShowViewEntry(false);
          },
        },
      ]
    );
  };

  const closeModal = () => {
    setShowNewEntry(false);
    setShowViewEntry(false);
    setEditingEntry(null);
    setNewEntry({
      title: '',
      content: '',
      mood: 'neutral',
      tags: [],
      template: 'free',
      isMarkdown: false,
    });
    setAiSuggestions([]);
    setShowAiSuggestions(false);
  };

  const openEntry = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setShowViewEntry(true);
  };

  const handleAnalyzeDiary = async (entry: DiaryEntry) => {
    try {
      const settings = await StorageService.getSettings();
      const activeProvider = settings.ai.providers.find(p => p.id === settings.ai.activeProvider);

      if (!activeProvider || !activeProvider.enabled || !settings.ai.features.diaryAssistance) {
        Alert.alert('AI Assistant', 'Please configure an AI provider in the AI Assistant tab first.');
        return;
      }

      const aiService = createAIService(activeProvider);
      const insights = await aiService.analyzeDiaryEntry(entry);

      Alert.alert('AI Insights', insights.join('\n\n'));
    } catch (error) {
      console.error('Failed to analyze diary entry:', error);
      Alert.alert('AI Assistant', 'Unable to analyze the entry at this time.');
    }
  };

  const editEntry = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setNewEntry({
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags,
      template: entry.template,
      isMarkdown: entry.isMarkdown || false,
    });
    setSelectedDate(entry.date);
    setShowViewEntry(false);
    setShowNewEntry(true);
  };

  const addTag = () => {
    if (newTag.trim() && !newEntry.tags.includes(newTag.trim())) {
      setNewEntry({
        ...newEntry,
        tags: [...newEntry.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewEntry({
      ...newEntry,
      tags: newEntry.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const getAllTags = () => {
    const allTags = new Set<string>();
    entries.forEach(entry => {
      entry.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags);
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => entry.tags.includes(tag));

    const matchesMood = !selectedMood || entry.mood === selectedMood;

    return matchesSearch && matchesTags && matchesMood;
  });

  const moodOptions = [
    { value: 'happy', label: '😊 Happy', color: colors.semantic.success },
    { value: 'excited', label: '🤩 Excited', color: colors.semantic.warning },
    { value: 'neutral', label: '😐 Neutral', color: colors.text.tertiary },
    { value: 'stressed', label: '😰 Stressed', color: colors.semantic.error },
    { value: 'sad', label: '😢 Sad', color: colors.accent[500] },
  ];

  const templateOptions = [
    { value: 'free', label: 'Free Writing', description: 'Write freely about anything' },
    { value: 'gratitude', label: 'Gratitude', description: 'What are you grateful for today?' },
    { value: 'reflection', label: 'Reflection', description: 'Reflect on your day and experiences' },
    { value: 'goals', label: 'Goals', description: 'Write about your goals and progress' },
  ];

  return (
    <GlassBackground>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text.primary }]}>{t('diary.title')}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary[500] }]}
              onPress={() => setShowNewEntry(true)}
            >
              <Plus size={24} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder={t('diary.search_entries')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>{t('diary.mood')}:</Text>
              <TouchableOpacity
                style={[
                  styles.filterChip, 
                  { backgroundColor: !selectedMood ? colors.primary[500] : colors.surface }
                ]}
                onPress={() => setSelectedMood('')}
              >
                <Text style={[
                  styles.filterChipText, 
                  { color: !selectedMood ? colors.text.inverse : colors.text.secondary }
                ]}>
                  {t('common.all')}
                </Text>
              </TouchableOpacity>
              {moodOptions.map((mood) => (
                <TouchableOpacity
                  key={mood.value}
                  style={[
                    styles.filterChip, 
                    { backgroundColor: selectedMood === mood.value ? colors.primary[500] : colors.surface }
                  ]}
                  onPress={() => setSelectedMood(selectedMood === mood.value ? '' : mood.value)}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: selectedMood === mood.value ? colors.text.inverse : colors.text.secondary }
                  ]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>{t('diary.tags')}:</Text>
              {getAllTags().map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.filterChip, 
                    { 
                      backgroundColor: selectedTags.includes(tag) ? colors.primary[500] : colors.surface,
                      borderColor: colors.neutral[200],
                    }
                  ]}
                  onPress={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: selectedTags.includes(tag) ? colors.text.inverse : colors.text.secondary }
                  ]}>
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <BookOpen size={64} color={colors.primary[500]} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {searchQuery || selectedTags.length > 0 || selectedMood ? t('diary.no_entries') : t('diary.no_entries')}
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {searchQuery || selectedTags.length > 0 || selectedMood
                ? 'Try adjusting your search or filters'
                : t('diary.create_first_entry')
              }
            </Text>
          </View>
        ) : (
          filteredEntries.map((entry) => (
            <DiaryCard
              key={entry.id}
              entry={entry}
              onPress={() => openEntry(entry)}
              onAnalyze={() => handleAnalyzeDiary(entry)}
            />
          ))
        )}
      </ScrollView>

      {/* New/Edit Entry Modal */}
      <Modal
        visible={showNewEntry}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.neutral[200] }]}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={[styles.cancelButton, { color: colors.text.secondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {editingEntry ? t('diary.edit_entry') : t('diary.new_entry')}
            </Text>
            <TouchableOpacity onPress={saveEntry}>
              <Text style={[styles.saveButton, { color: colors.primary[500] }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.dateSelector, { backgroundColor: colors.surface }]}>
              <Calendar size={20} color={colors.primary[500]} />
              <Text style={[styles.dateText, { color: colors.text.primary }]}>
                {formatDisplayDate(selectedDate)}
              </Text>
            </View>

            <View style={styles.templateSelector}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Template</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {templateOptions.map((template) => (
                  <TouchableOpacity
                    key={template.value}
                    style={[
                      styles.templateOption,
                      { 
                        backgroundColor: colors.surface,
                        borderColor: colors.neutral[200],
                      },
                      newEntry.template === template.value && { 
                        borderColor: colors.primary[500],
                        backgroundColor: colors.primary[50],
                      },
                    ]}
                    onPress={() => setNewEntry({ ...newEntry, template: template.value as DiaryEntry['template'] })}
                  >
                    <Text style={[
                      styles.templateLabel,
                      { color: colors.text.primary },
                      newEntry.template === template.value && { color: colors.primary[500] },
                    ]}>
                      {template.label}
                    </Text>
                    <Text style={[
                      styles.templateDescription,
                      { color: colors.text.secondary },
                      newEntry.template === template.value && { color: colors.primary[500] },
                    ]}>
                      {template.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.titleContainer}>
              <TextInput
                style={[styles.titleInput, { backgroundColor: colors.surface, color: colors.text.primary }]}
                placeholder="Entry title..."
                value={newEntry.title}
                onChangeText={(text) => setNewEntry({ ...newEntry, title: text })}
                placeholderTextColor={colors.text.tertiary}
              />
              <TouchableOpacity
                style={[styles.aiButton, { backgroundColor: colors.surface }]}
                onPress={generateAiSuggestions}
              >
                <Sparkles size={20} color={colors.primary[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.moodSelector}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>How are you feeling?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {moodOptions.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    style={[
                      styles.moodOption,
                      { 
                        backgroundColor: colors.surface,
                        borderColor: colors.neutral[200],
                      },
                      newEntry.mood === mood.value && {
                        backgroundColor: mood.color,
                        borderColor: mood.color,
                      },
                    ]}
                    onPress={() => setNewEntry({ ...newEntry, mood: mood.value as DiaryEntry['mood'] })}
                  >
                    <Text
                      style={[
                        styles.moodText,
                        { color: colors.text.secondary },
                        newEntry.mood === mood.value && { color: colors.text.inverse },
                      ]}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.tagsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Tags</Text>
              <View style={styles.tagInputContainer}>
                <TextInput
                  style={[styles.tagInput, { backgroundColor: colors.surface, color: colors.text.primary }]}
                  placeholder="Add a tag..."
                  value={newTag}
                  onChangeText={setNewTag}
                  onSubmitEditing={addTag}
                  placeholderTextColor={colors.text.tertiary}
                />
                <TouchableOpacity style={[styles.addTagButton, { backgroundColor: colors.surface }]} onPress={addTag}>
                  <Plus size={16} color={colors.primary[500]} />
                </TouchableOpacity>
              </View>
              <View style={styles.tagsContainer}>
                {newEntry.tags.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.tag, { backgroundColor: colors.primary[500] }]}
                    onPress={() => removeTag(tag)}
                  >
                    <Text style={[styles.tagText, { color: colors.text.inverse }]}>#{tag}</Text>
                    <Text style={[styles.removeTagText, { color: colors.text.inverse }]}>×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.markdownToggle, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Markdown Editor</Text>
              <Switch
                value={newEntry.isMarkdown}
                onValueChange={(value) => setNewEntry({ ...newEntry, isMarkdown: value })}
                trackColor={{ false: colors.neutral[200], true: colors.primary[500] }}
                thumbColor={colors.text.inverse}
              />
            </View>

            <View style={styles.contentContainer}>
              {newEntry.isMarkdown ? (
                <MarkdownEditor
                  value={newEntry.content}
                  onChangeText={(text) => setNewEntry({ ...newEntry, content: text })}
                  placeholder="Write your thoughts in Markdown..."
                  style={[styles.markdownEditor, { backgroundColor: colors.surface }]}
                />
              ) : (
                <TextInput
                  style={[styles.contentInput, { backgroundColor: colors.surface, color: colors.text.primary }]}
                  placeholder="Write your thoughts..."
                  value={newEntry.content}
                  onChangeText={(text) => setNewEntry({ ...newEntry, content: text })}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* View Entry Modal */}
      <Modal
        visible={showViewEntry}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.neutral[200] }]}>
            <TouchableOpacity onPress={() => setShowViewEntry(false)}>
              <Text style={[styles.cancelButton, { color: colors.text.secondary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Diary Entry</Text>
            <View style={styles.entryActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => selectedEntry && editEntry(selectedEntry)}
              >
                <Edit3 size={20} color={colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => selectedEntry && deleteEntry(selectedEntry.id)}
              >
                <Trash2 size={20} color={colors.semantic.error} />
              </TouchableOpacity>
            </View>
          </View>

          {selectedEntry && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.entryHeader}>
                <Text style={[styles.entryDate, { color: colors.primary[500] }]}>
                  {formatDisplayDate(selectedEntry.date)}
                </Text>
                <View style={styles.entryMeta}>
                  <Text style={[styles.entryMood, { color: colors.text.secondary }]}>
                    {moodOptions.find(m => m.value === selectedEntry.mood)?.label}
                  </Text>
                  <Text style={[styles.entryTemplate, { color: colors.text.secondary }]}>
                    {templateOptions.find(t => t.value === selectedEntry.template)?.label}
                  </Text>
                </View>
              </View>

              <Text style={[styles.entryTitle, { color: colors.text.primary }]}>{selectedEntry.title}</Text>

              <View style={[styles.entryContent, { backgroundColor: colors.surface }]}>
                {selectedEntry.isMarkdown ? (
                  <MarkdownEditor
                    value={selectedEntry.content}
                    onChangeText={() => {}}
                    style={styles.readOnlyMarkdown}
                  />
                ) : (
                  <Text style={[styles.entryText, { color: colors.text.primary }]}>{selectedEntry.content}</Text>
                )}
              </View>

              {selectedEntry.tags.length > 0 && (
                <View style={styles.entryTagsContainer}>
                  <Text style={[styles.entryTagsTitle, { color: colors.text.primary }]}>Tags</Text>
                  <View style={styles.entryTags}>
                    {selectedEntry.tags.map((tag, index) => (
                      <View key={index} style={[styles.entryTag, { backgroundColor: colors.surface }]}>
                        <Tag size={12} color={colors.primary[500]} />
                        <Text style={[styles.entryTagText, { color: colors.primary[500] }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {selectedEntry.aiSuggestions && selectedEntry.aiSuggestions.length > 0 && (
                <View style={[styles.aiInsightsContainer, { backgroundColor: colors.semantic.warning + '20', borderLeftColor: colors.semantic.warning }]}>
                  <Text style={[styles.aiInsightsTitle, { color: colors.text.primary }]}>AI Insights</Text>
                  {selectedEntry.aiSuggestions.map((insight, index) => (
                    <View key={index} style={styles.aiInsight}>
                      <Lightbulb size={16} color={colors.semantic.warning} />
                      <Text style={[styles.aiInsightText, { color: colors.text.primary }]}>{insight}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.entryFooter, { borderTopColor: colors.neutral[200] }]}>
                <Text style={[styles.entryTimestamp, { color: colors.text.tertiary }]}>
                  Created: {new Date(selectedEntry.createdAt).toLocaleString()}
                </Text>
                {selectedEntry.updatedAt !== selectedEntry.createdAt && (
                  <Text style={[styles.entryTimestamp, { color: colors.text.tertiary }]}>
                    Updated: {new Date(selectedEntry.updatedAt).toLocaleString()}
                  </Text>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* AI Suggestions Modal */}
      <Modal
        visible={showAiSuggestions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAiSuggestions(false)}
      >
        <View style={styles.aiModalOverlay}>
          <View style={[styles.aiModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.aiModalHeader}>
              <Lightbulb size={24} color={colors.primary[500]} />
              <Text style={[styles.aiModalTitle, { color: colors.text.primary }]}>Writing Prompts</Text>
            </View>

            <ScrollView style={styles.aiSuggestionsList}>
              {aiSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.aiSuggestionItem, { backgroundColor: colors.background, borderColor: colors.neutral[200] }]}
                  onPress={() => {
                    setNewEntry({ ...newEntry, content: suggestion });
                    setShowAiSuggestions(false);
                  }}
                >
                  <Text style={[styles.aiSuggestionText, { color: colors.text.primary }]}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.aiModalCloseButton, { backgroundColor: colors.background }]}
              onPress={() => setShowAiSuggestions(false)}
            >
              <Text style={[styles.aiModalCloseText, { color: colors.text.secondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </GlassBackground>
  );
}