# 🎤 智能语音助手

基于Azure Speech服务和OpenAI的智能语音记录与任务规划系统。

## ✨ 主要功能

### 🎙️ 语音记录
- **一键录音**：点击按钮即可开始录音
- **实时状态**：显示录音时长和处理进度
- **自动转换**：录音完成后自动转换为文本

### 🤖 AI智能分析
- **内容摘要**：自动生成录音内容的摘要
- **关键词提取**：识别重要关键词和主题
- **情感分析**：分析内容的情感倾向
- **任务规划**：自动识别并生成待办事项列表
- **优先级分类**：为任务分配高/中/低优先级

### 📝 历史管理
- **录音历史**：保存所有录音记录
- **音频播放**：支持播放历史录音
- **内容查看**：查看转换后的文本内容

## 🚀 快速开始

### 环境配置

1. 克隆项目
```bash
git clone <repository-url>
cd MemoryAI-Demo
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env.local` 文件：
```env
# Azure Speech Service
AZURE_SPEECH_KEY=your_speech_key
AZURE_SPEECH_REGION=your_speech_region

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=your_openai_endpoint
AZURE_OPENAI_KEY=your_openai_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
```

4. 启动开发服务器
```bash
npm run dev
```

5. 访问应用
打开浏览器访问 `http://localhost:3000`

## 📱 使用指南

### 录音步骤
1. 点击"开始录音"按钮
2. 清晰地说出要记录的内容
3. 点击"停止录音"按钮
4. AI自动分析并生成结果

### 使用技巧
- **录音时长**：建议3-30秒
- **说话清晰**：避免背景噪音
- **内容类型**：支持任务、想法、会议记录等
- **AI分析**：自动识别并分类内容

## 🛠️ 技术栈

- **前端**：Next.js 15, TypeScript, Ant Design
- **语音服务**：Azure Speech Service
- **AI分析**：Azure OpenAI
- **样式**：CSS Modules, 响应式设计

## 📁 项目结构

```
MemoryAI-Demo/
├── app/
│   ├── api/                 # API路由
│   │   ├── analysis/        # AI分析API
│   │   └── speech/          # 语音服务API
│   ├── components/          # React组件
│   ├── hooks/              # 自定义Hooks
│   ├── lib/                # 工具库
│   └── styles/             # 样式文件
├── public/                 # 静态资源
└── types/                  # TypeScript类型定义
```

## 🔧 API接口

### 语音转文本
- `POST /api/speech/recording` - 录音转文本
- `POST /api/speech/stream` - 流式语音识别

### AI分析
- `POST /api/analysis` - 文本分析和任务规划

## 🎯 功能特色

- **智能任务识别**：自动从语音中提取任务和待办事项
- **优先级管理**：根据内容自动分配任务优先级
- **实时反馈**：录音过程中显示实时状态
- **响应式设计**：支持桌面和移动设备
- **历史记录**：保存和管理所有录音记录

## 🤝 贡献

欢迎提交Issue和Pull Request来改进项目！

## �� 许可证

MIT License 