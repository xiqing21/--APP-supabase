# 数据守护者AI (Guardian APP)

智能化数据治理工具，支持网格员和管理员的双角色数据管理平台。

## 📁 项目结构

```
guardian-app/
├── frontend/           # React前端应用
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   ├── pages/         # 页面组件
│   │   ├── hooks/         # 自定义Hooks
│   │   ├── utils/         # 工具函数
│   │   └── styles/        # 样式文件
│   └── public/
├── backend/            # Node.js后端API
│   ├── src/
│   │   ├── routes/        # API路由
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/    # 中间件
│   │   ├── services/      # 业务逻辑服务
│   │   └── utils/         # 工具函数
│   └── config/
├── database/           # 数据库相关
│   ├── migrations/        # 数据库迁移
│   ├── seeds/             # 初始数据
│   └── schemas/           # 数据库模式定义
├── ai-service/         # AI相关服务
│   ├── nlp/               # 自然语言处理
│   ├── ocr/               # OCR识别服务
│   ├── rag/               # RAG检索增强
│   └── models/            # AI模型配置
└── docs/               # 项目文档
```

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Supabase账户

### 安装依赖

```bash
# 安装所有依赖
npm run install:all
```

### 环境变量配置

复制环境变量模板文件：

```bash
# 后端环境变量
cp backend/.env.example backend/.env

# 前端环境变量  
cp frontend/.env.example frontend/.env
```

### 启动开发服务器

```bash
# 同时启动前后端开发服务器
npm run dev

# 或者分别启动
npm run dev:frontend  # 前端 localhost:3000
npm run dev:backend   # 后端 localhost:5000
```

## 🔧 技术栈

### 前端
- **React 18** - 前端框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **React Router** - 路由管理
- **React Query** - 数据状态管理
- **Axios** - HTTP客户端

### 后端
- **Node.js** - 运行时环境
- **Express** - Web框架
- **TypeScript** - 类型安全
- **Supabase** - 数据库和认证
- **JWT** - 身份验证
- **Winston** - 日志管理

### 数据库
- **PostgreSQL** - 主数据库（通过Supabase）
- **Supabase Auth** - 用户认证
- **Supabase Storage** - 文件存储

### AI服务
- **OpenAI API** - 大语言模型
- **Tesseract.js** - OCR识别
- **Vector Database** - 向量存储（RAG）

## 📱 主要功能

### 网格员端
- ✅ 智能工作台 - 任务统计、数据健康分、荣誉展示
- ✅ 任务管理 - 详情查看、执行记录、AI建议
- ✅ 慧眼扫描 - OCR识别、数据对比、差异高亮
- ✅ AI助手 - 智能分析、绩效报告、对话交互

### 管理员端
- ✅ GIS指挥地图 - 实时位置、热力图、团队状态
- ✅ 任务池管理 - 智能派单、任务筛选、AI推荐
- ✅ 团队绩效 - 排行榜、统计分析、督办功能

### 通用功能
- ✅ 个人中心 - 用户信息、荣誉墙、角色切换
- ✅ 新手引导 - 功能介绍、交互教程

## 🔄 开发流程

1. **创建功能分支**: `git checkout -b feature/功能名称`
2. **开发测试**: 本地开发并测试功能
3. **提交代码**: `git commit -m "feat: 添加功能描述"`
4. **合并主分支**: 通过Pull Request合并

## 📚 API文档

API文档可通过以下方式查看：
- 开发环境: `http://localhost:5000/api-docs`
- 生产环境: `https://api.guardian.com/api-docs`

## 🤝 贡献指南

1. Fork本项目
2. 创建功能分支
3. 提交变更
4. 发起Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。 