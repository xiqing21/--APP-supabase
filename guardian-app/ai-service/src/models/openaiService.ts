import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  userId?: string;
  context?: any;
}

interface NL2SQLRequest {
  query: string;
  tableSchema?: any[];
  userId?: string;
}

class OpenAIService {
  private openai: OpenAI;
  private initialized: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('OpenAI API key not provided. AI features will be disabled.');
      return;
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    
    this.initialized = true;
  }

  private checkInitialized() {
    if (!this.initialized) {
      throw new Error('OpenAI service is not initialized. Please check your API key.');
    }
  }

  // AI聊天助手
  async chatCompletion(request: ChatCompletionRequest): Promise<string> {
    this.checkInitialized();

    const systemPrompt = `你是数据守护者AI的智能助手，专门帮助网格员和管理员进行数据治理工作。

你的主要功能：
1. 任务分析和建议
2. 绩效数据解读
3. 工作路线优化
4. 数据质量评估
5. 问题诊断和解决方案

请用专业但友好的语调回答问题，提供实用的建议。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.messages,
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content || '抱歉，我无法处理您的请求。';
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw new Error(`AI服务暂时不可用: ${error.message}`);
    }
  }

  // 自然语言转SQL
  async naturalLanguageToSQL(request: NL2SQLRequest): Promise<string> {
    this.checkInitialized();

    const systemPrompt = `你是一个专业的SQL生成器，专门为数据守护者AI系统生成PostgreSQL查询。

数据库表结构：
- users: 用户表 (id, username, email, full_name, role, region, level, experience_points)
- tasks: 任务表 (id, title, description, priority, status, assigned_to, customer_name, address, latitude, longitude)
- performance: 绩效表 (id, user_id, date, tasks_completed, accuracy_rate, response_time_avg, score)
- scan_records: 扫描记录表 (id, user_id, task_id, image_url, ocr_result, accuracy_score)
- notifications: 通知表 (id, user_id, title, message, type, read, created_at)

请根据用户的自然语言查询，生成对应的PostgreSQL SQL语句。
只返回SQL语句，不要包含任何解释文字。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请为以下查询生成SQL语句：${request.query}` },
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.1,
        max_tokens: 500,
      });

      const sqlQuery = completion.choices[0]?.message?.content || '';
      
      // 基本的SQL安全检查
      if (this.isSQLSafe(sqlQuery)) {
        return sqlQuery.trim();
      } else {
        throw new Error('生成的SQL查询包含不安全的操作');
      }
    } catch (error: any) {
      console.error('NL2SQL error:', error);
      throw new Error(`SQL生成失败: ${error.message}`);
    }
  }

  // 文档总结和分析
  async analyzeDocument(content: string, type: 'performance' | 'task' | 'general'): Promise<string> {
    this.checkInitialized();

    let systemPrompt = '';
    switch (type) {
      case 'performance':
        systemPrompt = '请分析这份绩效数据，提供洞察和改进建议。';
        break;
      case 'task':
        systemPrompt = '请分析这个任务的情况，提供执行建议和风险提示。';
        break;
      default:
        systemPrompt = '请总结和分析这份文档的主要内容。';
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content },
        ],
        temperature: 0.5,
        max_tokens: 800,
      });

      return completion.choices[0]?.message?.content || '无法分析该文档。';
    } catch (error: any) {
      console.error('Document analysis error:', error);
      throw new Error(`文档分析失败: ${error.message}`);
    }
  }

  // 基本的SQL安全检查
  private isSQLSafe(sql: string): boolean {
    const dangerousKeywords = [
      'DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 
      'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
    ];
    
    const upperSQL = sql.toUpperCase();
    return !dangerousKeywords.some(keyword => upperSQL.includes(keyword));
  }

  // 生成文本嵌入（用于RAG）
  async generateEmbeddings(text: string): Promise<number[]> {
    this.checkInitialized();

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('Embedding generation error:', error);
      throw new Error(`嵌入生成失败: ${error.message}`);
    }
  }
}

export const openaiService = new OpenAIService(); 