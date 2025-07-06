# Hearthlight Features

This document provides an overview of the key features in the Hearthlight application, with a focus on the new Data Synchronization and AI-powered functionalities.

## Data Synchronization via WebDAV

Hearthlight now supports data synchronization, allowing you to keep your productivity data (tasks, diary entries, goals, etc.) consistent across multiple devices. This is achieved using the WebDAV protocol, a widely supported standard for web-based file management.

### How It Works

- **WebDAV Server:** You can configure the app to connect to your own WebDAV server (e.g., Nextcloud, OwnCloud, or other compatible services). This ensures you have full control over your data.
- **Manual & Automatic Sync:** You can trigger a sync manually at any time, or enable automatic synchronization at regular intervals (hourly, daily, or weekly).
- **Conflict Resolution:** The sync service compares the timestamp of the local data with the latest backup on the server.
    - If the server's backup is more recent, the app will download the data, ensuring you have the latest version.
    - If local data has been modified since the last sync, the app will upload the changes to the server.
- **Sync History:** The app keeps a record of the last 50 synchronization events, allowing you to check the status and history of your data backups.

### For Developers

- The core logic is handled by the `WebDAVService` ([`utils/webdav.ts`](utils/webdav.ts:1)) and `SyncService` ([`utils/syncService.ts`](utils/syncService.ts:1)).
- `WebDAVService` manages the low-level communication with the WebDAV server, including authentication, file uploads/downloads, and directory listing.
- `SyncService` orchestrates the synchronization process, handling user settings, scheduling automatic syncs, and performing conflict resolution.

## AI-Powered Assistant & Features

Hearthlight now integrates a powerful AI assistant to enhance your productivity. You can connect to various AI providers (OpenAI, Gemini, Claude, or any custom compatible provider) to access a range of intelligent features.

### Core AI Features

1.  **AI Assistant Chat:**
    - A conversational AI assistant that can help you with a wide range of tasks, from creating diary entries and tasks to providing productivity advice.
    - The chat interface supports streaming responses for a real-time experience.

2.  **Task Suggestions:**
    - The AI can analyze your goals and existing tasks to suggest new, actionable tasks that will help you make progress.

3.  **Diary Analysis:**
    - Get thoughtful insights and suggestions for personal growth by letting the AI analyze your diary entries. The analysis focuses on providing positive and actionable feedback.

4.  **Diary Writing Prompts:**
    - If you're unsure what to write, the AI can generate creative and inspiring diary prompts based on your current mood and recent entry themes.

5.  **Goal Decomposition:**
    - Break down large, ambitious goals into smaller, more manageable sub-goals. The AI helps you create a clear, actionable plan to achieve your objectives.

### For Developers

- The `AIService` ([`utils/aiService.ts`](utils/aiService.ts:1)) is the central hub for all AI interactions.
- It provides a unified interface that abstracts the specific requirements of different AI providers.
- The service handles formatting requests, making API calls, and parsing responses for all AI-powered features.
- The front-end implementation for the AI Assistant can be found in [`app/(tabs)/ai-assistant.tsx`](app/(tabs)/ai-assistant.tsx:1).
- The API endpoint for the chat functionality is defined in [`app/api/chat/route.ts`](app/api/chat/route.ts:1).

# AI Assistant Features

## Core Features

### 🤖 Multi-Provider AI Support
- **OpenAI GPT Models**: GPT-3.5, GPT-4, GPT-4 Turbo
- **Google Gemini**: Gemini Pro, Gemini Pro Vision
- **Anthropic Claude**: Claude 3 (Opus, Sonnet, Haiku)
- **Custom Providers**: Support for OpenAI-compatible APIs

### 🛠️ Intelligent Tool Integration
- **Task Management**: Create, update, and organize tasks
- **Diary Entries**: Generate and manage journal entries
- **Goal Setting**: Create and track personal goals
- **Productivity Analytics**: Analyze your productivity patterns
- **App Status**: Get comprehensive app usage insights

### 💬 Enhanced Conversation Experience
- **Improved Message Flow**: Tool calls and results are now integrated directly into the conversation flow
- **Real-time Tool Execution**: See exactly when and how tools are being called
- **Transparent Process**: Clear visibility into AI decision-making and tool usage
- **Conversation Management**: Create, switch between, and manage multiple conversations
- **Persistent History**: All conversations are saved and can be resumed

### 🔧 Recent Improvements (Latest)

#### Message Flow Architecture Update
We've significantly improved how tool calls are handled in conversations:

**Before**: Tool calls were attached as metadata to assistant messages
```javascript
{
  role: 'assistant',
  content: 'I created a task for you',
  toolCalls: [{ name: 'createTask', args: {...} }] // Attached metadata
}
```

**After**: Tool calls and results are independent messages in the conversation flow
```javascript
[
  { role: 'user', content: 'Create a task to buy groceries' },
  { role: 'assistant', content: '🔧 Calling tool: createTask' },
  { role: 'tool', content: 'Successfully created task: "Buy groceries"' },
  { role: 'assistant', content: 'I\'ve created the task for you!' }
]
```

**Benefits**:
- **Clearer conversation flow**: Each step is visible as a separate message
- **Better debugging**: Easy to see exactly what tools were called and their results
- **Improved UI display**: Tool calls and results have their own visual styling
- **Standard compliance**: Follows chat message format conventions
- **Enhanced transparency**: Users can see the AI's thinking process

#### Google Gemini Integration Fix
- **Fixed API compatibility**: Resolved JSON schema validation errors
- **Proper provider support**: Uses correct Google AI SDK instead of forcing through OpenAI
- **Tool calling support**: Full tool integration with Gemini models
- **Error handling**: Improved error messages and debugging information

### 🎨 User Interface
- **Modern Design**: Clean, intuitive interface with smooth animations
- **Message Styling**: Different visual styles for user, assistant, and tool messages
- **Real-time Feedback**: Loading indicators and error handling
- **Responsive Layout**: Works seamlessly across different screen sizes

### 🔒 Privacy & Security
- **Local Storage**: All data stored locally on your device
- **API Key Security**: Secure handling of AI provider credentials
- **No Data Collection**: Your conversations and data remain private