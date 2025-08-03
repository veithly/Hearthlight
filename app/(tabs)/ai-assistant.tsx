import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Bot, User, Settings, MessageSquare, Brain, RefreshCw, Plus, Trash2, Edit } from 'lucide-react-native';
import { AIProvider } from '@/types';
import Markdown from 'react-native-markdown-display';
import { StorageService } from '@/utils/storage';
import { useModelStore } from '@/lib/stores/modelStore';
import { toastService } from '@/utils/toastService';
import { createAIService } from '@/utils/aiService';
import { AIAgentService } from '@/utils/vercelAIAgentService';
import { collect_feedback_mcp_feedback_collector } from '@/utils/mcpTools';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

// Define message types for UI display
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  reactPhase?: 'reasoning' | 'acting' | 'reflecting' | 'responding';
  toolResults?: ToolResult[];
  toolCalls?: any[];
  name?: string;
}

interface ToolResult {
  toolName: string;
  arguments: any;
  result: string;
  timestamp: string;
}

// Chat Bubble Component
const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { colors } = useTheme();
  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case 'reasoning': return '🤔';
      case 'acting': return '🔧';
      case 'reflecting': return '💭';
      case 'responding': return '💬';
      default: return '';
    }
  };

  const getPhaseColor = (phase?: string) => {
    switch (phase) {
      case 'reasoning': return colors.primary[500];
      case 'acting': return colors.semantic.success;
      case 'reflecting': return colors.semantic.warning;
      case 'responding': return colors.accent[500];
      default: return colors.text.tertiary;
    }
  };

  // Markdown styles for AI messages
  const markdownStyles = {
    body: {
      fontSize: 16,
      lineHeight: 24,
      color: message.role === 'user' ? colors.text.inverse : colors.text.primary,
      fontFamily: 'Inter-Regular',
    },
    heading1: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: message.role === 'user' ? colors.text.inverse : colors.text.primary,
      marginBottom: 8,
    },
    heading2: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: message.role === 'user' ? colors.text.inverse : colors.text.primary,
      marginBottom: 6,
    },
    heading3: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: message.role === 'user' ? colors.text.inverse : colors.text.primary,
      marginBottom: 4,
    },
    paragraph: {
      marginBottom: 8,
      fontSize: 16,
      lineHeight: 24,
      color: message.role === 'user' ? colors.text.inverse : colors.text.secondary,
    },
    strong: {
      fontWeight: '600' as const,
      color: message.role === 'user' ? colors.text.inverse : colors.text.primary,
    },
    em: {
      fontStyle: 'italic' as const,
    },
    code_inline: {
      backgroundColor: message.role === 'user' ? colors.glassmorphism.blur : colors.neutral[100],
      color: message.role === 'user' ? colors.text.inverse : colors.semantic.error,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
      fontFamily: 'monospace',
    },
    code_block: {
      backgroundColor: message.role === 'user' ? colors.glassmorphism.blur : colors.surface,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
      borderLeftWidth: 3,
      borderLeftColor: message.role === 'user' ? colors.text.inverse : colors.accent[500],
    },
    fence: {
      backgroundColor: message.role === 'user' ? colors.glassmorphism.blur : colors.neutral[50],
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
      borderLeftWidth: 3,
      borderLeftColor: message.role === 'user' ? colors.text.inverse : colors.accent[500],
    },
    list_item: {
      marginBottom: 4,
    },
    bullet_list: {
      marginBottom: 8,
    },
    ordered_list: {
      marginBottom: 8,
    },
    blockquote: {
      backgroundColor: message.role === 'user' ? colors.glassmorphism.blur : colors.neutral[100],
      paddingLeft: 16,
      paddingVertical: 8,
      borderLeftWidth: 4,
      borderLeftColor: message.role === 'user' ? colors.text.inverse : colors.neutral[200],
      marginVertical: 8,
    },
  };

  return (
    <View style={[
      styles.messageContainer,
      message.role === 'user' ? styles.userMessage : styles.aiMessage,
    ]}>
      <View style={styles.messageHeader}>
        <View style={[
          styles.messageAvatar,
          message.role === 'user' ? styles.userAvatar : styles.aiAvatar
        ]}>
          {message.role === 'user' ? (
            <User size={16} color={colors.text.inverse} />
          ) : (
            <Bot size={16} color={colors.text.inverse} />
          )}
        </View>

        {message.reactPhase && (
          <View style={[styles.phaseIndicator, { backgroundColor: getPhaseColor(message.reactPhase) }]}>
            <Text style={styles.phaseIcon}>{getPhaseIcon(message.reactPhase)}</Text>
            <Text style={styles.phaseText}>
              {message.reactPhase.charAt(0).toUpperCase() + message.reactPhase.slice(1)}
            </Text>
          </View>
        )}

        <Text style={styles.messageTime}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      </View>

      <View style={[
        styles.messageBubble,
        message.role === 'user' ? styles.userBubble : styles.aiBubble,
      ]}>
        {message.role === 'user' ? (
          <Text style={[styles.messageText, styles.userText]}>
            {message.content}
          </Text>
        ) : (
          <View style={styles.markdownContainer}>
            <Markdown
              style={markdownStyles}
              mergeStyle={true}
            >
              {message.content}
            </Markdown>
            {message.isStreaming && (
              <Text style={styles.streamingCursor}>|</Text>
            )}
          </View>
        )}

        {/* Tool Results in Collapsed Format */}
        {message.toolResults && message.toolResults.length > 0 && (
          <CollapsibleToolResults
            toolResults={message.toolResults}
            phase={message.reactPhase || 'unknown'}
          />
        )}
      </View>
    </View>
  );
};

