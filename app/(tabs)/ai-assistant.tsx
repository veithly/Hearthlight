import React, { useState, useEffect, useRef } from 'react';
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
import { Send, Bot, User, Settings, Plus, Trash2, RefreshCw, MessageSquare, X, Edit, Brain } from 'lucide-react-native';
import { AIProvider, Task, DiaryEntry, Goal } from '@/types';
import { StorageService } from '@/utils/storage';
import { useModelStore } from '@/lib/stores/modelStore';
import { toastService } from '@/utils/toastService';
import { VercelAIAgentService } from '@/utils/vercelAIAgentService';

// Define message types for UI display
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
  name?: string; // For tool messages
}

export default function AIAssistantScreen() {
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
  const [langGraphService, setLangGraphService] = useState<VercelAIAgentService | null>(null);
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
    loadConversations,
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

  // Initialize and handle conversation loading
  useEffect(() => {
    if (selectedModel && activeConversationId) {
      try {
        const service = new VercelAIAgentService(selectedModel);
        setLangGraphService(service);
        loadConversationHistory(service, activeConversationId);
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
        setError('Failed to initialize AI service. Please check your provider configuration.');
      }
    }
  }, [selectedModel, activeConversationId]);

  const loadConversationHistory = async (service: VercelAIAgentService, threadId: string) => {
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

  // Send message using LangGraph
  const sendMessage = async (userMessage: string) => {
    if (!langGraphService || !activeConversationId) {
      Alert.alert('Error', 'AI service not initialized or no active conversation.');
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
      // Send message to Vercel AI Agent and get response
      const responseMessages = await langGraphService.sendMessage(userMessage, activeConversationId);

      // Convert agent messages to UI messages
      const newMessages: ChatMessage[] = [];

      for (let i = 0; i < responseMessages.length; i++) {
        const msg = responseMessages[i];

        if (msg.role === 'user') {
          // Skip user messages as we already added them
          continue;
        } else {
          newMessages.push({
            id: msg.id || `msg-${Date.now()}-${i}`,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            toolCalls: msg.toolCalls,
            name: msg.name,
          });
        }
      }

      // Update messages with new responses (excluding the user message we already added)
      setMessages(prev => [...prev, ...newMessages]);

    } catch (error) {
      console.error('AI request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);

      // Show appropriate error message
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toastService.showError(
          'Network error. Please check your connection and try again.',
          'Connection Error'
        );
      } else if (errorMessage.includes('API key') || errorMessage.includes('unauthorized')) {
        toastService.showError(
          'Authentication failed. Please check your API key.',
          'Auth Error'
        );
      } else {
        toastService.showError(
          'Failed to get AI response. Please try again.',
          'AI Error'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Retry last message
  const retryLastMessage = async () => {
    if (messages.length === 0) return;

    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) return;

    await sendMessage(lastUserMessage.content);
  };

  // Clear conversation
  const clearConversation = async () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            if (langGraphService && activeConversationId) {
              await langGraphService.clearConversation(activeConversationId);
              setMessages([]);
              loadConversations();
            }
          },
        },
      ]
    );
  };

  const handleNewConversation = async () => {
    const newId = await addConversation('New Conversation');
    setActiveConversationId(newId);
    setShowConversations(false);
  };

  const handleDeleteConversation = (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteConversation(id),
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
    } catch (error) {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowConversations(true)}
          >
            <MessageSquare size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettings(true)}
          >
            <Settings size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Brain size={64} color="#8B5CF6" />
          </View>
          <Text style={styles.emptyTitle}>Welcome to AI Assistant</Text>
          <Text style={styles.emptyText}>
            I can help you create tasks, diary entries, goals, and provide productivity insights. Just start typing!
          </Text>

          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Try asking me:</Text>
            {[
              'Create a task to buy groceries',
              'Write diary entry about my productive day',
              'Create a goal to exercise daily',
              'Show my app status',
              'Analyze my productivity this week'
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
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessage :
                message.role === 'tool' ? styles.toolMessage : styles.aiMessage,
              ]}
            >
              <View style={styles.messageHeader}>
                <View style={[
                  styles.messageAvatar,
                  message.role === 'user' ? styles.userAvatar :
                  message.role === 'tool' ? styles.toolAvatar : styles.aiAvatar
                ]}>
                  {message.role === 'user' ? (
                    <User size={16} color="#FFFFFF" />
                  ) : message.role === 'tool' ? (
                    <Text style={styles.toolAvatarText}>🔧</Text>
                  ) : (
                    <Bot size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.messageTime}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <View style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble :
                message.role === 'tool' ? styles.toolBubble : styles.aiBubble,
              ]}>
                <View>
                  <Text style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userText :
                    message.role === 'tool' ? styles.toolText : styles.aiText,
                  ]}>
                    {message.content}
                  </Text>
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <View style={styles.toolCallContainer}>
                      {message.toolCalls.map((toolCall) => (
                        <View key={toolCall.id} style={styles.toolCall}>
                          <Text style={styles.toolCallTitle}>Tool Call: {toolCall.name}</Text>
                          <Text style={styles.toolCallArgs}>
                            Arguments: {JSON.stringify(toolCall.args, null, 2)}
                          </Text>
                          <Text style={styles.toolCallResult}>
                            Result: {toolCall.result}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#8B5CF6" />
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
                <RefreshCw size={16} color="#8B5CF6" />
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
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Send size={20} color="#FFFFFF" />
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
              <Plus size={24} color="#8B5CF6" />
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
                  <Trash2 size={16} color="#EF4444" />
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
              <Plus size={24} color="#8B5CF6" />
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
                        <Edit size={16} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => removeProvider(provider.id)}
                      >
                        <Trash2 size={16} color="#EF4444" />
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
                placeholderTextColor="#9CA3AF"
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
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Base URL</Text>
              <TextInput
                style={styles.input}
                placeholder={getDefaultBaseUrl(newProvider.type)}
                value={newProvider.baseUrl}
                onChangeText={(text) => setNewProvider({ ...newProvider, baseUrl: text })}
                placeholderTextColor="#9CA3AF"
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
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <RefreshCw size={16} color="#8B5CF6" />
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
                  placeholderTextColor="#9CA3AF"
                />
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
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
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#8B5CF6',
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
    color: '#9CA3AF',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 16,
  },
  userBubble: {
    backgroundColor: '#8B5CF6',
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#374151',
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
    color: '#6B7280',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  saveButton: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#8B5CF6',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#111827',
    marginBottom: 16,
  },
  emptyProviders: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyProvidersText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
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
    color: '#111827',
  },
  providerDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  activeButtonSelected: {
    backgroundColor: '#8B5CF6',
  },
  activeButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  activeButtonTextSelected: {
    color: '#FFFFFF',
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
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  selectedTypeText: {
    color: '#111827',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fetchModelsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8B5CF6',
    marginLeft: 4,
  },
  modelsContainer: {
    flexDirection: 'row',
  },
  modelOption: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedModel: {
    backgroundColor: '#8B5CF6',
  },
  modelText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  selectedModelText: {
    color: '#FFFFFF',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#8B5CF6',
    marginLeft: 4,
  },
  conversationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeConversationItem: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
  },
  conversationDetails: {
    flex: 1,
  },
  conversationName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  conversationLastMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  toolAvatarText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  toolBubble: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  toolText: {
    color: '#4B5563',
    fontFamily: 'monospace',
  },
  toolCallContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  toolCall: {
    marginBottom: 8,
  },
  toolCallTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  toolCallArgs: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    backgroundColor: '#F9FAFB',
    padding: 4,
    borderRadius: 4,
  },
  toolCallResult: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
  },
  userAvatar: {
    backgroundColor: '#8B5CF6',
  },
  aiAvatar: {
    backgroundColor: '#6B7280',
  },
});