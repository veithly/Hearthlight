# Hearthlight

Hearthlight 是一款以隐私为核心、由 AI 驱动的现代化生产力应用，旨在帮助您通过强大的工具和智能助手来管理任务、日记和目标，从而点亮您的内心世界。

## ✨ 主要功能

### 🤖 多模型 AI 助手
集成了强大的 AI 助手，支持多种领先的语言模型，为您提供智能化的支持。

- **多提供商支持**: 无缝切换使用 OpenAI (GPT-3.5, GPT-4), Google (Gemini), Anthropic (Claude) 或任何与 OpenAI 兼容的自定义 API。
- **智能工具调用**: AI 助手可以直接与应用功能交互，帮您：
    - **创建任务**: 快速添加带有优先级和分类的任务。
    - **记录日记**: 生成包含情绪和标签的日记条目。
    - **设定目标**: 创建并分解您的长期和短期目标。
    - **分析效率**: 获取关于您生产力状况的即时统计和深度分析。
- **透明的对话流程**: 所有的 AI 工具调用和执行结果都会清晰地展示在对话流中，让您完全了解 AI 的工作过程。
- **持久化对话历史**: 您可以随时回顾、继续之前的任何对话。

### 🔄 通过 WebDAV 实现数据同步
通过 WebDAV 协议，您可以完全掌控自己的数据，并在多个设备之间保持同步。

- **控制您的数据**: 连接到您自己的 WebDAV 服务器（例如 Nextcloud, OwnCloud），确保数据隐私和所有权。
- **灵活的同步选项**: 支持手动触发同步，或设置按小时、天、周自动同步。
- **智能冲突解决**: 自动合并本地和服务器的数据，确保您始终拥有最新版本。

### 📝 核心生产力工具
- **任务管理**: 使用四象限法则等方法来组织和优先处理您的任务。
- **日记**: 记录您的想法和感受，AI 可以为您提供富有洞察力的分析和积极的反馈。
- **目标设定**: 分解宏大目标，创建清晰、可执行的计划。

### 🔒 隐私与安全
- **本地优先**: 所有数据都默认存储在您的设备本地。
- **无数据收集**: 我们不会收集您的任何个人数据或对话内容。
- **安全凭证管理**: 您的 AI 提供商 API 密钥被安全地存储在设备上。

## 🛠️ 技术栈

- **框架**: React Native, Expo
- **AI 集成**:
    - 自研的 React Native 兼容版 LangGraph 风格服务，用于复杂 Agent 流程。
    - Vercel AI SDK，用于与语言模型进行流式交互。
    - LangChain.js (核心模块)
- **状态管理**: Zustand
- **导航**: React Navigation
- **UI**: Expo Modules, React Native Reanimated, Lucide Icons

## 🚀 如何开始

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/hearthlight.git
    cd hearthlight
    ```

2.  **安装依赖**
    推荐使用 `pnpm`：
    ```bash
    pnpm install
    ```
    或者使用 `npm`：
    ```bash
    npm install
    ```

3.  **配置环境变量**
    在项目根目录创建一个 `.env.local` 文件，并填入您的 AI 提供商 API 密钥。您可以从 `.env.example` (如果存在) 开始。
    ```
    OPENAI_API_KEY="sk-..."
    ANTHROPIC_API_KEY="sk-..."
    GOOGLE_API_KEY="..."
    ```

4.  **启动应用**
    ```bash
    npm run dev
    ```
    然后根据终端提示，在您的手机或模拟器上打开应用。

## 📜 可用脚本

- `npm run dev`: 启动 Expo 开发服务器，用于在 iOS、Android 和 Web 上进行开发。
- `npm run build:web`: 将应用导出为静态 Web 应用。
- `npm run lint`: 运行 ESLint 检查代码风格。
