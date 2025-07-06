import React from 'react';
import { Task } from '@/types';
import { StorageService } from '@/utils/storage';
import DetailModal, { DetailField } from './DetailModal';

interface TaskDetailModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onUpdate: (tasks: Task[]) => void;
  isEditing?: boolean;
}

const QUADRANT_OPTIONS = [
  { label: 'Urgent & Important', value: 'urgent-important' },
  { label: 'Important, Not Urgent', value: 'not-urgent-important' },
  { label: 'Urgent, Not Important', value: 'urgent-not-important' },
  { label: 'Neither Urgent nor Important', value: 'not-urgent-not-important' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export default function TaskDetailModal({
  visible,
  task,
  onClose,
  onUpdate,
  isEditing = false,
}: TaskDetailModalProps) {
  if (!task) return null;

  const getTaskFields = (): DetailField[] => [
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      value: task.title,
      placeholder: 'Enter task title...',
      required: true,
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      value: task.description,
      placeholder: 'Enter task description...',
    },
    {
      key: 'quadrant',
      label: 'Quadrant',
      type: 'select',
      value: task.quadrant,
      options: QUADRANT_OPTIONS,
      required: true,
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      value: task.priority,
      options: PRIORITY_OPTIONS,
      required: true,
    },
    {
      key: 'estimatedTime',
      label: 'Estimated Time (minutes)',
      type: 'number',
      value: task.estimatedTime,
      placeholder: '60',
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      type: 'date',
      value: task.dueDate,
    },
    {
      key: 'completed',
      label: 'Completed',
      type: 'switch',
      value: task.completed,
    },
    {
      key: 'pomodoroSessions',
      label: 'Pomodoro Sessions',
      type: 'readonly',
      value: task.pomodoroSessions,
      editable: false,
    },
    {
      key: 'createdAt',
      label: 'Created',
      type: 'readonly',
      value: new Date(task.createdAt).toLocaleString(),
      editable: false,
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      type: 'readonly',
      value: new Date(task.updatedAt).toLocaleString(),
      editable: false,
    },
  ];

  const handleSave = async (updatedData: any) => {
    try {
      const updatedTask: Task = {
        ...task,
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };

      const allTasks = await StorageService.getTasks();
      const updatedTasks = allTasks.map(t => t.id === task.id ? updatedTask : t);
      
      await StorageService.saveTasks(updatedTasks);
      onUpdate(updatedTasks);
    } catch (error) {
      throw new Error('Failed to save task');
    }
  };

  const handleDelete = async () => {
    try {
      const allTasks = await StorageService.getTasks();
      const updatedTasks = allTasks.filter(t => t.id !== task.id);
      
      await StorageService.saveTasks(updatedTasks);
      onUpdate(updatedTasks);
      onClose();
    } catch (error) {
      throw new Error('Failed to delete task');
    }
  };

  return (
    <DetailModal
      visible={visible}
      title="Task Details"
      data={task}
      fields={getTaskFields()}
      onClose={onClose}
      onSave={handleSave}
      onDelete={handleDelete}
      isEditing={isEditing}
      showEditButton={true}
      showDeleteButton={true}
    />
  );
}