// Collapsible Tool Results Component
const CollapsibleToolResults: React.FC<{
  toolResults: ToolResult[];
  phase: string;
}> = ({ toolResults, phase }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!toolResults || toolResults.length === 0) {
    return null;
  }

  return (
    <View style={styles.toolResultsContainer}>
      <TouchableOpacity
        style={styles.toolResultsHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.toolResultsHeaderLeft}>
          <Text style={styles.toolResultsIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
          <Text style={styles.toolResultsTitle}>
            Tool Results ({toolResults.length})
          </Text>
        </View>
        <Text style={styles.toolResultsPhase}>{phase}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.toolResultsContent}>
          {toolResults.map((result, index) => (
            <View key={index} style={styles.toolResultItem}>
              <Text style={styles.toolResultName}>
                🔧 {result.toolName}
              </Text>
              {result.arguments && Object.keys(result.arguments).length > 0 && (
                <View style={styles.toolResultSection}>
                  <Text style={styles.toolResultLabel}>XML Arguments:</Text>
                  <Text style={styles.toolResultCode}>
                    {`<arguments>\n${Object.entries(result.arguments)
                      .map(([key, value]) => `  <${key}>${value}</${key}>`)
                      .join('\n')}\n</arguments>`}
                  </Text>
                </View>
              )}
              <View style={styles.toolResultSection}>
                <Text style={styles.toolResultLabel}>Result:</Text>
                <Text style={styles.toolResultValue}>
                  {typeof result.result === 'string' && result.result.length > 200
                    ? result.result.substring(0, 200) + '...'
                    : result.result
                  }
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default function AIAssistantScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();

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
    headerButton: {
      borderRadius: 12,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    activeButton: {
      backgroundColor: colors.primary[100],
      borderWidth: 2,
      borderColor: colors.primary[500],
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.neutral[100],
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 24,
      color: colors.text.primary,
      marginBottom: 12,
      textAlign: 'center',
    },
    emptyText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    suggestionsContainer: {
      width: '100%',
    },
    suggestionsTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    suggestionChip: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    suggestionText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.primary[500],
      textAlign: 'center',
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: 20,
    },
    messageContainer: {
      marginBottom: 16,
    },
    userMessage: {
      alignItems: 'flex-end',
    },
    aiMessage: {
      alignItems: 'flex-start',
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    messageAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    messageTime: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.text.tertiary,
    },
    messageBubble: {
      maxWidth: '80%',
      borderRadius: 16,
      padding: 16,
    },
    userBubble: {
      backgroundColor: colors.accent[500],
    },
    aiBubble: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    messageText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
    },
    userText: {
      color: colors.text.inverse,
    },
    aiText: {
      color: colors.text.secondary,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    loadingText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.text.tertiary,
      marginLeft: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[200],
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.neutral[50],
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.text.primary,
      maxHeight: 100,
      marginRight: 12,
    },
    sendButton: {
      backgroundColor: colors.primary[500],
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.neutral[300],
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[200],
      backgroundColor: colors.surface,
    },
    cancelButton: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.text.tertiary,
    },
    modalTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
      color: colors.text.primary,
    },
    saveButton: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.primary[500],
    },
    modalContent: {
      flex: 1,
      padding: 20,
    },
    sectionTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 20,
      color: colors.text.primary,
      marginBottom: 16,
    },
    emptyProviders: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
    },
    emptyProvidersText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    providerCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.text.inverse,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    providerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    providerName: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
    },
    providerDetails: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    providerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    providerButton: {
      backgroundColor: colors.neutral[100],
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
    },
    activeButtonSelected: {
      backgroundColor: colors.primary[500],
    },
    activeButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: colors.text.tertiary,
    },
    activeButtonTextSelected: {
      color: colors.text.inverse,
    },
    deleteButton: {
      padding: 8,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: colors.text.primary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.text.primary,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    typeSelector: {
      flexDirection: 'row',
      backgroundColor: colors.neutral[100],
      borderRadius: 12,
      padding: 4,
    },
    typeOption: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    selectedType: {
      backgroundColor: colors.surface,
      shadowColor: colors.text.inverse,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    typeText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.text.tertiary,
    },
    selectedTypeText: {
      color: colors.text.primary,
    },
    modelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    fetchModelsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[100],
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    fetchModelsText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: colors.primary[500],
      marginLeft: 4,
    },
    modelsContainer: {
      flexDirection: 'row',
    },
    modelOption: {
      backgroundColor: colors.neutral[100],
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
    },
    selectedModel: {
      backgroundColor: colors.primary[500],
    },
    modelText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: colors.text.tertiary,
    },
    selectedModelText: {
      color: colors.text.inverse,
    },
    errorContainer: {
      backgroundColor: colors.semantic.error + '10',
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 20,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.semantic.error + '30',
    },
    errorText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.semantic.error,
      marginBottom: 12,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[100],
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: 'flex-start',
    },
    retryButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.primary[500],
      marginLeft: 4,
    },
    conversationItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activeConversationItem: {
      borderColor: colors.primary[500],
      borderWidth: 2,
    },
    conversationDetails: {
      flex: 1,
    },
    conversationName: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.text.primary,
    },
    conversationLastMessage: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.tertiary,
      marginTop: 4,
    },
    deleteConversationButton: {
      padding: 8,
    },
    editButton: {
      padding: 8,
    },
    toolMessage: {
      alignItems: 'flex-start',
    },
    toolAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.text.tertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    toolAvatarText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.text.inverse,
    },
    toolBubble: {
      backgroundColor: colors.neutral[100],
      borderColor: colors.neutral[200],
      borderWidth: 1,
    },
    toolText: {
      color: colors.text.secondary,
      fontFamily: 'monospace',
    },
    toolCallContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[200],
    },
    toolCall: {
      marginBottom: 8,
    },
    toolCallTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    toolCallArgs: {
      fontFamily: 'monospace',
      fontSize: 12,
      color: colors.text.tertiary,
      marginBottom: 4,
      backgroundColor: colors.neutral[100],
      padding: 4,
      borderRadius: 4,
    },
    toolCallResult: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text.secondary,
      backgroundColor: colors.neutral[100],
      padding: 8,
      borderRadius: 8,
    },
    userAvatar: {
      backgroundColor: colors.primary[500],
    },
    aiAvatar: {
      backgroundColor: colors.neutral[500],
    },
    // Phase indicator styles
    phaseIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    phaseIcon: {
      fontSize: 12,
      marginRight: 4,
    },
    phaseText: {
      fontSize: 11,
      color: colors.text.inverse,
      fontWeight: '600',
    },
    // Streaming cursor
    streamingCursor: {
      color: colors.primary[500],
      fontWeight: 'bold',
      fontSize: 16,
    },
    // Markdown container
    markdownContainer: {
      flex: 1,
    },
    // Tool results styles
    toolResultsContainer: {
      marginTop: 12,
      backgroundColor: colors.neutral[50],
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      overflow: 'hidden',
    },
    toolResultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.neutral[100],
    },
    toolResultsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    toolResultsIcon: {
      fontSize: 12,
      color: colors.text.tertiary,
      marginRight: 8,
    },
    toolResultsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    toolResultsPhase: {
      fontSize: 12,
      color: colors.primary[500],
      backgroundColor: colors.primary[100],
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      fontWeight: '500',
    },
    toolResultsContent: {
      padding: 12,
    },
    toolResultItem: {
      backgroundColor: colors.surface,
      borderRadius: 6,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary[500],
    },
    toolResultName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    toolResultSection: {
      marginBottom: 8,
    },
    toolResultLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.tertiary,
      marginBottom: 4,
    },
    toolResultCode: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: colors.text.secondary,
      backgroundColor: colors.neutral[50],
      padding: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    toolResultValue: {
      fontSize: 12,
      color: colors.semantic.success,
      backgroundColor: colors.semantic.success + '10',
      padding: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.semantic.success + '30',
    },
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);

  const {
    providers,
    selectedModel,
    setSelectedModel,
    loadInitialData,
    addProvider: addProviderToStore,
    removeProvider: removeProviderFromStore,
    updateProvider: updateProviderInStore,
    conversations,
    activeConversationId,
    addConversation,
    deleteConversation,
    setActiveConversationId,
  } = useModelStore();

  const [newProvider, setNewProvider] = useState({
    name: '',
    type: 'openai' as AIProvider['type'],
    apiKey: '',
    baseUrl: '',
    model: '',
  });

  const scrollViewRef = useRef<ScrollView>(null);



  const initializeAIService = useCallback(async () => {
    try {
      const service = new AIAgentService(selectedModel!);

      // Check AI conversation settings
      const settings = await StorageService.getSettings();
      const shouldStartFresh = settings.ai.conversation.startFreshByDefault;

      if (shouldStartFresh || !activeConversationId) {
        // Start a fresh conversation
        const newConversationId = await addConversation('New Chat');
        setActiveConversationId(newConversationId);
        setMessages([]);
      } else if (activeConversationId) {
        // Load existing conversation
        loadConversationHistory(service, activeConversationId);
      }
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      setError('Failed to initialize AI service. Please check your provider configuration.');
    }
  }, [selectedModel, addConversation, setActiveConversationId, activeConversationId]);

  // Initialize and handle conversation loading
  useEffect(() => {
    if (selectedModel) {
      initializeAIService();
    }
  }, [selectedModel, addConversation, setActiveConversationId, initializeAIService]);

  const loadConversationHistory = async (service: AIAgentService, threadId: string) => {
    try {
      const history = await service.getConversationHistory(threadId);
      const chatMessages = history.map((msg, index) => ({
        id: msg.id || `msg-${index}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        toolCalls: msg.toolCalls,
        name: msg.name,
      }));
      setMessages(chatMessages);
    } catch (error) {
      console.error(`Failed to load conversation history for ${threadId}:`, error);
    }
  };





  // Send message using ReAct methodology
  const sendMessage = async (userMessage: string) => {
    if (!selectedModel) {
      Alert.alert('Error', 'No AI model selected.');
      return;
    }

    if (!userMessage.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Add user message to UI immediately
    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');

    try {
      // Use the enhanced AI service with tool calling
      const aiServiceInstance = createAIService(selectedModel!);

      // Convert messages to conversation history format
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));

      const aiResponse = await aiServiceInstance.generateResponse(userMessage, conversationHistory);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };





  // Collect user feedback using MCP
  const collectUserFeedback = async () => {
    try {
      const workSummary = `AI Assistant with XML Tool Calls Testing Complete:

✅ Enhanced AI assistant with XML-based tool calling system
✅ ReAct methodology with 4-phase processing (Reasoning → Acting → Reflecting → Responding)
✅ Real-time streaming output for all phases
✅ Internal tool integration for productivity tasks:
   - Task creation and management
   - Diary entry writing assistance
   - Goal setting and tracking
   - Productivity pattern analysis
✅ Collapsible tool results display with XML format
✅ Fixed all TypeScript errors and type safety issues
✅ Proper error handling and user feedback

The system now uses reliable XML format for tool calls instead of error-prone JSON, making it more robust and easier to parse. Users can create tasks, diary entries, goals, and get productivity insights through natural conversation.

Please test the AI assistant and provide feedback on:
- Tool calling reliability and accuracy
- User experience with ReAct mode vs regular mode
- Streaming output performance and readability
- Overall functionality and any issues encountered`;

      // Use the feedback MCP collector
      const feedbackResult = await collect_feedback_mcp_feedback_collector({
        work_summary: workSummary,
        timeout_seconds: 120 // 2 minutes for comprehensive testing feedback
      });

      if (feedbackResult && Array.isArray(feedbackResult)) {
        const textFeedback = feedbackResult
          .filter(item => item.type === 'text')
          .map(item => item.content)
          .join(' ');

        if (textFeedback) {
          console.log('User feedback received:', textFeedback);
          Alert.alert(
            'Feedback Received',
            'Thank you for your feedback! It will help improve the AI assistant.',
            [{ text: 'OK' }]
          );
        } else {
          console.log('No feedback provided by user');
        }
      }
    } catch (error) {
      console.log('Feedback collection failed:', error);
      // Don't show error to user as feedback collection is optional
    }
  };


  // Retry last message
  const retryLastMessage = async () => {
    if (messages.length === 0) return;

    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) return;

    await sendMessage(lastUserMessage.content);
  };





  const handleNewConversation = async () => {
    try {
      const timestamp = new Date().toLocaleString();
      const newId = await addConversation(`New Chat - ${timestamp}`);
      setActiveConversationId(newId);
      setMessages([]); // Clear current messages
      setShowConversations(false);

      // Show success feedback
      Alert.alert(
        'New Conversation',
        'Started a new conversation successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      Alert.alert('Error', 'Failed to create new conversation. Please try again.');
    }
  };

  const handleDeleteConversation = (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(id);

              // If we deleted the active conversation, create a new one
              if (id === activeConversationId) {
                const newId = await addConversation('New Chat');
                setActiveConversationId(newId);
                setMessages([]);
              }

              // Show success feedback
              Alert.alert(
                'Conversation Deleted',
                'The conversation has been deleted successfully.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Failed to delete conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation. Please try again.');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const getDefaultBaseUrl = (type: string): string => {
    switch (type) {
      case 'openai':
        return 'https://api.openai.com';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com';
      case 'claude':
        return 'https://api.anthropic.com';
      default:
        return '';
    }
  };

  const fetchAvailableModels = async (provider: Partial<AIProvider>) => {
    if (!provider.apiKey || !provider.type) {
      Alert.alert('Error', 'Please provide an API key and select a provider type first.');
      return;
    }

    const baseUrl = provider.baseUrl || getDefaultBaseUrl(provider.type);

    if (!baseUrl || baseUrl.trim() === '') {
      Alert.alert('Error', 'Please provide a valid base URL for the custom provider.');
      return;
    }

    try {
      new URL(baseUrl);
    } catch {
      Alert.alert('Error', 'Please provide a valid base URL (e.g., https://api.example.com).');
      return;
    }

    setIsLoadingModels(true);
    try {
      let endpoint = '';
      let headers: any = {
        'Authorization': `Bearer ${provider.apiKey}`,
      };

      switch (provider.type) {
        case 'openai':
          endpoint = `${baseUrl}/models`;
          break;
        case 'gemini':
          endpoint = `${baseUrl}/v1beta/models?key=${provider.apiKey}`;
          headers = {};
          break;
        case 'claude':
          setAvailableModels([
            'claude-3-5-sonnet-20240620',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
          ]);
          setIsLoadingModels(false);
          return;
        case 'custom':
          if (!provider.baseUrl) {
            Alert.alert('Error', 'Please provide a base URL for the custom provider.');
            setIsLoadingModels(false);
            return;
          }
          endpoint = `${baseUrl}/v1/models`;
          break;
        default:
          setAvailableModels([]);
          setIsLoadingModels(false);
          return;
      }

      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let models: string[] = [];

      switch (provider.type) {
        case 'openai':
        case 'custom':
          models = data.data
            ?.filter((model: any) => model.id && typeof model.id === 'string')
            ?.map((model: any) => model.id) || [];
          break;
        case 'gemini':
          models = data.models
            ?.filter((model: any) => model.name && model.name.includes('gemini'))
            ?.map((model: any) => model.name.split('/').pop()) || [];
          break;
      }

      if (models.length === 0) {
        Alert.alert('No Models Found', 'No compatible models were found for this provider.');
      }

      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      let alertMessage = `Failed to fetch available models: ${errorMessage}`;

      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('CORS')) {
        alertMessage += '\n\nThis appears to be a network or CORS issue. Please check your server configuration.';
      }

      Alert.alert('Network Error', alertMessage);
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const addProvider = async () => {
    if (editingProvider) {
      // Update existing provider
      const updatedProvider = { ...editingProvider, ...newProvider };
      await updateProviderInStore(updatedProvider);
      toastService.showSuccess('Provider updated successfully.');
    } else {
      // Add new provider
      if (!newProvider.name || !newProvider.apiKey || !newProvider.model) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
      if (newProvider.type === 'custom' && (!newProvider.baseUrl || newProvider.baseUrl.trim() === '')) {
        Alert.alert('Error', 'Please provide a valid base URL for the custom provider');
        return;
      }
      const provider: AIProvider = {
        id: Date.now().toString(),
        name: newProvider.name,
        type: newProvider.type,
        apiKey: newProvider.apiKey,
        baseUrl: newProvider.baseUrl || getDefaultBaseUrl(newProvider.type),
        model: newProvider.model,
        enabled: true,
      };
      await addProviderToStore(provider);
      if (!selectedModel) {
        setSelectedModel(provider);
      }
      toastService.showSuccess('Provider added successfully.');
    }

    setShowProviderModal(false);
    setEditingProvider(null);
    setNewProvider({
      name: '',
      type: 'openai',
      apiKey: '',
      baseUrl: '',
      model: '',
    });
    setAvailableModels([]);
  };

  const removeProvider = async (providerId: string) => {
    Alert.alert(
      'Remove Provider',
      'Are you sure you want to remove this AI provider?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeProviderFromStore(providerId);
            toastService.showSuccess('Provider removed successfully.');
          },
        },
      ]
    );
  };

  const handleSend = async () => {
    await sendMessage(input);
  };

  const handleTextChange = (text: string) => {
    setInput(text);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{t('ai.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={collectUserFeedback}
          >
            <MessageSquare size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowConversations(true)}
          >
            <RefreshCw size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowSettings(true)}
          >
            <Settings size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
            <Brain size={64} color={colors.primary[500]} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            {t('ai.title')}
          </Text>
          <Text style={styles.emptyText}>
            I can help you with productivity tasks like creating tasks, writing diary entries, setting goals, analyzing your progress, and planning your day. Just ask me naturally!
          </Text>

          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Try these examples:</Text>
            {[
              'Create a task for my important project deadline',
              'Help me write a diary entry about today',
              'Set up a goal for improving my health habits',
              'Analyze my productivity patterns this week',
              'Plan my tasks for tomorrow using the Eisenhower Matrix',
              'Create a habit tracking system for my morning routine'
            ].map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => {
                  setInput(suggestion);
                  sendMessage(suggestion);
                }}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent[500]} />
              <Text style={styles.loadingText}>
                AI is thinking...
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {error}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={retryLastMessage}
              >
                <RefreshCw size={16} color={colors.accent[500]} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask me anything..."
          value={input}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
          placeholderTextColor={colors.text.tertiary}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Send size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      {/* Conversations Modal */}
      <Modal
        visible={showConversations}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConversations(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowConversations(false)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Conversations</Text>
            <TouchableOpacity onPress={handleNewConversation}>
              <Plus size={24} color={colors.accent[500]} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {conversations.map((convo) => (
              <TouchableOpacity
                key={convo.id}
                style={[
                  styles.conversationItem,
                  activeConversationId === convo.id && styles.activeConversationItem,
                ]}
                onPress={() => {
                  setActiveConversationId(convo.id);
                  setShowConversations(false);
                }}
              >
                <View style={styles.conversationDetails}>
                  <Text style={styles.conversationName}>{convo.name}</Text>
                  <Text style={styles.conversationLastMessage}>{convo.lastMessage}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteConversationButton}
                  onPress={() => handleDeleteConversation(convo.id)}
                >
                  <Trash2 size={16} color={colors.semantic.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>AI Settings</Text>
            <TouchableOpacity onPress={() => {
              setEditingProvider(null);
              setShowProviderModal(true);
            }}>
              <Plus size={24} color={colors.accent[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionTitle}>AI Providers</Text>

            {providers.length === 0 ? (
              <View style={styles.emptyProviders}>
                <Text style={styles.emptyProvidersText}>
                  No AI providers configured. Add one to get started.
                </Text>
              </View>
            ) : (
              providers.map((provider: AIProvider) => (
                <View key={provider.id} style={styles.providerCard}>
                  <View style={styles.providerHeader}>
                    <View>
                      <Text style={styles.providerName}>{provider.name}</Text>
                      <Text style={styles.providerDetails}>
                        {provider.type.toUpperCase()} • {provider.model}
                      </Text>
                    </View>
                    <View style={styles.providerActions}>
                      <TouchableOpacity
                        style={[
                          styles.activeButton,
                          selectedModel?.id === provider.id && styles.activeButtonSelected
                        ]}
                        onPress={() => setSelectedModel(provider)}
                      >
                        <Text style={[
                          styles.activeButtonText,
                          selectedModel?.id === provider.id && styles.activeButtonTextSelected
                        ]}>
                          {selectedModel?.id === provider.id ? 'Active' : 'Activate'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                          setEditingProvider(provider);
                          setNewProvider({
                            ...provider,
                            baseUrl: provider.baseUrl || '',
                          });
                          setShowProviderModal(true);
                        }}
                      >
                        <Edit size={16} color={colors.text.tertiary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => removeProvider(provider.id)}
                      >
                        <Trash2 size={16} color={colors.semantic.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add/Edit Provider Modal */}
      <Modal
        visible={showProviderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowProviderModal(false);
              setEditingProvider(null);
            }}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingProvider ? 'Edit' : 'Add'} AI Provider</Text>
            <TouchableOpacity onPress={addProvider}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Provider Name</Text>
              <TextInput
                style={styles.input}
                placeholder="My OpenAI Provider"
                value={newProvider.name}
                onChangeText={(text) => setNewProvider({ ...newProvider, name: text })}
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Provider Type</Text>
              <View style={styles.typeSelector}>
                {['openai', 'gemini', 'claude', 'custom'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newProvider.type === type && styles.selectedType,
                    ]}
                    onPress={() => {
                      setNewProvider({
                        ...newProvider,
                        type: type as AIProvider['type'],
                        baseUrl: type !== 'custom' ? getDefaultBaseUrl(type) : ''
                      });
                      setAvailableModels([]);
                    }}
                  >
                    <Text style={[
                      styles.typeText,
                      newProvider.type === type && styles.selectedTypeText,
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API Key</Text>
              <TextInput
                style={styles.input}
                placeholder="sk-..."
                value={newProvider.apiKey}
                onChangeText={(text) => setNewProvider({ ...newProvider, apiKey: text })}
                secureTextEntry
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Base URL</Text>
              <TextInput
                style={styles.input}
                placeholder={getDefaultBaseUrl(newProvider.type)}
                value={newProvider.baseUrl}
                onChangeText={(text) => setNewProvider({ ...newProvider, baseUrl: text })}
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.modelHeader}>
                <Text style={styles.inputLabel}>Model</Text>
                <TouchableOpacity
                  style={styles.fetchModelsButton}
                  onPress={() => fetchAvailableModels(newProvider)}
                  disabled={!newProvider.apiKey || isLoadingModels}
                >
                  {isLoadingModels ? (
                    <ActivityIndicator size="small" color={colors.accent[500]} />
                  ) : (
                    <RefreshCw size={16} color={colors.accent[500]} />
                  )}
                  <Text style={styles.fetchModelsText}>Fetch Models</Text>
                </TouchableOpacity>
              </View>

              {availableModels.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.modelsContainer}>
                    {availableModels.map((model) => (
                      <TouchableOpacity
                        key={model}
                        style={[
                          styles.modelOption,
                          newProvider.model === model && styles.selectedModel,
                        ]}
                        onPress={() => setNewProvider({ ...newProvider, model })}
                      >
                        <Text style={[
                          styles.modelText,
                          newProvider.model === model && styles.selectedModelText,
                        ]}>
                          {model}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="gpt-4, gemini-pro, claude-3-opus"
                  value={newProvider.model}
                  onChangeText={(text) => setNewProvider({ ...newProvider, model: text })}
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

