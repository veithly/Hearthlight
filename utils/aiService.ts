import { AIProvider, Task, Goal, DiaryEntry } from '@/types';
import { streamToResponse, OpenAIStream } from 'ai';

/**
 * A versatile service for interacting with various AI language models.
 * This class abstracts the differences between providers like OpenAI, Gemini, and Claude,
 * offering a unified interface for generating text, suggestions, and analysis.
 */
export class AIService {
  private provider: AIProvider;
  private fallbackProvider: AIProvider | null;

   /**
     * @param provider The AI provider configuration.
     * @param fallbackProvider An optional fallback provider.
     */
   constructor(provider: AIProvider, fallbackProvider: AIProvider | null = null) {
     this.provider = provider;
     this.fallbackProvider = fallbackProvider;
   }

  /**
   * Makes a generic, non-streaming request to the configured AI provider.
   * @param prompt The user's prompt.
   * @param systemPrompt An optional system-level prompt to guide the AI's behavior.
   * @returns A promise that resolves to the AI's text response.
   */
  private async makeRequest(prompt: string, systemPrompt?: string, isFallback = false): Promise<string> {
    const provider = isFallback ? this.fallbackProvider : this.provider;
    if (!provider) {
      throw new Error(isFallback ? 'Fallback provider not configured.' : 'Provider not configured.');
    }

    try {
      const baseUrl = provider.baseUrl || this.getDefaultBaseUrl(provider);
      const endpoint = this.getEndpoint(provider);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify(this.formatRequest(prompt, systemPrompt, provider)),
      });

