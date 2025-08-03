import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X, Edit3, Trash2, Save, Calendar, Clock, Target,
  Tag, AlertCircle, CheckCircle, Star, Flag
} from 'lucide-react-native';
import MarkdownDisplay from 'react-native-markdown-display';
import MarkdownEditor from './MarkdownEditor';

import { useTheme } from '@/lib/theme';

export interface DetailField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'switch' | 'number' | 'tags' | 'readonly' | 'markdown';
  value: any;
  options?: { label: string; value: any }[];
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  editable?: boolean;
}

export interface DetailModalProps {
  visible: boolean;
  title: string;
  data: any;
  fields: DetailField[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  isEditing?: boolean;
  isLoading?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
}

export default function DetailModal({
  visible,
  title,
  data,
  fields,
  onClose,
  onSave,
  onDelete,
  isEditing: initialEditing = false,
  isLoading = false,
  showEditButton = true,
  showDeleteButton = true,
}: DetailModalProps) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editedData, setEditedData] = useState(data);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedData(data);
    setIsEditing(initialEditing);
  }, [data, initialEditing]);

  const handleSave = async () => {
    // Validate required fields
    const missingFields = fields
      .filter(field => field.required && field.editable !== false)
      .filter(field => !editedData[field.key] || editedData[field.key].toString().trim() === '');

    if (missingFields.length > 0) {
      Alert.alert(
        'Validation Error',
        `Please fill in the following required fields: ${missingFields.map(f => f.label).join(', ')}`
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedData);
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const updateField = (key: string, value: any) => {
    setEditedData(prev => ({ ...prev, [key]: value }));
  };

  const renderField = (field: DetailField) => {
    const value = editedData[field.key];
    const isFieldEditable = isEditing && field.editable !== false;

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            {isFieldEditable ? (
              <TextInput
                style={styles.textInput}
                value={value?.toString() || ''}
                onChangeText={(text) => updateField(field.key, field.type === 'number' ? Number(text) : text)}
                placeholder={field.placeholder}
                keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                placeholderTextColor={colors.text.tertiary}
              />
            ) : (
              <Text style={styles.fieldValue}>{value?.toString() || 'Not set'}</Text>
            )}
          </View>
        );

      case 'textarea':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            {isFieldEditable ? (
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={value?.toString() || ''}
                onChangeText={(text) => updateField(field.key, text)}
                placeholder={field.placeholder}
                multiline
                textAlignVertical="top"
                placeholderTextColor={colors.text.tertiary}
              />
            ) : (
              <Text style={styles.fieldValue}>{value?.toString() || 'Not set'}</Text>
            )}
          </View>
        );

      case 'select':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            {isFieldEditable ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.selectContainer}>
                  {field.options?.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.selectOption,
                        value === option.value && styles.selectedOption,
                      ]}
                      onPress={() => updateField(field.key, option.value)}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          value === option.value && styles.selectedOptionText,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.fieldValue}>
                {field.options?.find(opt => opt.value === value)?.label || 'Not set'}
              </Text>
            )}
          </View>
        );

      case 'switch':
        return (
          <View key={field.key} style={styles.switchContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Switch
              value={Boolean(value)}
              onValueChange={(newValue) => updateField(field.key, newValue)}
              disabled={!isFieldEditable}
              trackColor={{ false: colors.neutral[200], true: colors.primary[500] }}
              thumbColor={value ? colors.text.inverse : colors.text.primary}
            />
          </View>
        );

      case 'date':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.dateContainer}>
              <Calendar size={16} color={colors.primary[500]} />
              <Text style={styles.dateText}>
                {value ? new Date(value).toLocaleDateString() : 'Not set'}
              </Text>
            </View>
          </View>
        );

      case 'tags':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.tagsContainer}>
              {Array.isArray(value) && value.length > 0 ? (
                value.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Tag size={12} color={colors.primary[500]} />
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.fieldValue}>No tags</Text>
              )}
            </View>
          </View>
        );

      case 'readonly':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={styles.fieldValue}>{value?.toString() || 'Not set'}</Text>
          </View>
        );

      case 'markdown':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            {isFieldEditable ? (
              <MarkdownEditor
                value={value?.toString() || ''}
                onChangeText={(text) => updateField(field.key, text)}
                placeholder={field.placeholder}
                style={styles.markdownEditor}
              />
            ) : (
              <View style={styles.markdownPreview}>
                <MarkdownDisplay style={markdownStyles}>
                  {value?.toString() || '*No content*'}
                </MarkdownDisplay>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text.tertiary} />
          </TouchableOpacity>

          <Text style={styles.title}>{title}</Text>

          <View style={styles.headerActions}>
            {isEditing ? (
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={styles.actionButton}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <Save size={20} color={colors.primary[500]} />
                )}
              </TouchableOpacity>
            ) : (
              <>
                {showEditButton && (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.actionButton}
                  >
                    <Edit3 size={20} color={colors.primary[500]} />
                  </TouchableOpacity>
                )}
                {showDeleteButton && onDelete && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.actionButton}
                  >
                    <Trash2 size={20} color={colors.semantic.error} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {fields.map(renderField)}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: colors.surface,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  fieldValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    padding: 16,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    padding: 4,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  selectedOption: {
    backgroundColor: colors.surface,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectOptionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.text.tertiary,
  },
  selectedOptionText: {
    color: colors.text.primary,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.primary[500],
    marginLeft: 4,
  },
  markdownEditor: {
    minHeight: 200,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    marginTop: 8,
  },
  markdownPreview: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    minHeight: 100,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  heading1: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: 16,
  },
  heading2: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: 12,
  },
  heading3: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 8,
  },
  code_inline: {
    fontFamily: 'FiraCode-Regular',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    fontFamily: 'FiraCode-Regular',
    backgroundColor: colors.neutral[100],
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  paragraph: {
    marginBottom: 8,
  },
});
}
