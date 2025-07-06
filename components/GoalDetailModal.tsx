import React from 'react';
import { Goal } from '@/types';
import { StorageService } from '@/utils/storage';
import DetailModal, { DetailField } from './DetailModal';

interface GoalDetailModalProps {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
  onUpdate: (goals: Goal[]) => void;
  isEditing?: boolean;
}

const CATEGORY_OPTIONS = [
  { label: 'Personal', value: 'personal' },
  { label: 'Career', value: 'career' },
  { label: 'Health', value: 'health' },
  { label: 'Finance', value: 'finance' },
  { label: 'Learning', value: 'learning' },
  { label: 'Relationship', value: 'relationship' },
];

const TYPE_OPTIONS = [
  { label: 'Yearly', value: 'yearly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paused', value: 'paused' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export default function GoalDetailModal({
  visible,
  goal,
  onClose,
  onUpdate,
  isEditing = false,
}: GoalDetailModalProps) {
  if (!goal) return null;

  const getGoalFields = (): DetailField[] => [
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      value: goal.title,
      placeholder: 'Enter goal title...',
      required: true,
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      value: goal.description,
      placeholder: 'Enter goal description...',
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      value: goal.category,
      options: CATEGORY_OPTIONS,
      required: true,
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      value: goal.type,
      options: TYPE_OPTIONS,
      required: true,
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      value: goal.priority,
      options: PRIORITY_OPTIONS,
      required: true,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: goal.status,
      options: STATUS_OPTIONS,
      required: true,
    },
    {
      key: 'targetDate',
      label: 'Target Date',
      type: 'date',
      value: goal.targetDate,
    },
    {
      key: 'progress',
      label: 'Progress (%)',
      type: 'number',
      value: goal.progress,
      placeholder: '0',
    },
    {
      key: 'milestones',
      label: 'Milestones',
      type: 'readonly',
      value: `${goal.milestones?.length || 0} milestones`,
      editable: false,
    },
    {
      key: 'subGoals',
      label: 'Sub Goals',
      type: 'readonly',
      value: `${goal.subGoals?.length || 0} sub goals`,
      editable: false,
    },
    {
      key: 'createdAt',
      label: 'Created',
      type: 'readonly',
      value: new Date(goal.createdAt).toLocaleString(),
      editable: false,
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      type: 'readonly',
      value: new Date(goal.updatedAt).toLocaleString(),
      editable: false,
    },
  ];

  const handleSave = async (updatedData: any) => {
    try {
      const updatedGoal: Goal = {
        ...goal,
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };

      const allGoals = await StorageService.getGoals();
      const updatedGoals = allGoals.map(g => g.id === goal.id ? updatedGoal : g);
      
      await StorageService.saveGoals(updatedGoals);
      onUpdate(updatedGoals);
    } catch (error) {
      throw new Error('Failed to save goal');
    }
  };

  const handleDelete = async () => {
    try {
      const allGoals = await StorageService.getGoals();
      const updatedGoals = allGoals.filter(g => g.id !== goal.id);
      
      await StorageService.saveGoals(updatedGoals);
      onUpdate(updatedGoals);
      onClose();
    } catch (error) {
      throw new Error('Failed to delete goal');
    }
  };

  return (
    <DetailModal
      visible={visible}
      title="Goal Details"
      data={goal}
      fields={getGoalFields()}
      onClose={onClose}
      onSave={handleSave}
      onDelete={handleDelete}
      isEditing={isEditing}
      showEditButton={true}
      showDeleteButton={true}
    />
  );
}
