# 数据守护者AI 配置指南

## 🚀 快速配置

### 1. Supabase配置

您的Supabase项目已经创建，以下是配置信息：

**后端环境变量 (backend/.env)**：
```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://arnjfusdfmqmgxfwhisn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybmpmdXNkZm1xbWd4ZndoaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1OTQ4MjQsImV4cCI6MjA2NzE3MDgyNH0.Du-RgyWy91oJ2ClNoh3unvDvioJrL7vJhpkzVLdrhI0
SUPABASE_SERVICE_ROLE_KEY=你的服务端密钥（请到Supabase控制台获取）

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_please_change_it
JWT_EXPIRE_IN=7d

# OpenAI Configuration (AI功能)
OPENAI_API_KEY=your_openai_api_key_here

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

**前端环境变量 (frontend/.env)**：
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://arnjfusdfmqmgxfwhisn.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybmpmdXNkZm1xbWd4ZndoaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1OTQ4MjQsImV4cCI6MjA2NzE3MDgyNH0.Du-RgyWy91oJ2ClNoh3unvDvioJrL7vJhpkzVLdrhI0

# App Configuration
REACT_APP_NAME=数据守护者AI
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_ENABLE_AI_CHAT=true
REACT_APP_ENABLE_OCR_SCAN=true
REACT_APP_ENABLE_LOCATION_TRACKING=true
```

### 2. 安装依赖

```bash
# 进入项目根目录
cd guardian-app

# 安装所有依赖
npm run install:all

# 或者分别安装
npm install                    # 根目录
cd frontend && npm install     # 前端
cd ../backend && npm install   # 后端
```

### 3. 数据库设置

您的Supabase数据库已经有以下表结构：

- ✅ `users` - 用户表
- ✅ `tasks` - 任务表  
- ✅ `achievements` - 成就表
- ✅ `user_achievements` - 用户成就关联表
- ✅ `task_history` - 任务历史记录表
- ✅ `performance` - 绩效表
- ✅ `locations` - 位置记录表
- ✅ `scan_records` - 扫描记录表
- ✅ `notifications` - 通知表
- ✅ `todos` - 待办事项表

### 4. 启动应用

```bash
# 同时启动前后端服务器
npm run dev

# 或者分别启动
npm run dev:frontend  # 前端: http://localhost:3000
npm run dev:backend   # 后端: http://localhost:5000
```

### 5. API文档

启动后端服务器后，访问：http://localhost:5000/api-docs

### 6. 获取Supabase Service Role Key

1. 登录 [Supabase控制台](https://app.supabase.com)
2. 选择您的项目 (arnjfusdfmqmgxfwhisn)
3. 进入 Settings → API
4. 复制 **service_role** 密钥
5. 将其添加到后端 `.env` 文件的 `SUPABASE_SERVICE_ROLE_KEY` 字段

### 7. OpenAI API Key (AI功能)

1. 注册 [OpenAI账户](https://platform.openai.com)
2. 创建API Key
3. 将其添加到后端 `.env` 文件的 `OPENAI_API_KEY` 字段

## 🔧 数据库验证

检查数据库表结构是否满足需求：

- ✅ 用户系统：支持双角色（admin/worker）
- ✅ 任务管理：完整的任务生命周期
- ✅ 成就系统：游戏化激励机制
- ✅ 绩效统计：数据分析支持
- ✅ 位置追踪：GIS地图功能支持
- ✅ 扫描记录：OCR功能支持
- ✅ 通知系统：实时消息推送

## 📱 功能路线图

### Phase 1: 基础功能 (当前)
- ✅ 项目结构搭建
- ✅ 后端API框架
- ✅ 数据库集成
- 🔄 用户认证系统
- 🔄 基础CRUD操作

### Phase 2: 核心功能
- 📋 任务管理完整流程
- 📸 OCR扫描功能
- 🗺️ GIS地图集成
- 📊 绩效分析面板

### Phase 3: AI功能
- 🤖 AI助手对话
- 🔍 NL2SQL查询
- 📚 RAG知识库
- 💡 智能建议系统

## ⚠️ 注意事项

1. **安全性**：请确保更改默认的JWT_SECRET
2. **API限制**：注意OpenAI API的使用配额
3. **数据隐私**：敏感数据请加密存储
4. **性能优化**：生产环境请启用缓存和压缩

## 🆘 故障排除

### 常见问题

1. **端口占用**：更改PORT环境变量
2. **依赖安装失败**：清除node_modules重新安装
3. **数据库连接失败**：检查Supabase配置信息
4. **跨域问题**：确认CORS_ORIGIN配置正确

### 获取帮助

- 查看项目README文档
- 检查API文档：http://localhost:5000/api-docs
- 查看控制台错误日志 