# LangGraph AI Assistant Demo

## Overview

This document demonstrates how the new LangGraph implementation works in the Hearthlight AI Assistant.

## Architecture Diagram

```
User Input
    ↓
[HumanMessage]
    ↓
[AI Agent Node] ← → [Memory State]
    ↓
[Conditional Edge]
    ↓
[Tool Node] (if tools needed)
    ↓
[Back to AI Agent]
    ↓
[Final Response]
    ↓
[State Persistence]
```

## Key Components

### 1. State Management

```typescript
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});
```

### 2. Tool Definitions

```typescript
const createTaskTool = tool(
  async ({ title, description, priority, quadrant }) => {
    // Tool implementation
    return `Successfully created task: "${title}"`;
  },
  {
    name: 'createTask',
    description: 'Create a new task',
    schema: z.object({
      title: z.string().describe('The title of the task'),
      // ... other parameters
    }),
  }
);
```

### 3. Graph Construction

```typescript
const workflow = new StateGraph(AgentState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");
```

## Conversation Flow Examples

### Example 1: Simple Question

```
User: "Hello, how are you?"
↓
[AI Agent] → "Hello! I'm doing well, thank you for asking. How can I help you today?"
↓
[No tools needed] → [End conversation]
```

### Example 2: Tool Calling

```
User: "Create a task to buy groceries"
↓
[AI Agent] → Analyzes request, decides to use createTask tool
↓
[Tool Node] → Executes createTask with parameters
↓
[AI Agent] → "I've created a task for you to buy groceries!"
↓
[End conversation]
```

### Example 3: Multiple Tools

```
User: "Show me my status and create a goal to exercise"
↓
[AI Agent] → Decides to use getAppStatus tool
↓
[Tool Node] → Executes getAppStatus
↓
[AI Agent] → Processes results, decides to use createGoal tool
↓
[Tool Node] → Executes createGoal
↓
[AI Agent] → "Here's your status... I've also created an exercise goal!"
↓
[End conversation]
```

## Benefits of LangGraph Implementation

### 1. Automatic Tool Detection
- AI automatically decides when to use tools
- No manual pattern matching required
- Context-aware tool selection

### 2. State Persistence
- Conversation history maintained across sessions
- Thread-based conversations
- Memory-efficient state management

### 3. Error Recovery
- Isolated tool failures
- Conversation continues even if tools fail
- Graceful error handling

### 4. Scalability
- Easy to add new tools
- Parallel tool execution
- Modular architecture

## Tool Integration Process

### Step 1: Define Tool Schema

```typescript
const newTool = tool(
  async (params) => {
    // Implementation
  },
  {
    name: 'toolName',
    description: 'What the tool does',
    schema: z.object({
      // Parameter definitions
    }),
  }
);
```

### Step 2: Add to Tools Array

```typescript
const tools = [
  createTaskTool,
  createDiaryEntryTool,
  createGoalTool,
  getAppStatusTool,
  analyzeProductivityTool,
  newTool, // Add here
];
```

### Step 3: Tool Automatically Available

The LangGraph system automatically:
- Binds tools to the AI model
- Handles tool calling decisions
- Executes tools when needed
- Processes tool results

## Debugging and Monitoring

### Enable Debug Mode

```typescript
const workflow = new StateGraph(AgentState)
  // ... graph definition
  .compile({
    checkpointer: memory,
    debug: true, // Enable debug logging
  });
```

### Monitor Tool Execution

```typescript
// In tool implementation
const createTaskTool = tool(
  async (params) => {
    console.log('Creating task with params:', params);
    const result = await createTask(params);
    console.log('Task created:', result);
    return result;
  },
  // ... tool config
);
```

### Track Conversation State

```typescript
// Get current state
const state = await graph.getState(config);
console.log('Current messages:', state.values.messages);
```

## Performance Considerations

### Memory Management
- Conversation history is automatically managed
- Old messages can be summarized or removed
- State is persisted efficiently

### Tool Execution
- Tools run asynchronously
- Multiple tools can execute in parallel
- Failed tools don't block conversation

### Error Handling
- Network errors are retried automatically
- Tool failures are isolated
- Conversation state is preserved

## Migration from Previous Implementation

### Before (Manual Tool Detection)
```typescript
// Manual pattern matching
if (message.includes('create task')) {
  await executeCreateTask(extractParams(message));
}
```

### After (LangGraph Automatic)
```typescript
// AI automatically decides and executes tools
const result = await langGraphService.sendMessage(message);
// Tools are called automatically based on context
```

## Next Steps

1. **Add More Tools**: Extend functionality with additional productivity tools
2. **Custom Workflows**: Create specialized conversation flows
3. **Multi-Agent Support**: Add specialized agents for different domains
4. **Advanced Memory**: Implement conversation summarization
5. **Tool Chaining**: Enable complex multi-step workflows

---

*This LangGraph implementation provides a robust, scalable foundation for the AI assistant with automatic tool calling and intelligent conversation management.*
