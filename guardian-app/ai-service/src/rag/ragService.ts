import { openaiService } from '../models/openaiService';
import { supabase } from '../config/database';

interface Document {
  id: string;
  content: string;
  metadata: any;
  embedding?: number[];
  created_at: string;
}

interface QueryResult {
  documents: Document[];
  answer: string;
  confidence: number;
  sources: string[];
}

interface RAGConfig {
  embeddingModel: string;
  maxDocuments: number;
  similarityThreshold: number;
  maxTokens: number;
}

class RAGService {
  private config: RAGConfig;
  private vectorStore: Map<string, number[]> = new Map();

  constructor() {
    this.config = {
      embeddingModel: 'text-embedding-ada-002',
      maxDocuments: 5,
      similarityThreshold: 0.7,
      maxTokens: 1500,
    };
  }

  // 添加文档到向量数据库
  async addDocument(content: string, metadata: any = {}): Promise<string> {
    try {
      // 生成文档嵌入
      const embedding = await openaiService.generateEmbeddings(content);
      
      // 存储到Supabase（需要先创建documents表）
      const { data, error } = await supabase
        .from('documents')
        .insert({
          content: content,
          metadata: metadata,
          embedding: embedding,
        })
        .select()
        .single();

      if (error) throw error;

      // 缓存到内存
      this.vectorStore.set(data.id, embedding);

      return data.id;
    } catch (error: any) {
      console.error('添加文档失败:', error);
      throw new Error(`添加文档失败: ${error.message}`);
    }
  }

  // 批量添加文档
  async addDocuments(documents: Array<{ content: string; metadata?: any }>): Promise<string[]> {
    const documentIds: string[] = [];
    
    for (const doc of documents) {
      try {
        const id = await this.addDocument(doc.content, doc.metadata);
        documentIds.push(id);
      } catch (error) {
        console.error('批量添加文档时出错:', error);
      }
    }

    return documentIds;
  }

  // 相似性搜索
  async searchSimilarDocuments(query: string, limit: number = 5): Promise<Document[]> {
    try {
      // 生成查询嵌入
      const queryEmbedding = await openaiService.generateEmbeddings(query);

      // 使用Supabase的向量搜索功能
      // 注意：这需要在Supabase中安装pgvector扩展
      const { data, error } = await supabase.rpc('search_documents', {
        query_embedding: queryEmbedding,
        similarity_threshold: this.config.similarityThreshold,
        match_count: limit,
      });

      if (error) {
        console.error('向量搜索错误:', error);
        // 降级到简单的文本搜索
        return await this.fallbackTextSearch(query, limit);
      }

      return data || [];
    } catch (error: any) {
      console.error('搜索文档失败:', error);
      return await this.fallbackTextSearch(query, limit);
    }
  }

