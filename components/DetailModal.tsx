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

export interface DetailField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'switch' | 'number' | 'tags' | 'readonly';
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
                placeholderTextColor="#9CA3AF"
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
                placeholderTextColor="#9CA3AF"
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
              trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
              thumbColor={value ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>
        );

      case 'date':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.dateContainer}>
              <Calendar size={16} color="#8B5CF6" />
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
                    <Tag size={12} color="#8B5CF6" />
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
            <X size={24} color="#6B7280" />
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
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <Save size={20} color="#8B5CF6" />
                )}
              </TouchableOpacity>
            ) : (
              <>
                {showEditButton && (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.actionButton}
                  >
                    <Edit3 size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                )}
                {showDeleteButton && onDelete && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.actionButton}
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
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
    color: '#6B7280',
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
    color: '#374151',
    marginBottom: 8,
  },
  fieldValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectOptionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  selectedOptionText: {
    color: '#111827',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8B5CF6',
    marginLeft: 4,
  },
});
