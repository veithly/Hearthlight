/**
 * LangGraph AI Service
 *
 * This service uses LangGraph to manage AI conversations and tool calling
 * with proper state management and conversation flow control.
 */

// Import polyfills first to ensure compatibility
import './polyfills';

import { StateGraph, Annotation, START, END, MemorySaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { tool } from '@langchain/core/tools';
import { BaseMessage, AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { AIProvider, Task, DiaryEntry, Goal } from '@/types';
import { StorageService } from '@/utils/storage';

// Define the state annotation for our graph
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

// Define tools using LangChain's tool decorator
const createTaskTool = tool(
  async ({ title, description, priority, quadrant }) => {
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
  },
  {
    name: 'createTask',
    description: 'Create a new task with title, description, priority, and quadrant',
    schema: z.object({
      title: z.string().describe('The title of the task'),
      description: z.string().optional().describe('Optional description of the task'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority level of the task'),
      quadrant: z.enum(['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important']).optional().describe('Eisenhower matrix quadrant'),
    }),
  }
);

const createDiaryEntryTool = tool(
  async ({ title, content, mood, tags }) => {
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
  },
  {
    name: 'createDiaryEntry',
    description: 'Create a new diary entry with title, content, mood, and tags',
    schema: z.object({
      title: z.string().describe('The title of the diary entry'),
      content: z.string().describe('The content of the diary entry'),
      mood: z.enum(['happy', 'neutral', 'sad', 'excited', 'stressed']).optional().describe('Mood for the entry'),
      tags: z.array(z.string()).optional().describe('Tags for the entry'),
    }),
  }
);

const createGoalTool = tool(
  async ({ title, description, category, type, priority }) => {
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
  },
  {
    name: 'createGoal',
    description: 'Create a new goal with title, description, category, type, and priority',
    schema: z.object({
      title: z.string().describe('The title of the goal'),
      description: z.string().optional().describe('Optional description of the goal'),
      category: z.enum(['personal', 'career', 'health', 'finance', 'learning', 'relationship']).optional().describe('Category of the goal'),
      type: z.enum(['yearly', 'monthly', 'weekly']).optional().describe('Type/duration of the goal'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority level of the goal'),
    }),
  }
);

const getAppStatusTool = tool(
  async () => {
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
  },
  {
    name: 'getAppStatus',
    description: 'Get current app status including task completion rates, active goals, diary entries, and habits',
    schema: z.object({}),
  }
);

const analyzeProductivityTool = tool(
  async ({ period }) => {
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
        period: period || 'week',
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

      return `Productivity analysis for ${period || 'week'}: ${JSON.stringify(analysis, null, 2)}`;
    } catch (error) {
      return `Failed to analyze productivity: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
  {
    name: 'analyzeProductivity',
    description: 'Analyze productivity data for a specific period (day/week/month)',
    schema: z.object({
      period: z.enum(['day', 'week', 'month']).optional().describe('Time period to analyze (default: week)'),
    }),
  }
);

// All available tools
const tools = [
  createTaskTool,
  createDiaryEntryTool,
  createGoalTool,
  getAppStatusTool,
  analyzeProductivityTool,
];

export class LangGraphAIService {
  private graph: any;
  private memory: MemorySaver;
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
    this.memory = new MemorySaver();
    this.graph = this.createGraph();
  }

  private createModel() {
    switch (this.provider.type) {
      case 'openai':
      case 'custom':
        return new ChatOpenAI({
          apiKey: this.provider.apiKey,
          baseURL: this.provider.baseUrl,
          model: this.provider.model,
          temperature: 0.7,
        });
      case 'claude':
        return new ChatAnthropic({
          apiKey: this.provider.apiKey,
          model: this.provider.model,
          temperature: 0.7,
        });
      default:
        throw new Error(`Unsupported provider type: ${this.provider.type}`);
    }
  }

  private createGraph() {
    const model = this.createModel();
    const boundModel = model.bindTools(tools);
    const toolNode = new ToolNode<typeof AgentState.State>(tools);

    // Define the function that determines whether to continue or end
    const shouldContinue = (state: typeof AgentState.State): "tools" | typeof END => {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && (lastMessage as AIMessage).tool_calls?.length) {
        return "tools";
      }
      return END;
    };

    // Define the function that calls the model
    const callModel = async (state: typeof AgentState.State) => {
      const systemPrompt = this.getSystemPrompt();
      const messages = [
        new HumanMessage({ content: systemPrompt }),
        ...state.messages
      ];
      const response = await boundModel.invoke(messages);
      return { messages: [response] };
    };

    // Create and compile the graph
    const workflow = new StateGraph(AgentState)
      .addNode("agent", callModel)
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", shouldContinue)
      .addEdge("tools", "agent");

    return workflow.compile({
      checkpointer: this.memory,
    });
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

Available tools:
- createTask: Create a new task with title, description, priority, and quadrant
- createDiaryEntry: Create a diary entry with title, content, mood, and tags
- createGoal: Create a goal with title, description, category, type, and priority
- getAppStatus: Get current app status including task completion rates, active goals, etc.
- analyzeProductivity: Analyze productivity data for a specific period (day/week/month)

When users ask for information about their productivity, use getAppStatus or analyzeProductivity.
When they want to create something, use the appropriate creation tool.
Always be helpful, encouraging, and provide actionable insights.`;
  }

  async sendMessage(message: string, threadId: string = 'default'): Promise<BaseMessage[]> {
    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    const input = {
      messages: [new HumanMessage({ content: message })],
    };

    const result = await this.graph.invoke(input, config);
    return result.messages;
  }

  async streamMessage(message: string, threadId: string = 'default') {
    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    const input = {
      messages: [new HumanMessage({ content: message })],
    };

    return this.graph.stream(input, config);
  }

  async getConversationHistory(threadId: string = 'default'): Promise<BaseMessage[]> {
    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    try {
      const state = await this.graph.getState(config);
      return state.values.messages || [];
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  async clearConversation(threadId: string = 'default'): Promise<void> {
    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    try {
      // Clear the conversation by updating the state with empty messages
      await this.graph.updateState(config, { messages: [] });
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  }
}
