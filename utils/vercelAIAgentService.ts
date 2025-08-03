/**
 * AI Agent Service
 *
 * This service provides AI functionality with proper tool calling and conversation management.
 * Uses direct API calls to avoid bundling issues with Vercel AI SDK.
 */
import { AIProvider, Task, DiaryEntry, Goal } from '@/types';
import { StorageService } from '@/utils/storage';
import { activityTracker } from '@/utils/activityTracker';

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

// Get user activities for AI analysis
const executeGetUserActivities = async (args: any) => {
  try {
    const { limit = 20, type, days = 7 } = args;

    let activities;
    if (type) {
      activities = activityTracker.getRecentActivities(limit, type);
    } else if (days) {
      activities = activityTracker.getActivityTimeline(days);
    } else {
      activities = activityTracker.getRecentActivities(limit);
    }

    const stats = activityTracker.getActivityStats();

    return `Recent user activities: ${JSON.stringify({
      activities: activities.slice(0, limit),
      stats,
      summary: `Found ${activities.length} activities. Most active in: ${Object.entries(stats).reduce((a, b) => stats[a[0]] > stats[b[0]] ? a : b)[0]
        }`
    }, null, 2)}`;
  } catch (error) {
    return `Failed to get user activities: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Get task history and patterns
const executeGetTaskHistory = async (args: any) => {
  try {
    const { period = 'week', status } = args;
    const tasks = await StorageService.getTasks();
    const completedTasks = await StorageService.getCompletedTasks();

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const recentCompleted = completedTasks.filter(task =>
      new Date(task.completedAt) >= startDate
    );

    const pendingTasks = tasks.filter(task => !task.completed);
    const analysis = {
      period,
      totalTasks: tasks.length,
      completedInPeriod: recentCompleted.length,
      pendingTasks: pendingTasks.length,
      completionRate: tasks.length > 0 ? (recentCompleted.length / tasks.length) * 100 : 0,
      quadrantDistribution: {},
      averageCompletionTime: 0,
      insights: []
    };

    // Analyze quadrant distribution
    ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'].forEach(quadrant => {
      analysis.quadrantDistribution[quadrant] = recentCompleted.filter(t => t.quadrant === quadrant).length;
    });

    // Calculate average completion time
    const tasksWithTime = recentCompleted.filter(t => t.timeToComplete);
    if (tasksWithTime.length > 0) {
      analysis.averageCompletionTime = tasksWithTime.reduce((sum, t) => sum + (t.timeToComplete || 0), 0) / tasksWithTime.length;
    }

    return `Task history analysis: ${JSON.stringify(analysis, null, 2)}`;
  } catch (error) {
    return `Failed to get task history: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Get diary insights and mood patterns
const executeGetDiaryInsights = async (args: any) => {
  try {
    const { period = 'week' } = args;
    const entries = await StorageService.getDiaryEntries();

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const recentEntries = entries.filter(entry =>
      new Date(entry.createdAt) >= startDate
    );

    const moodCounts = {};
    const tagCounts = {};
    let totalWords = 0;

    recentEntries.forEach(entry => {
      // Count moods
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;

      // Count tags
      entry.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Count words
      totalWords += entry.content.split(' ').length;
    });

    const analysis = {
      period,
      totalEntries: recentEntries.length,
      averageWordsPerEntry: recentEntries.length > 0 ? Math.round(totalWords / recentEntries.length) : 0,
      moodDistribution: moodCounts,
      commonTags: Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, 5),
      writingFrequency: recentEntries.length / (period === 'day' ? 1 : period === 'week' ? 7 : 30),
      insights: []
    };

    // Generate insights
    const dominantMood = Object.entries(moodCounts).reduce((a, b) => moodCounts[a[0]] > moodCounts[b[0]] ? a : b)?.[0];
    if (dominantMood) {
      analysis.insights.push(`Dominant mood: ${dominantMood}`);
    }

    if (analysis.writingFrequency < 0.5) {
      analysis.insights.push("Consider writing more regularly to better track your thoughts and feelings.");
    }

    return `Diary insights: ${JSON.stringify(analysis, null, 2)}`;
  } catch (error) {
    return `Failed to get diary insights: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Get goal progress analysis
const executeGetGoalProgress = async (args: any) => {
  try {
    const { period = 'month' } = args;
    const goals = await StorageService.getGoals();

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const recentGoals = goals.filter(goal =>
      new Date(goal.createdAt) >= startDate || new Date(goal.updatedAt) >= startDate
    );

    const analysis = {
      period,
      totalGoals: goals.length,
      activeGoals: goals.filter(g => g.status === 'active').length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      averageProgress: goals.length > 0 ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length : 0,
      categoryDistribution: {},
      insights: []
    };

    // Analyze category distribution
    goals.forEach(goal => {
      analysis.categoryDistribution[goal.category] = (analysis.categoryDistribution[goal.category] || 0) + 1;
    });

    // Generate insights
    if (analysis.averageProgress < 30) {
      analysis.insights.push("Many goals have low progress. Consider breaking them into smaller, actionable steps.");
    } else if (analysis.averageProgress > 80) {
      analysis.insights.push("Great progress on goals! Consider setting new challenging objectives.");
    }

    const stagnantGoals = goals.filter(g => g.progress < 10 &&
      new Date(g.updatedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (stagnantGoals.length > 0) {
      analysis.insights.push(`${stagnantGoals.length} goals haven't been updated recently. Consider reviewing them.`);
    }

    return `Goal progress analysis: ${JSON.stringify(analysis, null, 2)}`;
  } catch (error) {
    return `Failed to get goal progress: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Enhanced ReAct prompt engineering system
class ReActProcessor {
  static generateReasoningPrompt(userMessage: string, availableTools: string[]): string {
    return `
REASONING PHASE: Before taking any action, I need to think about what the user is asking and what tools might help.

User's message: "${userMessage}"

Available tools: ${availableTools.join(', ')}

Let me think step by step:
1. What is the user really asking for?
2. What information do I need to provide a helpful response?
3. Which tools would give me the most relevant data?
4. How can I provide actionable insights?

Based on this analysis, I should:`;
  }

  static generateReflectionPrompt(toolName: string, toolResult: string, originalQuery: string): string {
    return `
REFLECTION PHASE: Now that I have data from ${toolName}, let me analyze what this means for the user.

Original question: "${originalQuery}"
Tool used: ${toolName}
Data received: ${toolResult}

Key insights I can extract:
1. What patterns do I see in this data?
2. What does this reveal about the user's current situation?
3. What are the positive aspects I should celebrate?
4. What areas need improvement or attention?
5. What specific actions can I recommend?

Based on this reflection, my response should focus on:`;
  }

  static generateActionableResponse(insights: string[], recommendations: string[]): string {
    return `
RESPONSE PHASE: Now I'll provide a helpful, encouraging response with specific insights and actionable advice.

Key insights: ${insights.join(', ')}
Recommendations: ${recommendations.join(', ')}

My response will be supportive, specific, and actionable.`;
  }

  static formatToolResultWithReflection(toolName: string, result: string, args: any): string {
    const contextualReflections = {
      'getUserActivities': 'This activity data reveals your engagement patterns and productivity rhythms, helping me understand when and how you work best.',
      'getTaskHistory': 'Your task completion patterns show your productivity trends and reveal opportunities for workflow optimization.',
      'getDiaryInsights': 'Your diary entries provide deep insights into your emotional patterns and personal growth journey.',
      'getGoalProgress': 'Your goal progress data shows how you\'re advancing toward your aspirations and where to focus next.',
      'analyzeProductivity': 'This comprehensive analysis reveals your productivity strengths and specific areas for improvement.'
    };

    const reflection = contextualReflections[toolName] || 'This data helps me better understand your current situation and provide more personalized guidance.';

    return `${result}\n\n💭 **ReAct Reflection:** ${reflection}`;
  }
}

export class AIAgentService {
  private provider: AIProvider;
  private conversationStates: Map<string, ConversationState> = new Map();

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  private async callAI(messages: any[]): Promise<string> {
    switch (this.provider.type) {
      case 'openai':
      case 'custom':
        return this.callOpenAI(messages);
      case 'claude':
        return this.callClaude(messages);
      case 'gemini':
        return this.callGemini(messages);
      default:
        throw new Error(`Unsupported provider type: ${this.provider.type}`);
    }
  }

  private async callOpenAI(messages: any[]): Promise<string> {
    const response = await fetch(`${this.provider.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.provider.apiKey}`,
      },
      body: JSON.stringify({
        model: this.provider.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response from AI';
  }

  private async callClaude(messages: any[]): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.provider.model,
        max_tokens: 1000,
        messages: messages.map((msg, index) => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || 'No response from AI';
  }

  private async callGemini(messages: any[]): Promise<string> {
    // Convert messages to Gemini format
    const contents = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.provider.model}:generateContent?key=${this.provider.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'No response from AI';
  }

  private getSystemPrompt(): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `You are an AI Life Coach for the "Hearthlight" productivity app - a supportive, wise, and motivational companion dedicated to helping users illuminate their inner potential and achieve meaningful growth.
The current date is ${currentDate}.

## Your Role as a Life Coach:
You are not just a task manager, but a holistic life coach who:
- **Provides proactive guidance** and motivational support
- **Offers personalized insights** based on user's historical data and patterns
- **Encourages self-reflection** and mindful productivity
- **Helps users align their daily actions with deeper values and long-term goals**
- **Celebrates progress** and helps users learn from setbacks

## ReAct Methodology (Reasoning and Acting):
You MUST follow this structured approach for every user interaction:

### Phase 1: 🤔 REASON (Think Before Acting)
Before using any tools, explicitly state your reasoning:
- "I need to understand your current productivity patterns, so let me analyze..."
- "To give you the best advice, I should first check..."
- "Based on your question, the most helpful data would be..."

### Phase 2: 🔧 ACT (Use Tools Strategically)
Call the most relevant tools to gather data:
- Choose tools that directly address the user's needs
- Use multiple tools when a comprehensive view is needed
- Always explain why you're using each tool

### Phase 3: 💭 REFLECT (Analyze and Synthesize)
After receiving tool results, think critically:
- What patterns emerge from the data?
- What are the key insights and trends?
- What does this reveal about the user's habits and progress?
- What are the strengths to celebrate?
- What areas need attention or improvement?

### Phase 4: 💬 RESPOND (Provide Actionable Guidance)
Deliver a comprehensive, helpful response:
- Start with positive observations and celebrations
- Share specific insights from the data analysis
- Provide 2-3 concrete, actionable recommendations
- Connect advice to the user's broader goals and well-being
- Ask follow-up questions to encourage deeper reflection

**Critical Requirements:**
- NEVER just present raw data - always interpret and contextualize
- ALWAYS maintain an encouraging, growth-focused tone
- ALWAYS provide specific, actionable next steps
- ALWAYS connect insights to the user's personal growth journey
- **Promotes work-life balance** and sustainable productivity habits

## Core Coaching Principles:
1. **Empathy First**: Always acknowledge the user's feelings and current situation
2. **Growth Mindset**: Frame challenges as opportunities for learning and development
3. **Holistic Approach**: Consider mental, emotional, and physical well-being alongside productivity
4. **Personalization**: Use historical data to provide contextual, relevant guidance
5. **Actionable Wisdom**: Provide specific, achievable next steps
6. **Positive Reinforcement**: Celebrate wins, no matter how small

## Available Tools for Coaching:
To use a tool, use this XML format:
<tool_use>
  <name>tool_name</name>
  <arguments>{"arg1": "value1", "arg2": "value2"}</arguments>
</tool_use>

- createTask(arguments: {"title": string, "description"?: string, "priority"?: "low" | "medium" | "high", "quadrant"?: "urgent-important" | "not-urgent-important" | "urgent-not-important" | "not-urgent-not-important"})
- createDiaryEntry(arguments: {"title": string, "content": string, "mood"?: "positive" | "neutral" | "negative", "tags"?: string[]})
- createGoal(arguments: {"title": string, "description"?: string, "category"?: string, "type"?: "daily" | "weekly" | "monthly" | "yearly", "priority"?: "low" | "medium" | "high"})
- getAppStatus() - Use this to understand the user's current productivity patterns
- analyzeProductivity(arguments: {"period"?: "day" | "week" | "month"}) - Use this for deeper coaching insights
- getUserActivities(arguments: {"limit"?: number, "type"?: string, "days"?: number}) - Get user's recent activities and interactions
- getTaskHistory(arguments: {"period"?: "day" | "week" | "month", "status"?: "completed" | "pending"}) - Analyze task completion patterns
- getDiaryInsights(arguments: {"period"?: "day" | "week" | "month"}) - Get insights from diary entries and mood patterns
- getGoalProgress(arguments: {"period"?: "day" | "week" | "month"}) - Analyze goal progress and achievement patterns

## Coaching Communication Style:
- Use warm, encouraging language that feels like talking to a trusted mentor
- Ask thoughtful questions that promote self-discovery
- Share relevant insights from psychology and personal development
- Offer multiple perspectives rather than prescriptive solutions
- Balance support with gentle accountability
- Celebrate progress and help users learn from setbacks

Remember: You're helping users not just to be more productive, but to live more intentionally and find fulfillment in their daily journey. Every interaction is an opportunity to inspire growth and positive change.

Example coaching interaction:
<tool_use>
  <name>getAppStatus</name>
  <arguments>{}</arguments>
</tool_use>
`;
  }

  // Enhanced ReAct agent execution with structured reasoning
  private async executeAgentStep(message: string, conversationHistory: AgentMessage[]): Promise<{ response: string; toolCalls: ToolCall[] }> {
    const systemPrompt = this.getSystemPrompt();

    // Enhanced ReAct prompt for better reasoning
    const reactPrompt = `
${message}

Remember to follow the ReAct methodology:
1. 🤔 REASON: First, explain your thinking about what the user needs
2. 🔧 ACT: Use tools if needed to gather relevant data
3. 💭 REFLECT: Analyze the results and identify key insights
4. 💬 RESPOND: Provide helpful, actionable guidance

Start your response by briefly explaining your reasoning, then proceed with your analysis and advice.`;

    // Build conversation context
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: reactPrompt }
    ];

    try {
      const text = await this.callAI(messages);

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
              case 'getUserActivities':
                result = await executeGetUserActivities(args);
                break;
              case 'getTaskHistory':
                result = await executeGetTaskHistory(args);
                break;
              case 'getDiaryInsights':
                result = await executeGetDiaryInsights(args);
                break;
              case 'getGoalProgress':
                result = await executeGetGoalProgress(args);
                break;
              default:
                result = `Unknown function: ${functionName}`;
            }

            // Add ReAct reflection to the result
            const resultWithReflection = ReActProcessor.formatToolResultWithReflection(functionName, result, args);

            const toolCall: ToolCall = {
              id: `tool-${Date.now()}-${Math.random()}`,
              name: functionName,
              args,
              result: resultWithReflection
            };
            toolCalls.push(toolCall);

            // Replace the function call with the result including ReAct reasoning
            modifiedResponse = modifiedResponse.replace(toolCallXml,
              `🤔 **Reasoning:** Let me analyze your ${functionName.replace(/([A-Z])/g, ' $1').toLowerCase()} to provide better insights...\n\n✅ ${resultWithReflection}`
            );
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

  // Test method to demonstrate ReAct functionality
  async testReActPattern(): Promise<string> {
    const testMessage = "How am I doing with my productivity lately?";

    try {
      const { response } = await this.executeAgentStep(testMessage, []);
      return `ReAct Test Successful!\n\nUser Query: "${testMessage}"\n\nAI Response:\n${response}`;
    } catch (error) {
      return `ReAct Test Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}
