import { create, StateCreator } from 'zustand';
import { StorageService } from '@/utils/storage';
import { AIProvider, AppSettings } from '@/types';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: number;
}

interface ModelStore {
  selectedModel: AIProvider | null;
  providers: AIProvider[];
  conversations: Conversation[];
  activeConversationId: string | null;
  setSelectedModel: (model: AIProvider) => Promise<void>;
  loadInitialData: () => Promise<void>;
  addProvider: (provider: AIProvider) => Promise<void>;
  loadConversations: () => Promise<void>;
  addConversation: (name: string) => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  removeProvider: (id: string) => Promise<void>;
  updateProvider: (provider: AIProvider) => Promise<void>;
}

const modelStoreCreator: StateCreator<ModelStore> = (set, get) => ({
  selectedModel: null,
  providers: [],
  conversations: [],
  activeConversationId: null,
  setSelectedModel: async (model: AIProvider) => {
    set({ selectedModel: model });
    const settings = await StorageService.getSettings();
    const newSettings: AppSettings = {
      ...settings,
      ai: {
        ...settings.ai,
        activeProvider: model.id,
      },
    };
    await StorageService.saveSettings(newSettings);
  },
  loadInitialData: async () => {
    const settings = await StorageService.getSettings();
    const { providers, activeProvider } = settings.ai;
    const selected = providers.find(p => p.id === activeProvider) || providers[0] || null;
    set({ providers, selectedModel: selected });
    await get().loadConversations();
  },
  addProvider: async (provider: AIProvider) => {
    const { providers } = get();
    if (providers.find((p: AIProvider) => p.id === provider.id)) return;

    const newProviders = [...providers, provider];
    set({ providers: newProviders });

    const settings = await StorageService.getSettings();
    const newSettings: AppSettings = {
      ...settings,
      ai: {
        ...settings.ai,
        providers: newProviders,
      },
    };
    await StorageService.saveSettings(newSettings);
  },
  loadConversations: async () => {
    const conversationData = await StorageService.getAllConversations();
    const conversations: Conversation[] = Object.entries(conversationData).map(([id, messages]) => {
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      return {
        id,
        name: messages.find(m => m.role === 'user')?.content.substring(0, 30) || 'New Conversation',
        lastMessage: lastMessage?.content.substring(0, 50) || '...',
        timestamp: lastMessage ? new Date(lastMessage.timestamp).getTime() : new Date().getTime(),
      };
    }).sort((a, b) => b.timestamp - a.timestamp);

    set({ conversations });

    if (!get().activeConversationId && conversations.length > 0) {
      set({ activeConversationId: conversations[0].id });
    } else if (conversations.length === 0) {
      const newId = await get().addConversation('New Conversation');
      set({ activeConversationId: newId });
    }
  },
  addConversation: async (name: string) => {
    const newId = `thread-${Date.now()}`;
    await StorageService.saveConversation(newId, []);
    await get().loadConversations();
    return newId;
  },
  deleteConversation: async (id: string) => {
    await StorageService.deleteConversation(id);
    await get().loadConversations();
    if (get().activeConversationId === id) {
      const conversations = get().conversations;
      set({ activeConversationId: conversations.length > 0 ? conversations[0].id : null });
    }
  },
  setActiveConversationId: (id: string | null) => {
    set({ activeConversationId: id });
  },
  removeProvider: async (id: string) => {
    const { providers, selectedModel } = get();
    const newProviders = providers.filter(p => p.id !== id);
    set({ providers: newProviders });

    if (selectedModel?.id === id) {
      const newSelectedModel = newProviders.length > 0 ? newProviders[0] : null;
      set({ selectedModel: newSelectedModel });
      const settings = await StorageService.getSettings();
      const newSettings: AppSettings = {
        ...settings,
        ai: {
          ...settings.ai,
          activeProvider: newSelectedModel?.id || '',
          providers: newProviders,
        },
      };
      await StorageService.saveSettings(newSettings);
    } else {
      const settings = await StorageService.getSettings();
      const newSettings: AppSettings = {
        ...settings,
        ai: {
          ...settings.ai,
          providers: newProviders,
        },
      };
      await StorageService.saveSettings(newSettings);
    }
  },
  updateProvider: async (provider: AIProvider) => {
    const { providers } = get();
    const newProviders = providers.map(p => (p.id === provider.id ? provider : p));
    set({ providers: newProviders });

    const settings = await StorageService.getSettings();
    const newSettings: AppSettings = {
      ...settings,
      ai: {
        ...settings.ai,
        providers: newProviders,
      },
    };
    await StorageService.saveSettings(newSettings);
  },
});

export const useModelStore = create<ModelStore>(modelStoreCreator);