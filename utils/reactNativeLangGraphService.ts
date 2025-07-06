/**
 * React Native Compatible LangGraph-Style AI Service
 * 
 * This service implements LangGraph concepts (StateGraph, tool calling, conversation management)
 * but uses React Native compatible libraries and patterns.
 */

import { z } from 'zod';
import { AIProvider, Task, DiaryEntry, Goal } from '@/types';
import { StorageService } from '@/utils/storage';
import { AIService } from '@/utils/aiService';

// Define message types
interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  name?: string; // For tool messages
}

interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any;
}

// Define tool schema
interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodSchema;
  execute: (args: any) => Promise<string>;
}

// Define conversation state
interface ConversationState {
  messages: BaseMessage[];
  threadId: string;
  lastUpdated: Date;
}

// Tool definitions with Zod schemas
const createTaskTool: ToolDefinition = {
  name: 'createTask',
  description: 'Create a new task with title, description, priority, and quadrant',
  schema: z.object({
    title: z.string().describe('The title of the task'),
    description: z.string().optional().describe('Optional description of the task'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority level of the task'),
    quadrant: z.enum(['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important']).optional().describe('Eisenhower matrix quadrant'),
  }),
  execute: async ({ title, description, priority, quadrant }) => {
    try {
      const tasks = await StorageService.getTasks();
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title,
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
  }
};

const createDiaryEntryTool: ToolDefinition = {
  name: 'createDiaryEntry',
  description: 'Create a new diary entry with title, content, mood, and tags',
  schema: z.object({
    title: z.string().describe('The title of the diary entry'),
    content: z.string().describe('The content of the diary entry'),
    mood: z.enum(['happy', 'neutral', 'sad', 'excited', 'stressed']).optional().describe('Mood for the entry'),
    tags: z.array(z.string()).optional().describe('Tags for the entry'),
  }),
  execute: async ({ title, content, mood, tags }) => {
    try {
      const entries = await StorageService.getDiaryEntries();
      const newEntry: DiaryEntry = {
        id: `diary-${Date.now()}`,
        date: new Date().toISOString(),
        title,
        content,
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
  }
};

const createGoalTool: ToolDefinition = {
  name: 'createGoal',
  description: 'Create a new goal with title, description, category, type, and priority',
  schema: z.object({
    title: z.string().describe('The title of the goal'),
    description: z.string().optional().describe('Optional description of the goal'),
    category: z.enum(['personal', 'career', 'health', 'finance', 'learning', 'relationship']).optional().describe('Category of the goal'),
    type: z.enum(['yearly', 'monthly', 'weekly']).optional().describe('Type/duration of the goal'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority level of the goal'),
  }),
  execute: async ({ title, description, category, type, priority }) => {
    try {
      const goals = await StorageService.getGoals();
      const newGoal: Goal = {
        id: `goal-${Date.now()}`,
        title,
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
  }
};

const getAppStatusTool: ToolDefinition = {
  name: 'getAppStatus',
  description: 'Get current app status including task completion rates, active goals, diary entries, and habits',
  schema: z.object({}),
  execute: async () => {
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
  }
};

const analyzeProductivityTool: ToolDefinition = {
  name: 'analyzeProductivity',
  description: 'Analyze productivity data for a specific period (day/week/month)',
  schema: z.object({
    period: z.enum(['day', 'week', 'month']).optional().describe('Time period to analyze (default: week)'),
  }),
  execute: async ({ period = 'week' }) => {
    try {
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
  }
};

// All available tools
const tools: ToolDefinition[] = [
  createTaskTool,
  createDiaryEntryTool,
  createGoalTool,
  getAppStatusTool,
  analyzeProductivityTool,
];

export class ReactNativeLangGraphService {
  private aiService: AIService;
  private provider: AIProvider;
  private conversationStates: Map<string, ConversationState> = new Map();

  constructor(provider: AIProvider) {
    this.provider = provider;
    this.aiService = new AIService(provider);
  }

  private getSystemPrompt(): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const toolDescriptions = tools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    return `You are a helpful AI assistant for a productivity app called "Hearthlight".
The current date is ${currentDate}.

You can help users with:
- Creating and managing tasks
- Writing diary entries
- Creating and tracking goals
- Analyzing productivity data
- Getting app status and insights

Available tools:
${toolDescriptions}

When users ask for information about their productivity, use getAppStatus or analyzeProductivity.
When they want to create something, use the appropriate creation tool.

IMPORTANT: When you want to use a tool, respond with a JSON object in this exact format:
{
  "tool_call": {
    "name": "toolName",
    "args": { "param1": "value1", "param2": "value2" }
  },
  "message": "Your explanation of what you're doing"
}

If you don't need to use a tool, just respond normally with helpful text.
Always be helpful, encouraging, and provide actionable insights.`;
  }

  // LangGraph-style tool calling detection and execution
  private async detectAndExecuteTools(aiResponse: string, userMessage: string): Promise<{ response: string; toolCalls: ToolCall[] }> {
    const toolCalls: ToolCall[] = [];
    let modifiedResponse = aiResponse;

    try {
      // Try to parse JSON tool call from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*"tool_call"[\s\S]*\}/);
      if (jsonMatch) {
        const toolCallData = JSON.parse(jsonMatch[0]);
        if (toolCallData.tool_call) {
          const { name, args } = toolCallData.tool_call;
          const tool = tools.find(t => t.name === name);
          
          if (tool) {
            try {
              // Validate arguments with Zod schema
              const validatedArgs = tool.schema.parse(args);
              
              // Execute tool
              const result = await tool.execute(validatedArgs);
              
              const toolCall: ToolCall = {
                id: `tool-${Date.now()}`,
                name,
                args: validatedArgs,
                result
              };
              
              toolCalls.push(toolCall);
              
              // Replace JSON with tool execution result
              modifiedResponse = toolCallData.message + `\n\n✅ ${result}`;
            } catch (error) {
              console.error(`Tool execution failed for ${name}:`, error);
              modifiedResponse = toolCallData.message + `\n\n❌ Failed to execute ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
        }
      }
    } catch (error) {
      // If JSON parsing fails, fall back to pattern matching
      console.log('JSON parsing failed, using pattern matching fallback');
      
      const toolPatterns = [
        {
          pattern: /(?:create|add|make)\s+(?:a\s+)?task/i,
          tool: 'createTask',
          extract: (msg: string) => {
            const titleMatch = msg.match(/(?:task|todo)(?:\s+(?:called|named|titled))?\s*[":]\s*([^.!?]+)/i);
            const title = titleMatch ? titleMatch[1].trim() : msg.split(' ').slice(0, 5).join(' ');
            return { title, description: msg, priority: 'medium', quadrant: 'not-urgent-important' };
          }
        },
        {
          pattern: /(?:write|create|add)\s+(?:a\s+)?diary\s+entry/i,
          tool: 'createDiaryEntry',
          extract: (msg: string) => {
            const titleMatch = msg.match(/(?:entry|diary)(?:\s+(?:about|titled))?\s*[":]\s*([^.!?]+)/i);
            const title = titleMatch ? titleMatch[1].trim() : 'Daily Reflection';
            return { title, content: msg, mood: 'neutral', tags: [] };
          }
        },
        {
          pattern: /(?:create|set|add)\s+(?:a\s+)?goal/i,
          tool: 'createGoal',
          extract: (msg: string) => {
            const titleMatch = msg.match(/(?:goal|target)(?:\s+(?:to|of))?\s*[":]\s*([^.!?]+)/i);
            const title = titleMatch ? titleMatch[1].trim() : msg.split(' ').slice(0, 5).join(' ');
            return { title, description: msg, category: 'personal', type: 'monthly', priority: 'medium' };
          }
        },
        {
          pattern: /(?:show|get|check)\s+(?:my\s+)?(?:app\s+)?status/i,
          tool: 'getAppStatus',
          extract: () => ({})
        },
        {
          pattern: /(?:analyze|check)\s+(?:my\s+)?productivity/i,
          tool: 'analyzeProductivity',
          extract: (msg: string) => {
            const periodMatch = msg.match(/(?:this\s+|last\s+)?(day|week|month)/i);
            return { period: periodMatch ? periodMatch[1].toLowerCase() : 'week' };
          }
        }
      ];

      // Check if user message matches any tool patterns
      for (const { pattern, tool, extract } of toolPatterns) {
        if (pattern.test(userMessage)) {
          try {
            const args = extract(userMessage);
            const toolDef = tools.find(t => t.name === tool);
            
            if (toolDef) {
              const result = await toolDef.execute(args);
              
              const toolCall: ToolCall = {
                id: `tool-${Date.now()}`,
                name: tool,
                args,
                result
              };
              
              toolCalls.push(toolCall);
              modifiedResponse += `\n\n✅ I've executed the ${tool} tool successfully: ${result}`;
            }
          } catch (error) {
            console.error(`Tool execution failed for ${tool}:`, error);
            modifiedResponse += `\n\n❌ Failed to execute ${tool}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
          break; // Only execute one tool per message
        }
      }
    }

    return { response: modifiedResponse, toolCalls };
  }

  async sendMessage(message: string, threadId: string = 'default'): Promise<BaseMessage[]> {
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
    const userMessage: BaseMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    state.messages.push(userMessage);

    try {
      // Get AI response using existing AIService
      const conversationContext = state.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const aiResponse = await this.aiService.generateResponse(message, conversationContext);

      // Detect and execute tools (LangGraph-style)
      const { response: finalResponse, toolCalls } = await this.detectAndExecuteTools(aiResponse, message);

      // Add AI response
      const aiMessage: BaseMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: finalResponse,
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

  async getConversationHistory(threadId: string = 'default'): Promise<BaseMessage[]> {
    const state = this.conversationStates.get(threadId);
    if (state) {
      return state.messages;
    }

    // Try to load from storage
    try {
      const history = await StorageService.getConversationHistory();
      if (history && history.length > 0) {
        const messages = history.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        const newState: ConversationState = {
          messages,
          threadId,
          lastUpdated: new Date()
        };
        
        this.conversationStates.set(threadId, newState);
        return messages;
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }

    return [];
  }

  async clearConversation(threadId: string = 'default'): Promise<void> {
    try {
      this.conversationStates.delete(threadId);
      await StorageService.saveConversationHistory([]);
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  }

  private async saveConversationHistory(threadId: string, state: ConversationState): Promise<void> {
    try {
      await StorageService.saveConversationHistory(state.messages);
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }
}
