# AI Assistant Implementation with LangGraph

## Overview

The AI Assistant in Hearthlight is a fully functional, frontend-only implementation powered by **LangGraph** that provides intelligent assistance for productivity tasks. It features advanced conversation management, automatic tool calling, and state persistence without requiring a backend API.

## 🚀 New LangGraph Implementation

This implementation uses **LangGraph** for:
- **Intelligent Tool Calling**: Automatic detection and execution of productivity tools
- **Conversation State Management**: Persistent conversation history with memory
- **Advanced Flow Control**: Sophisticated conversation flows with conditional logic
- **Error Recovery**: Robust error handling and retry mechanisms

## Features Implemented

### ✅ Core Functionality

- **LangGraph-Powered AI**: Advanced conversation management with state graphs
- **Automatic Tool Calling**: AI automatically detects when to use tools based on context
- **Persistent Conversations**: Thread-based conversation history with MemorySaver
- **Multi-Provider Support**: OpenAI, Claude, and custom providers
- **Error Recovery**: Intelligent error handling and retry mechanisms
- **Real-time Feedback**: Live updates during tool execution and AI processing

### ✅ Available Tools

1. **createTask** - Create new tasks
   - Trigger phrases: "create a task", "add a task", "make a task"
   - Parameters: title, description, priority, quadrant
   - Example: "Create a task to buy groceries"

2. **createDiaryEntry** - Create diary entries
   - Trigger phrases: "write diary entry", "create diary entry", "add diary entry"
   - Parameters: title, content, mood, tags
   - Example: "Write a diary entry about my productive day"

3. **createGoal** - Create new goals
   - Trigger phrases: "create a goal", "set a goal", "add a goal"
   - Parameters: title, description, category, type, priority
   - Example: "Create a goal to exercise daily"

4. **getAppStatus** - Get current app statistics
   - Trigger phrases: "show my status", "get app status", "check status"
   - Returns: task completion rates, active goals, diary entries, habits
   - Example: "Show my app status"

5. **analyzeProductivity** - Analyze productivity data
   - Trigger phrases: "analyze productivity", "check my productivity"
   - Parameters: period (day/week/month)
   - Example: "Analyze my productivity this week"

## Technical Implementation

### LangGraph Architecture

- **State Graph Management**: Uses LangGraph's StateGraph for conversation flow control
- **Tool Node Integration**: Automatic tool execution through ToolNode
- **Memory Persistence**: MemorySaver for conversation state across sessions
- **Conditional Edges**: Smart routing between AI responses and tool execution
- **No Backend Dependency**: Runs entirely in the frontend with LangChain providers

### Key Components

#### LangGraph Flow

1. **User Input** → HumanMessage added to state
2. **AI Agent Node** → Model processes conversation and decides on tool calls
3. **Conditional Edge** → Routes to tools if needed, or ends conversation
4. **Tool Node** → Executes tools in parallel and returns results
5. **Back to Agent** → AI processes tool results and generates final response
6. **State Persistence** → Conversation saved to memory

#### Tool Integration

- **Declarative Tools**: Tools defined with Zod schemas for validation
- **Automatic Execution**: LangGraph handles tool calling based on AI decisions
- **Parallel Processing**: Multiple tools can be executed simultaneously
- **Error Isolation**: Tool failures don't crash the conversation

#### Error Handling

- **Network Resilience**: Automatic retry with exponential backoff
- **Provider Fallback**: Graceful handling of API failures
- **Tool Error Recovery**: Isolated tool failures with user feedback
- **State Recovery**: Conversation state preserved even after errors

## Configuration

### AI Provider Setup
1. Navigate to AI Assistant settings
2. Add your preferred AI provider:
   - **OpenAI**: Requires API key
   - **Claude**: Requires Anthropic API key
   - **Gemini**: Requires Google API key
   - **Custom**: Requires base URL and API key
3. Select active provider
4. Start chatting!

### Supported Providers
- OpenAI (GPT-3.5, GPT-4, etc.)
- Anthropic Claude
- Google Gemini
- Custom OpenAI-compatible APIs

## Usage Examples

### LangGraph Automatic Tool Calling

#### Creating Tasks

```
User: "I need to prepare for the meeting tomorrow"
AI: "I'll help you create a task for that."
🔧 Tool: createTask
Args: {"title": "prepare for the meeting tomorrow", "description": "Meeting preparation task", "priority": "medium"}
AI: "I've successfully created a task for you to prepare for the meeting tomorrow. The task has been added to your task list with medium priority."
```

#### Checking Status

```
User: "How am I doing with my productivity?"
AI: "Let me check your current status."
🔧 Tool: getAppStatus
AI: "Here's your current productivity status:
- Tasks: 15 total, 8 completed (53% completion rate)
- Goals: 3 active goals out of 5 total
- Diary: 4 entries this week
You're making good progress! Consider focusing on completing a few more tasks to boost your completion rate."
```

#### Productivity Analysis

```
User: "Can you analyze how I've been doing this week?"
AI: "I'll analyze your productivity data for this week."
🔧 Tool: analyzeProductivity
Args: {"period": "week"}
AI: "Based on your week's data:
- 12 tasks created, 8 completed (67% completion rate)
- 2 high-priority tasks completed
- Insight: Good productivity! Consider focusing on high-priority tasks.
You're doing well this week! Keep up the momentum."
```

## Development Notes

### File Structure

- `app/(tabs)/ai-assistant.tsx` - Main AI assistant React component
- `utils/langGraphAIService.ts` - **NEW** LangGraph service implementation
- `utils/aiService.ts` - Legacy AI provider integration (deprecated)
- `lib/stores/modelStore.ts` - AI provider state management
- `utils/storage.ts` - Local storage utilities

### LangGraph Dependencies

```json
{
  "@langchain/langgraph": "^0.2.19",
  "@langchain/core": "^0.3.29",
  "@langchain/anthropic": "^0.3.7",
  "@langchain/openai": "^0.3.14"
}
```

### Testing

- LangGraph service tests: `npm test __tests__/langGraphAIService.test.ts`
- Tool integration tests
- Conversation state management tests
- Error handling verification

### Key LangGraph Concepts

- **StateGraph**: Manages conversation flow and state transitions
- **ToolNode**: Handles automatic tool execution
- **MemorySaver**: Persists conversation state across sessions
- **Conditional Edges**: Routes between AI and tool nodes based on context

### Future Enhancements

- **Advanced Tool Chaining**: Multi-step tool workflows
- **Custom Tool Creation**: User-defined tools
- **Voice Integration**: Speech-to-text and text-to-speech
- **Image Analysis**: Visual content understanding
- **Multi-Agent Conversations**: Specialized AI agents for different tasks

## Troubleshooting

### Common Issues
1. **AI not responding**: Check API key configuration
2. **Tools not executing**: Verify storage permissions
3. **Conversation not saving**: Check AsyncStorage availability
4. **Network errors**: Verify internet connection and API endpoints

### Debug Mode
Enable debug logging by setting `console.log` statements in:
- Tool execution functions
- AI service calls
- Error handlers

## Performance Considerations
- Conversation history is limited to prevent memory issues
- Tool execution is asynchronous and non-blocking
- Error states are cleared automatically on successful operations
- Retry mechanisms prevent infinite loops

---

*This implementation provides a complete, production-ready AI assistant that enhances the Hearthlight productivity experience.*
