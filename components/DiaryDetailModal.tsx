import React from 'react';
import { DiaryEntry } from '@/types';
import { StorageService } from '@/utils/storage';
import DetailModal, { DetailField } from './DetailModal';

interface DiaryDetailModalProps {
  visible: boolean;
  entry: DiaryEntry | null;
  onClose: () => void;
  onUpdate: (entries: DiaryEntry[]) => void;
  isEditing?: boolean;
}

const MOOD_OPTIONS = [
  { label: '😊 Happy', value: 'happy' },
  { label: '🤩 Excited', value: 'excited' },
  { label: '😐 Neutral', value: 'neutral' },
  { label: '😰 Stressed', value: 'stressed' },
  { label: '😢 Sad', value: 'sad' },
];

const TEMPLATE_OPTIONS = [
  { label: 'Free Writing', value: 'free' },
  { label: 'Gratitude', value: 'gratitude' },
  { label: 'Reflection', value: 'reflection' },
  { label: 'Goals', value: 'goals' },
];

export default function DiaryDetailModal({
  visible,
  entry,
  onClose,
  onUpdate,
  isEditing = false,
}: DiaryDetailModalProps) {
  if (!entry) return null;

  const getDiaryFields = (): DetailField[] => [
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      value: entry.title,
      placeholder: 'Enter entry title...',
      required: true,
    },
    {
      key: 'content',
      label: 'Content',
      type: entry.isMarkdown ? 'markdown' : 'textarea',
      value: entry.content,
      placeholder: 'Write your thoughts...',
      required: true,
    },
    {
      key: 'mood',
      label: 'Mood',
      type: 'select',
      value: entry.mood,
      options: MOOD_OPTIONS,
      required: true,
    },
    {
      key: 'template',
      label: 'Template',
      type: 'select',
      value: entry.template,
      options: TEMPLATE_OPTIONS,
      required: true,
    },
    {
      key: 'isMarkdown',
      label: 'Markdown Format',
      type: 'switch',
      value: entry.isMarkdown || false,
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'tags',
      value: entry.tags,
      editable: false, // For now, tags editing is complex
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      value: entry.date,
    },
    {
      key: 'aiSuggestions',
      label: 'AI Insights',
      type: 'readonly',
      value: entry.aiSuggestions ? `${entry.aiSuggestions.length} insights` : 'No insights',
      editable: false,
    },
    {
      key: 'createdAt',
      label: 'Created',
      type: 'readonly',
      value: new Date(entry.createdAt).toLocaleString(),
      editable: false,
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      type: 'readonly',
      value: new Date(entry.updatedAt).toLocaleString(),
      editable: false,
    },
  ];

  const handleSave = async (updatedData: any) => {
    try {
      const updatedEntry: DiaryEntry = {
        ...entry,
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };

      const allEntries = await StorageService.getDiaryEntries();
      const updatedEntries = allEntries.map(e => e.id === entry.id ? updatedEntry : e);

      await StorageService.saveDiaryEntries(updatedEntries);
      onUpdate(updatedEntries);
    } catch (error) {
      throw new Error('Failed to save diary entry');
    }
  };

  const handleDelete = async () => {
    try {
      const allEntries = await StorageService.getDiaryEntries();
      const updatedEntries = allEntries.filter(e => e.id !== entry.id);

      await StorageService.saveDiaryEntries(updatedEntries);
      onUpdate(updatedEntries);
      onClose();
    } catch (error) {
      throw new Error('Failed to delete diary entry');
    }
  };

  return (
    <DetailModal
      visible={visible}
      title="Diary Entry Details"
      data={entry}
      fields={getDiaryFields()}
      onClose={onClose}
      onSave={handleSave}
      onDelete={handleDelete}
      isEditing={isEditing}
      showEditButton={true}
      showDeleteButton={true}
    />
  );
}
