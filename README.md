# Hearthlight - Productivity & Life Coaching App

<div align="center">
  <img src="./assets/images/icon.png" alt="Hearthlight Logo" width="120" height="120">

  **Illuminate your inner potential and achieve meaningful growth**

  [![React Native](https://img.shields.io/badge/React%20Native-0.74-blue.svg)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-51-black.svg)](https://expo.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## 🌟 Overview

Hearthlight is a comprehensive productivity and life coaching application that combines task management, diary journaling, goal tracking, and AI-powered life coaching into a unified, beautiful experience. Built with React Native and Expo, it features glass morphism UI effects, intelligent task organization using the Eisenhower Matrix, and a sophisticated AI assistant that functions as your personal life coach.

## ✨ Key Features

### 📝 **Smart Task Management**
- **Eisenhower Matrix Organization**: Automatically categorize tasks by urgency and importance
- **Dynamic Quadrant Display**: Only show quadrants that contain tasks to reduce clutter
- **Recurring Tasks**: Automatic state reset based on completion intervals
- **Completed Tasks Archive**: Separate board for reviewing completed tasks with search and filtering
- **Pomodoro Integration**: Built-in focus timer with customizable settings

### 📖 **Intelligent Diary System**
- **Markdown Support**: Rich text formatting with live preview
- **Mood Tracking**: Monitor emotional patterns over time
- **Tag Organization**: Categorize entries with custom tags
- **AI-Powered Insights**: Get coaching insights based on diary patterns

### 🎯 **Goal Tracking & Habits**
- **SMART Goals**: Create specific, measurable, achievable goals
- **Progress Visualization**: Track progress with intuitive charts
- **Habit Formation**: Build positive habits with streak tracking
- **Category Organization**: Organize goals by life areas

### 🤖 **AI Life Coach**
- **Proactive Guidance**: Personalized coaching based on your data
- **Historical Analysis**: AI analyzes patterns in tasks, diary entries, and goals
- **ReAct Methodology**: Structured reasoning process (Reason → Act → Reflect → Respond)
- **Fresh Session Management**: Configurable conversation preferences
- **Motivational Support**: Encouraging, growth-focused interactions
- **Advanced Prompt Engineering**: Sophisticated conversation management using pure prompt engineering

### ⏰ **Advanced Pomodoro Timer**
- **Customizable Durations**: Personalize work and break periods
- **Smart Notifications**: Configurable reminders for productivity activities
- **Auto-start Options**: Seamless workflow transitions
- **Session Tracking**: Monitor focus time and productivity patterns

### 📊 **Activity Tracking**
- **Comprehensive Logging**: Track all user interactions and achievements
- **Pattern Recognition**: Identify productivity trends and habits
- **Progress Insights**: Visual representation of your growth journey
- **Historical Data**: Access to complete activity timeline

### 🔄 **Data Synchronization**
- **WebDAV Support**: Sync data across devices securely
- **Import/Export**: File-based data portability
- **Backup & Restore**: Protect your productivity data
- **Cross-Platform**: Seamless experience across devices

### 🎨 **Beautiful Design**
- **Glass Morphism UI**: Modern, elegant visual effects
- **Icon-First Design**: Clean, intuitive interface
- **Dark/Light Themes**: Customizable appearance
- **Responsive Layout**: Optimized for all screen sizes

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hearthlight.git
   cd hearthlight
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on your preferred platform**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your device

### Configuration

1. **AI Assistant Setup**
   - Configure your preferred AI provider (OpenAI, Anthropic, Google)
   - Add API keys in the app settings
   - Customize conversation preferences

2. **WebDAV Synchronization** (Optional)
   - Set up WebDAV server credentials
   - Configure sync frequency and auto-sync preferences
   - Test connection and perform initial sync

## 🏗️ Technology Stack

### **Frontend**
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build tools
- **TypeScript**: Type-safe JavaScript development
- **React Navigation**: Navigation and routing
- **Lucide React Native**: Beautiful, consistent icons

### **AI & Intelligence**
- **Vercel AI SDK**: AI provider integration and streaming
- **Advanced Prompt Engineering**: Sophisticated ReAct methodology implementation
- **OpenAI API**: GPT models for life coaching
- **Anthropic Claude**: Alternative AI provider
- **Google Generative AI**: Additional AI capabilities

### **Data & Storage**
- **AsyncStorage**: Local data persistence
- **WebDAV**: Cross-device synchronization
- **JSON**: Structured data format
- **File System**: Import/export functionality

### **UI & Design**
- **Glass Morphism**: Modern visual effects
- **Custom Components**: Reusable UI elements
- **Responsive Design**: Adaptive layouts
- **Animation**: Smooth user interactions

## 📱 App Structure

```
hearthlight/
├── app/                    # Main application screens
│   ├── (tabs)/            # Tab-based navigation
│   │   ├── index.tsx      # Diary/Home screen
│   │   ├── todo.tsx       # Task management
│   │   ├── ai-assistant.tsx # AI life coach
│   │   ├── focus.tsx      # Pomodoro timer
│   │   └── profile.tsx    # Settings & profile
├── components/            # Reusable UI components
│   ├── DiaryCard.tsx     # Diary entry display
│   ├── TaskDetailModal.tsx # Task editing
│   ├── GlassCard.tsx     # Glass morphism container
│   └── MarkdownEditor.tsx # Rich text editing
├── utils/                # Utility functions
│   ├── storage.ts        # Data persistence
│   ├── aiService.ts      # AI integration
│   ├── taskUtils.ts      # Task management logic
│   ├── activityTracker.ts # User activity logging
│   └── syncService.ts    # WebDAV synchronization
├── types/                # TypeScript definitions
└── assets/              # Images, fonts, and static files
```

## 🔧 API Documentation

### AI Assistant Tools

The AI assistant has access to several tools for analyzing user data:

#### `getUserActivities(args)`
- **Purpose**: Retrieve user's recent activities and interactions
- **Parameters**:
  - `limit` (optional): Number of activities to return
  - `type` (optional): Filter by activity type
  - `days` (optional): Number of days to look back

#### `getTaskHistory(args)`
- **Purpose**: Analyze task completion patterns
- **Parameters**:
  - `period` (optional): 'day', 'week', or 'month'
  - `status` (optional): 'completed' or 'pending'

#### `getDiaryInsights(args)`
- **Purpose**: Get insights from diary entries and mood patterns
- **Parameters**:
  - `period` (optional): Time period to analyze

#### `getGoalProgress(args)`
- **Purpose**: Analyze goal progress and achievement patterns
- **Parameters**:
  - `period` (optional): Time period to analyze

### ReAct Methodology with Streaming

The AI assistant implements a structured ReAct (Reasoning and Acting) approach with real-time streaming:

1. **🤔 Reason** (Streaming): AI explains its thinking process in real-time
2. **🔧 Act**: Calls internal tools to gather user data from local storage
3. **💭 Reflect** (Streaming): Analyzes results and identifies patterns in real-time
4. **💬 Respond** (Streaming): Provides meaningful insights and actionable advice

**Key Features:**
- **Real-time Streaming**: See AI reasoning as it happens
- **Collapsed Tool Results**: Tool outputs displayed in collapsible format
- **Internal Tool Integration**: Uses local data from tasks, diary, goals, and activities
- **No Result Repetition**: Tool results shown separately, not in streaming text

**Available Internal Tools:**
- `getUserActivities`: Recent user activities and engagement patterns
- `getTaskHistory`: Task completion patterns and productivity trends
- `getDiaryInsights`: Diary entry analysis and mood patterns
- `getGoalProgress`: Goal achievement and progress analysis

**Example Flow:**
```
User: "How am I doing with my productivity lately?"

🤔 Reasoning (Streaming): "Let me analyze your recent activity patterns..."
🔧 Action: [Tools: getUserActivities, getTaskHistory] → [Collapsed Results]
💭 Reflection (Streaming): "Based on the data, I can see strong patterns..."
💬 Response (Streaming): "Great progress! Your 75% completion rate shows..."
```

### Storage API

#### Task Management
```typescript
StorageService.getTasks(): Promise<Task[]>
StorageService.saveTasks(tasks: Task[]): Promise<void>
StorageService.getCompletedTasks(): Promise<CompletedTask[]>
```

#### Activity Tracking
```typescript
activityTracker.recordActivity(activity: UserActivity): Promise<void>
activityTracker.getRecentActivities(limit?: number): UserActivity[]
activityTracker.getActivityStats(): ActivityStats
```

## 🤝 Contributing

We welcome contributions to Hearthlight! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow TypeScript best practices
   - Add tests for new functionality
   - Update documentation as needed
4. **Test thoroughly**
   - Test on both iOS and Android
   - Verify AI assistant functionality
   - Check data synchronization
5. **Submit a pull request**

### Code Style

- Use TypeScript for all new code
- Follow React Native best practices
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Maintain consistent indentation (2 spaces)

### Testing

- Test new features on multiple devices
- Verify AI assistant responses
- Check data persistence and sync
- Validate UI across different screen sizes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo Team**: For the excellent development platform
- **React Native Community**: For the robust ecosystem
- **AI Providers**: OpenAI, Anthropic, and Google for AI capabilities
- **Open Source Contributors**: For the amazing libraries and tools

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions for questions and ideas

---

<div align="center">
  <strong>Built with ❤️ for productivity enthusiasts and personal growth seekers</strong>
</div>