  // 降级文本搜索（当向量搜索不可用时）
  private async fallbackTextSearch(query: string, limit: number): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .textSearch('content', query)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('文本搜索也失败:', error);
      return [];
    }
  }

  // RAG查询：检索相关文档并生成答案
  async query(question: string, context?: any): Promise<QueryResult> {
    try {
      // 1. 检索相关文档
      const relevantDocs = await this.searchSimilarDocuments(
        question, 
        this.config.maxDocuments
      );

      if (relevantDocs.length === 0) {
        return {
          documents: [],
          answer: '抱歉，我没有找到相关的信息来回答您的问题。',
          confidence: 0,
          sources: [],
        };
      }

      // 2. 构建上下文
      const contextText = relevantDocs
        .map(doc => doc.content)
        .join('\n\n');

      // 3. 生成答案
      const prompt = this.buildRAGPrompt(question, contextText, context);
      const answer = await openaiService.chatCompletion({
        messages: [{ role: 'user', content: prompt }],
      });

      // 4. 提取引用来源
      const sources = relevantDocs
        .map(doc => doc.metadata.title || doc.metadata.source || doc.id)
        .filter(Boolean);

      return {
        documents: relevantDocs,
        answer: answer,
        confidence: this.calculateConfidence(relevantDocs),
        sources: sources,
      };

    } catch (error: any) {
      console.error('RAG查询失败:', error);
      return {
        documents: [],
        answer: `查询失败: ${error.message}`,
        confidence: 0,
        sources: [],
      };
    }
  }

  // 构建RAG提示词
  private buildRAGPrompt(question: string, context: string, additionalContext?: any): string {
    let prompt = `基于以下提供的上下文信息，请回答用户的问题。如果上下文中没有足够的信息来回答问题，请诚实地说明。

上下文信息：
${context}

用户问题：${question}

请提供准确、有用的回答，并在适当的地方引用上下文信息。`;

    if (additionalContext) {
      prompt += `\n\n额外上下文：${JSON.stringify(additionalContext)}`;
    }

    return prompt;
  }

  // 计算答案置信度
  private calculateConfidence(documents: Document[]): number {
    if (documents.length === 0) return 0;

    // 基于文档数量和相关性计算置信度
    const baseConfidence = Math.min(documents.length / this.config.maxDocuments, 1);
    
    // 可以根据文档的元数据进一步调整置信度
    const avgRelevance = documents.reduce((sum, doc) => {
      return sum + (doc.metadata.relevance_score || 0.5);
    }, 0) / documents.length;

    return baseConfidence * avgRelevance;
  }

  // 预构建知识库：添加常见的数据治理相关文档
  async buildKnowledgeBase(): Promise<void> {
    const knowledgeDocuments = [
      {
        content: `数据治理最佳实践：
        1. 建立数据质量标准和指标
        2. 实施数据分类和标记
        3. 确保数据安全和隐私保护
        4. 建立数据生命周期管理
        5. 实施数据访问控制
        6. 定期进行数据质量审计`,
        metadata: { title: '数据治理最佳实践', category: 'best_practices' }
      },
      {
        content: `OCR识别常见问题及解决方案：
        1. 图像模糊：提高图像分辨率，使用图像增强技术
        2. 光线不足：调整图像亮度和对比度
        3. 字符识别错误：使用多语言模型，增加训练数据
        4. 版面复杂：使用版面分析技术，分块识别
        5. 手写字体：使用专门的手写字体识别模型`,
        metadata: { title: 'OCR问题解决方案', category: 'troubleshooting' }
      },
      {
        content: `任务管理流程：
        1. 任务创建：明确任务目标、优先级、截止时间
        2. 任务分配：根据工作负载和技能匹配合适的执行者
        3. 任务执行：提供必要的工具和支持
        4. 进度跟踪：定期检查任务状态和进度
        5. 质量控制：验证任务完成质量
        6. 反馈改进：收集反馈，优化流程`,
        metadata: { title: '任务管理流程', category: 'workflow' }
      },
      {
        content: `绩效评估指标体系：
        1. 任务完成率：按时按质完成任务的比例
        2. 数据准确率：数据质量和准确性指标
        3. 响应速度：任务响应和处理时间
        4. 客户满意度：服务对象的反馈评价
        5. 创新贡献：提出的改进建议和创新方案
        6. 团队协作：与团队成员的协作效果`,
        metadata: { title: '绩效评估指标', category: 'performance' }
      }
    ];

    console.log('开始构建知识库...');
    const documentIds = await this.addDocuments(knowledgeDocuments);
    console.log(`知识库构建完成，添加了 ${documentIds.length} 个文档`);
  }

  // 删除文档
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      // 从内存缓存中移除
      this.vectorStore.delete(documentId);
    } catch (error: any) {
      console.error('删除文档失败:', error);
      throw new Error(`删除文档失败: ${error.message}`);
    }
  }

  // 获取所有文档
  async getAllDocuments(): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('获取文档列表失败:', error);
      return [];
    }
  }
}

export const ragService = new RAGService(); 