      if (!response.ok) {
        throw new Error(`AI API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      return this.extractResponse(data, provider);
    } catch (error) {
      if (!isFallback && this.fallbackProvider) {
        console.warn(`Primary model failed. Retrying with fallback: ${this.fallbackProvider.model}`);
        return this.makeRequest(prompt, systemPrompt, true);
      }
      console.error('AI Service Error after fallback:', error);
      throw error;
    }
  }

  /**
   * Gets the default base URL for a given AI provider type.
   * @returns The base URL string.
   */
  private getDefaultBaseUrl(provider: AIProvider): string {
    switch (provider.type) {
      case 'openai':
        return 'https://api.openai.com';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com';
      case 'claude':
        return 'https://api.anthropic.com';
      default:
        return provider.baseUrl || '';
    }
  }

  /**
   * Gets the appropriate API endpoint for the configured provider.
   * @returns The endpoint path.
   */
  private getEndpoint(provider: AIProvider): string {
    switch (provider.type) {
      case 'openai':
        return '/v1/chat/completions';
      case 'gemini':
        return '/v1beta/models/gemini-pro:generateContent';
      case 'claude':
        return '/v1/messages';
      default:
        return '/chat/completions';
    }
  }

  /**
   * Formats the request body according to the requirements of the configured AI provider.
   * @param prompt The user's prompt.
   * @param systemPrompt An optional system prompt.
   * @returns The formatted request body object.
   */
  private formatRequest(prompt: string, systemPrompt: string | undefined, provider: AIProvider): any {
    switch (provider.type) {
      case 'openai':
        return {
          model: provider.model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        };
      case 'gemini':
        return {
          contents: [{
            parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }]
          }],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
          },
        };
      case 'claude':
        return {
          model: provider.model,
          max_tokens: 1000,
          messages: [
            { role: 'user', content: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }
          ],
        };
      default:
        return {
          model: provider.model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
        };
    }
  }

  /**
   * Extracts the text response from the AI provider's JSON response.
   * @param data The JSON response data.
   * @returns The extracted text content.
   */
  private extractResponse(data: any, provider: AIProvider): string {
    switch (provider.type) {
      case 'openai':
        return data.choices?.[0]?.message?.content || '';
      case 'gemini':
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      case 'claude':
        return data.content?.[0]?.text || '';
      default:
        return data.choices?.[0]?.message?.content || '';
    }
  }

  /**
   * Generates a single, non-streamed response from the AI.
   * @param message The user's message.
   * @param conversationHistory The preceding conversation history.
   * @returns A promise that resolves to the AI's complete text response.
   */
  async generateResponse(message: string, conversationHistory: any[]): Promise<string> {
    const systemPrompt = `You are a helpful AI assistant for a productivity app. You can help users with:
    - Creating and managing tasks
    - Writing diary entries
    - Setting and tracking goals
    - Providing productivity insights
    - General conversation and advice

    Be helpful, encouraging, and concise in your responses.`;

    const contextPrompt = conversationHistory.length > 0
      ? `Previous conversation:\n${conversationHistory.map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}\n\nUser: ${message}`
      : message;

    return await this.makeRequest(contextPrompt, systemPrompt);
  }

  /**
   * Generates a streamed response from the AI.
   * @param messages The entire conversation history, including the latest message.
   * @returns A promise that resolves to a ReadableStream of the AI's response.
   */
  async generateResponseStream(messages: any[], isFallback = false): Promise<ReadableStream> {
    const provider = isFallback ? this.fallbackProvider : this.provider;
    if (!provider) {
      throw new Error(isFallback ? 'Fallback provider not configured.' : 'Provider not configured.');
    }

    const systemPrompt = `You are a helpful AI assistant for a productivity app. Be helpful, encouraging, and concise.`;

    try {
      const baseUrl = provider.baseUrl || this.getDefaultBaseUrl(provider);
      const endpoint = this.getEndpoint(provider);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          ...this.formatRequest(messages[messages.length - 1].content, systemPrompt, provider),
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI stream request failed: ${response.status}`);
      }
      return response.body as ReadableStream;
    } catch (error) {
      if (!isFallback && this.fallbackProvider) {
        console.warn(`Primary stream failed. Retrying with fallback: ${this.fallbackProvider.model}`);
        return this.generateResponseStream(messages, true);
      }
      console.error('AI Service stream error after fallback:', error);
      throw error;
    }
  }

  /**
   * Generates new task suggestions based on the user's goals and existing tasks.
   * @param goals The user's list of goals.
   * @param existingTasks The user's current list of tasks.
   * @returns A promise that resolves to an array of suggested new tasks.
   */
  async generateTaskSuggestions(goals: Goal[], existingTasks: Task[]): Promise<Task[]> {
    const systemPrompt = `You are a productivity assistant. Based on the user's goals and existing tasks, suggest 3-5 new actionable tasks that would help achieve their goals. Return only a JSON array of tasks with the following structure:
    [
      {
        "title": "Task title",
        "description": "Detailed description",
        "quadrant": "not-urgent-important",
        "priority": "medium",
        "estimatedTime": 60
      }
    ]`;

    const prompt = `Goals: ${JSON.stringify(goals.map(g => ({ title: g.title, description: g.description, type: g.type })))}

    Existing tasks: ${JSON.stringify(existingTasks.map(t => ({ title: t.title, quadrant: t.quadrant })))}

    Please suggest new tasks that would help achieve these goals.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const suggestions = JSON.parse(response);

      return suggestions.map((task: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        title: task.title,
        description: task.description,
        quadrant: task.quadrant || 'not-urgent-important',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pomodoroSessions: 0,
        priority: task.priority || 'medium',
        estimatedTime: task.estimatedTime || 60,
        aiGenerated: true,
      }));
    } catch (error) {
      console.error('Failed to generate task suggestions:', error);
      return [];
    }
  }

  /**
   * Analyzes a diary entry to provide insights and suggestions.
   * @param entry The diary entry to analyze.
   * @returns A promise that resolves to an array of string insights.
   */
  async analyzeDiaryEntry(entry: DiaryEntry): Promise<string[]> {
    const systemPrompt = `You are a thoughtful diary analysis assistant. Analyze the diary entry and provide 2-3 brief, encouraging insights or suggestions for personal growth. Keep responses positive and actionable.`;

    const prompt = `Diary Entry:
    Title: ${entry.title}
    Content: ${entry.content}
    Mood: ${entry.mood}

    Please provide insights and suggestions.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      return response.split('\n').filter(line => line.trim()).slice(0, 3);
    } catch (error) {
      console.error('Failed to analyze diary entry:', error);
      return [];
    }
  }

  /**
   * Analyzes a user's goal progress based on related tasks.
   * @param goal The goal to analyze.
   * @param relatedTasks The tasks associated with the goal.
   * @returns A promise that resolves to a string containing analysis and recommendations.
   */
  async analyzeGoalProgress(goal: Goal, relatedTasks: Task[]): Promise<string> {
    const systemPrompt = `You are a goal achievement coach. Analyze the goal progress and related tasks, then provide actionable advice for achieving the goal more effectively.`;

    const prompt = `Goal: ${goal.title}
    Description: ${goal.description}
    Progress: ${goal.progress}%
    Target Date: ${goal.targetDate}

    Related Tasks: ${JSON.stringify(relatedTasks.map(t => ({ title: t.title, completed: t.completed, quadrant: t.quadrant })))}

    Please provide analysis and recommendations.`;

    try {
      return await this.makeRequest(prompt, systemPrompt);
    } catch (error) {
      console.error('Failed to analyze goal progress:', error);
      return 'Unable to generate analysis at this time.';
    }
  }

  /**
   * Generates diary writing prompts based on the user's mood and recent entries.
   * @param mood The user's current mood.
   * @param previousEntries A list of recent diary entries.
   * @returns A promise that resolves to an array of string prompts.
   */
  async generateDiaryPrompts(mood: string, previousEntries: DiaryEntry[]): Promise<string[]> {
    const systemPrompt = `You are a creative writing assistant. Generate 3-5 thoughtful diary prompts based on the user's current mood and recent diary themes.`;

    const recentThemes = previousEntries.slice(0, 5).map(e => e.title).join(', ');
    const prompt = `Current mood: ${mood}
    Recent diary themes: ${recentThemes}

    Please generate inspiring diary prompts.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      return response.split('\n').filter(line => line.trim()).slice(0, 5);
    } catch (error) {
      console.error('Failed to generate diary prompts:', error);
      return [];
    }
  }

  /**
   * Decomposes a large goal into smaller, more manageable sub-goals.
   * @param goal The goal to decompose.
   * @returns A promise that resolves to an array of new sub-goals.
   */
  async decomposeGoal(goal: Goal): Promise<Goal[]> {
    const systemPrompt = `You are a goal planning expert. Break down the given goal into 3-5 smaller, actionable sub-goals. Return only a JSON array with the following structure:
    [
      {
        "title": "Sub-goal title",
        "description": "Detailed description",
        "type": "monthly",
        "priority": "high"
      }
    ]`;

    const prompt = `Goal to decompose:
    Title: ${goal.title}
    Description: ${goal.description}
    Type: ${goal.type}
    Target Date: ${goal.targetDate}

    Please break this down into smaller, achievable sub-goals.`;

    try {
      const response = await this.makeRequest(prompt, systemPrompt);
      const subGoals = JSON.parse(response);

      return subGoals.map((subGoal: any, index: number) => ({
        id: `sub-${goal.id}-${index}`,
        title: subGoal.title,
        description: subGoal.description,
        category: goal.category,
        type: subGoal.type || 'monthly',
        targetDate: this.calculateSubGoalDate(goal.targetDate, subGoal.type),
        progress: 0,
        milestones: [],
        subGoals: [],
        parentGoalId: goal.id,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority: subGoal.priority || 'medium',
      }));
    } catch (error) {
      console.error('Failed to decompose goal:', error);
      return [];
    }
  }

  /**
   * Calculates a reasonable target date for a sub-goal based on its parent's target date.
   * @param parentDate The target date of the parent goal.
   * @param type The type of the sub-goal ('weekly', 'monthly').
   * @returns An ISO string representing the calculated target date.
   */
  private calculateSubGoalDate(parentDate: string, type: string): string {
    const parent = new Date(parentDate);
    const now = new Date();

    switch (type) {
      case 'weekly':
        const weeksDiff = Math.floor((parent.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const weeksToAdd = Math.max(1, Math.floor(weeksDiff / 4));
        now.setDate(now.getDate() + (weeksToAdd * 7));
        return now.toISOString().split('T')[0];
      case 'monthly':
        const monthsDiff = (parent.getFullYear() - now.getFullYear()) * 12 + (parent.getMonth() - now.getMonth());
        const monthsToAdd = Math.max(1, Math.floor(monthsDiff / 2));
        now.setMonth(now.getMonth() + monthsToAdd);
        return now.toISOString().split('T')[0];
      default:
        return parentDate;
    }
  }
}

/**
 * Factory function to create a new instance of the AIService.
 * @param provider The AI provider configuration.
 * @returns A new AIService instance.
 */
export const createAIService = (provider: AIProvider): AIService => {
  return new AIService(provider);
};

import { useModelStore } from '@/lib/stores/modelStore';

/**
 * Factory function to create a new instance of the AIService for client-side use.
 * It automatically uses the currently selected model from the global store.
 * @returns A new AIService instance, or null if no model is selected.
 */
export const createClientAIService = (): AIService | null => {
  const { selectedModel, providers } = useModelStore.getState();

  if (!selectedModel) {
    console.warn('AI Service: No model selected.');
    return null;
  }

  // Simple fallback logic: find the first provider that isn't the selected one.
  const fallbackModel = providers.find((p: AIProvider) => p.id !== selectedModel.id) || null;

  return new AIService(selectedModel, fallbackModel);
};