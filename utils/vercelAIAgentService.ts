/**
 * Vercel AI SDK Agent Service
 *
 * This service uses Vercel AI SDK to replicate LangGraph functionality
 * with proper tool calling and conversation management for React Native.
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AIProvider, Task, DiaryEntry, Goal } from '@/types';
import { StorageService } from '@/utils/storage';

// Define message types
interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  name?: string;
}

interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any;
}

// Define conversation state
interface ConversationState {
  messages: AgentMessage[];
  threadId: string;
  lastUpdated: Date;
}

// Simple tool execution functions for non-tool-calling providers
const executeCreateTask = async (args: any) => {
  try {
    const { title, description, priority, quadrant } = args;
    const tasks = await StorageService.getTasks();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title || 'New Task',
      description: description || '',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pomodoroSessions: 0,
      priority: priority || 'medium',
      quadrant: quadrant || 'not-urgent-important',
      aiGenerated: true,
    };
    await StorageService.saveTasks([...tasks, newTask]);
    return `Successfully created task: "${title}" with ID ${newTask.id}`;
  } catch (error) {
    return `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

const executeCreateDiaryEntry = async (args: any) => {
  try {
    const { title, content, mood, tags } = args;
    const entries = await StorageService.getDiaryEntries();
    const newEntry: DiaryEntry = {
      id: `diary-${Date.now()}`,
      date: new Date().toISOString(),
      title: title || 'New Entry',
      content: content || '',
      mood: mood || 'neutral',
      tags: tags || [],
      template: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isMarkdown: true,
    };
    await StorageService.saveDiaryEntries([...entries, newEntry]);
    return `Successfully created diary entry: "${title}" with ID ${newEntry.id}`;
  } catch (error) {
    return `Failed to create diary entry: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

const executeCreateGoal = async (args: any) => {
  try {
    const { title, description, category, type, priority } = args;
    const goals = await StorageService.getGoals();
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title: title || 'New Goal',
      description: description || '',
      category: category || 'personal',
      type: type || 'monthly',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 0,
      milestones: [],
      subGoals: [],
      status: 'active',
      priority: priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await StorageService.saveGoals([...goals, newGoal]);
    return `Successfully created goal: "${title}" with ID ${newGoal.id}`;
  } catch (error) {
    return `Failed to create goal: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

const executeGetAppStatus = async () => {
  try {
    const [tasks, goals, diaryEntries, habits] = await Promise.all([
      StorageService.getTasks(),
      StorageService.getGoals(),
      StorageService.getDiaryEntries(),
      StorageService.getHabits(),
    ]);

    const completedTasks = tasks.filter((task: Task) => task.completed).length;
    const totalTasks = tasks.length;
    const activeGoals = goals.filter((goal: Goal) => goal.status === 'active').length;
    const recentEntries = diaryEntries.filter((entry: DiaryEntry) => {
      const entryDate = new Date(entry.date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return entryDate > weekAgo;
    }).length;

    const status = {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: totalTasks - completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      goals: {
        active: activeGoals,
        total: goals.length
      },
      diary: {
        entriesThisWeek: recentEntries,
        totalEntries: diaryEntries.length
      },
      habits: {
        total: habits.length
      }
    };

    return `Current app status: ${JSON.stringify(status, null, 2)}`;
  } catch (error) {
    return `Failed to get app status: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

const executeAnalyzeProductivity = async (args: any) => {
  try {
    const { period = 'week' } = args;
    const tasks = await StorageService.getTasks();

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const recentTasks = tasks.filter((task: Task) => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= startDate;
    });

    const completedTasks = recentTasks.filter((task: Task) => task.completed);
    const highPriorityTasks = recentTasks.filter((task: Task) => task.priority === 'high');
    const completedHighPriority = highPriorityTasks.filter((task: Task) => task.completed);

    const analysis = {
      period,
      totalTasks: recentTasks.length,
      completedTasks: completedTasks.length,
      completionRate: recentTasks.length > 0 ? Math.round((completedTasks.length / recentTasks.length) * 100) : 0,
      highPriorityTasks: highPriorityTasks.length,
      completedHighPriority: completedHighPriority.length,
      insights: [] as string[]
    };

    // Generate insights
    if (analysis.completionRate >= 80) {
      analysis.insights.push("Excellent productivity! You're completing most of your tasks.");
    } else if (analysis.completionRate >= 60) {
      analysis.insights.push("Good productivity. Consider focusing on high-priority tasks.");
    } else {
      analysis.insights.push("Room for improvement. Try breaking down large tasks into smaller ones.");
    }

    if (highPriorityTasks.length > 0 && completedHighPriority.length === 0) {
      analysis.insights.push("Focus on completing your high-priority tasks first.");
    }

    return `Productivity analysis for ${period}: ${JSON.stringify(analysis, null, 2)}`;
  } catch (error) {
    return `Failed to analyze productivity: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export class VercelAIAgentService {
  private provider: AIProvider;
  private conversationStates: Map<string, ConversationState> = new Map();

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  private getModel() {
    switch (this.provider.type) {
      case 'openai':
      case 'custom':
        const openai = createOpenAI({
          apiKey: this.provider.apiKey,
          baseURL: this.provider.baseUrl,
        });
        return openai(this.provider.model as any);
      case 'claude':
        const anthropic = createAnthropic({
          apiKey: this.provider.apiKey,
        });
        return anthropic(this.provider.model as any);
      case 'gemini':
        const google = createGoogleGenerativeAI({
          apiKey: this.provider.apiKey,
        });
        return google(this.provider.model as any);
      default:
        throw new Error(`Unsupported provider type: ${this.provider.type}`);
    }
  }

  private getSystemPrompt(): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `You are a helpful AI assistant for a productivity app called "Hearthlight".
The current date is ${currentDate}.

You can help users with:
- Creating and managing tasks
- Writing diary entries
- Creating and tracking goals
- Analyzing productivity data
- Getting app status and insights

To use a tool, you must use the following XML format in your response:
<tool_use>
  <name>tool_name</name>
  <arguments>{"arg1": "value1", "arg2": "value2"}</arguments>
</tool_use>

Available tools:
- createTask(arguments: {"title": string, "description"?: string, "priority"?: "low" | "medium" | "high", "quadrant"?: "urgent-important" | "not-urgent-important" | "urgent-not-important" | "not-urgent-not-important"})
- createDiaryEntry(arguments: {"title": string, "content": string, "mood"?: "positive" | "neutral" | "negative", "tags"?: string[]})
- createGoal(arguments: {"title": string, "description"?: string, "category"?: string, "type"?: "daily" | "weekly" | "monthly" | "yearly", "priority"?: "low" | "medium" | "high"})
- getAppStatus()
- analyzeProductivity(arguments: {"period"?: "day" | "week" | "month"})

When users ask for information about their productivity, call getAppStatus() or analyzeProductivity().
When they want to create something, call the appropriate creation function.
Always be helpful, encouraging, and provide actionable insights.

For example, to create a task:
<tool_use>
  <name>createTask</name>
  <arguments>{"title": "Buy groceries", "priority": "medium"}</arguments>
</tool_use>
`;
  }

  // Simplified agent execution for providers that don't support tool calling properly
  private async executeAgentStep(message: string, conversationHistory: AgentMessage[]): Promise<{ response: string; toolCalls: ToolCall[] }> {
    const model = this.getModel();
    const systemPrompt = this.getSystemPrompt();

    // Build conversation context
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];

    try {
      const { text } = await generateText({
        model,
        messages,
      });

      // Parse function calls from the response
      const toolCalls: ToolCall[] = [];
      let modifiedResponse = text;

      // Look for tool calls in the response
      const toolCallPattern = /<tool_use>[\s\S]*?<\/tool_use>/g;
      let match;

      while ((match = toolCallPattern.exec(text)) !== null) {
        const toolCallXml = match[0];
        const nameMatch = /<name>([\s\S]*?)<\/name>/.exec(toolCallXml);
        const argsMatch = /<arguments>([\s\S]*?)<\/arguments>/.exec(toolCallXml);

        if (nameMatch && argsMatch) {
          const functionName = nameMatch[1].trim();
          const argsString = argsMatch[1].trim();
          let args = {};
          try {
            args = JSON.parse(argsString);
          } catch (e) {
            console.error("Failed to parse tool arguments JSON:", e);
            modifiedResponse = modifiedResponse.replace(toolCallXml, `❌ Failed to parse arguments for ${functionName}`);
            continue;
          }

          // Execute the function
          let result = '';
          try {
            switch (functionName) {
              case 'createTask':
                result = await executeCreateTask(args);
                break;
              case 'createDiaryEntry':
                result = await executeCreateDiaryEntry(args);
                break;
              case 'createGoal':
                result = await executeCreateGoal(args);
                break;
              case 'getAppStatus':
                result = await executeGetAppStatus();
                break;
              case 'analyzeProductivity':
                result = await executeAnalyzeProductivity(args);
                break;
              default:
                result = `Unknown function: ${functionName}`;
            }

            const toolCall: ToolCall = {
              id: `tool-${Date.now()}-${Math.random()}`,
              name: functionName,
              args,
              result
            };
            toolCalls.push(toolCall);

            // Replace the function call with the result
            modifiedResponse = modifiedResponse.replace(toolCallXml, `✅ ${result}`);
          } catch (error) {
            const errorMessage = `Failed to execute ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            modifiedResponse = modifiedResponse.replace(toolCallXml, `❌ ${errorMessage}`);
          }
        }
      }

      return {
        response: modifiedResponse,
        toolCalls
      };

    } catch (error) {
      console.error('Agent execution failed:', error);
      return {
        response: `I apologize, but I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolCalls: []
      };
    }
  }

  async sendMessage(message: string, threadId: string = 'default'): Promise<AgentMessage[]> {
    // Get or create conversation state
    let state = this.conversationStates.get(threadId);
    if (!state) {
      state = {
        messages: [],
        threadId,
        lastUpdated: new Date()
      };
      this.conversationStates.set(threadId, state);
    }

    // Add user message
    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    state.messages.push(userMessage);

    try {
      // Execute agent step
      const { response, toolCalls } = await this.executeAgentStep(message, state.messages.slice(0, -1));

      // Add AI response
      const aiMessage: AgentMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

      state.messages.push(aiMessage);
      state.lastUpdated = new Date();

      // Save conversation history
      await this.saveConversationHistory(threadId, state);

      return [userMessage, aiMessage];
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async getConversationHistory(threadId: string = 'default'): Promise<AgentMessage[]> {
    const state = this.conversationStates.get(threadId);
    if (state) {
      return state.messages;
    }

    // Try to load from storage
    try {
      const messages = await StorageService.getConversation(threadId);
      if (messages && messages.length > 0) {
        const newState: ConversationState = {
          messages,
          threadId,
          lastUpdated: new Date()
        };
        this.conversationStates.set(threadId, newState);
        return messages;
      }
    } catch (error) {
      console.error(`Failed to load conversation history for ${threadId}:`, error);
    }

    return [];
  }

  async clearConversation(threadId: string = 'default'): Promise<void> {
    try {
      this.conversationStates.delete(threadId);
      await StorageService.deleteConversation(threadId);
    } catch (error) {
      console.error(`Failed to clear conversation ${threadId}:`, error);
    }
  }

  private async saveConversationHistory(threadId: string, state: ConversationState): Promise<void> {
    try {
      await StorageService.saveConversation(threadId, state.messages);
    } catch (error) {
      console.error(`Failed to save conversation history for ${threadId}:`, error);
    }
  }
}
