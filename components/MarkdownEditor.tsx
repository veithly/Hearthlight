import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Eye, EyeOff, Type, Bold, Italic, Link, Code, Quote, List, SquareCheck as CheckSquare } from 'lucide-react-native';
import { MARKDOWN_SHORTCUTS, insertMarkdownSyntax } from '@/utils/markdown';
import MarkdownDisplay from 'react-native-markdown-display';

interface MarkdownEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
}

export default function MarkdownEditor({
  value,
  onChangeText,
  placeholder = 'Write your content...',
  style,
}: MarkdownEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textInputRef = useRef<TextInput>(null);

  const insertSyntax = (syntax: string) => {
    const { newText, newCursorPosition } = insertMarkdownSyntax(
      value,
      selection.start,
      selection.end,
      syntax
    );
    
    onChangeText(newText);
    
    // Set cursor position after text update
    setTimeout(() => {
      textInputRef.current?.setNativeProps({
        selection: { start: newCursorPosition, end: newCursorPosition },
      });
    }, 10);
  };

  const getShortcutIcon = (label: string) => {
    const iconProps = { size: 16, color: '#6B7280' };
    
    switch (label) {
      case 'B': return <Bold {...iconProps} />;
      case 'I': return <Italic {...iconProps} />;
      case 'Link': return <Link {...iconProps} />;
      case 'Code': return <Code {...iconProps} />;
      case 'Quote': return <Quote {...iconProps} />;
      case 'List': return <List {...iconProps} />;
      case 'Task': return <CheckSquare {...iconProps} />;
      default: return <Type {...iconProps} />;
    }
  };

  const markdownStyles = StyleSheet.create({
    body: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      color: '#111827',
    },
    heading1: {
      fontFamily: 'Poppins-Bold',
      fontSize: 24,
      color: '#111827',
      marginBottom: 16,
    },
    heading2: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 20,
      color: '#111827',
      marginBottom: 12,
    },
    heading3: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: '#111827',
      marginBottom: 8,
    },
    code_inline: {
      fontFamily: 'FiraCode-Regular',
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    code_block: {
      fontFamily: 'FiraCode-Regular',
      backgroundColor: '#F3F4F6',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    blockquote: {
      backgroundColor: '#F9FAFB',
      borderLeftWidth: 4,
      borderLeftColor: '#8B5CF6',
      paddingLeft: 16,
      paddingVertical: 8,
      marginVertical: 8,
    },
    list_item: {
      marginVertical: 2,
    },
    link: {
      color: '#8B5CF6',
      textDecorationLine: 'underline',
    },
  });

  return (
    <View style={[styles.container, style]}>
      {showToolbar && (
        <View style={styles.toolbar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.toolbarScroll}
          >
            {MARKDOWN_SHORTCUTS.map((shortcut) => (
              <TouchableOpacity
                key={shortcut.label}
                style={styles.toolbarButton}
                onPress={() => insertSyntax(shortcut.syntax)}
              >
                {getShortcutIcon(shortcut.label)}
                <Text style={styles.toolbarButtonText}>{shortcut.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? (
              <EyeOff size={20} color="#8B5CF6" />
            ) : (
              <Eye size={20} color="#8B5CF6" />
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.editorContainer}>
        {isPreviewMode ? (
          <ScrollView style={styles.preview}>
            <MarkdownDisplay style={markdownStyles}>
              {value || '*No content to preview*'}
            </MarkdownDisplay>
          </ScrollView>
        ) : (
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  toolbarScroll: {
    flex: 1,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  toolbarButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  previewButton: {
    padding: 8,
    marginLeft: 8,
  },
  editorContainer: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    padding: 16,
    lineHeight: 24,
  },
  preview: {
    flex: 1,
    padding: 16,
  },
});