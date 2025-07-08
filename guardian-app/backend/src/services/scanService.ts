import { supabase, TABLES } from '../config/database';
import { createError } from '../middleware/errorHandler';

export interface ScanRecord {
  id: string;
  user_id: string;
  task_id?: string;
  image_url?: string;
  ocr_result?: any;
  accuracy_score?: number;
  differences?: any;
  created_at: string;
}

export interface ScanResult {
  id: string;
  text: string;
  confidence: number;
  extracted_data: any;
  comparison_result?: any;
  recommendations: string[];
}

export interface ComparisonData {
  company_name?: string;
  credit_code?: string;
  legal_person?: string;
  address?: string;
  registered_capital?: string;
}

class ScanService {
  // 创建扫描记录
  async createScanRecord(
    userId: string, 
    imageUrl: string, 
    taskId?: string
  ): Promise<ScanRecord> {
    try {
      const { data, error } = await supabase
        .from(TABLES.SCAN_RECORDS)
        .insert({
          user_id: userId,
          task_id: taskId,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      throw createError(`创建扫描记录失败: ${error.message}`, 500);
    }
  }

  // 处理OCR扫描（模拟OCR服务调用）
  async processScan(
    scanId: string, 
    imageBuffer: Buffer, 
    systemData?: ComparisonData
  ): Promise<ScanResult> {
    try {
      // 模拟OCR识别结果
      const ocrResult = await this.mockOCRRecognition(imageBuffer);
      
      // 提取结构化数据
      const extractedData = this.extractBusinessLicenseData(ocrResult.text);
      
      // 如果提供了系统数据，进行对比
      let comparisonResult = null;
      let recommendations: string[] = [];
      
      if (systemData) {
        comparisonResult = this.compareData(extractedData, systemData);
        recommendations = this.generateRecommendations(comparisonResult);
      }

      // 更新扫描记录
      await this.updateScanRecord(scanId, {
        ocr_result: {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          extracted_data: extractedData,
        },
        accuracy_score: ocrResult.confidence,
        differences: comparisonResult,
      });

      return {
        id: scanId,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        extracted_data: extractedData,
        comparison_result: comparisonResult,
        recommendations,
      };
    } catch (error: any) {
      throw createError(`处理扫描失败: ${error.message}`, 500);
    }
  }

  // 获取扫描记录列表
  async getScanRecords(userId: string, taskId?: string, page: number = 1, limit: number = 20) {
    try {
      let query = supabase
        .from(TABLES.SCAN_RECORDS)
        .select(`
          id, image_url, ocr_result, accuracy_score, created_at,
          task:task_id(id, title, customer_name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (taskId) {
        query = query.eq('task_id', taskId);
      }

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        records: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error: any) {
      throw createError(`获取扫描记录失败: ${error.message}`, 500);
    }
  }

  // 获取单个扫描记录详情
  async getScanRecordById(id: string): Promise<ScanRecord> {
    try {
      const { data, error } = await supabase
        .from(TABLES.SCAN_RECORDS)
        .select(`
          *,
          task:task_id(id, title, customer_name),
          user:user_id(id, full_name, username)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw createError('扫描记录不存在', 404);

      return data;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`获取扫描记录失败: ${error.message}`, 500);
    }
  }

  // 更新扫描记录
  private async updateScanRecord(id: string, updateData: any): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.SCAN_RECORDS)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw createError(`更新扫描记录失败: ${error.message}`, 500);
    }
  }

  // 模拟OCR识别（实际项目中会调用真实的OCR服务）
  private async mockOCRRecognition(imageBuffer: Buffer): Promise<{text: string, confidence: number}> {
    // 模拟OCR处理时间
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟OCR识别结果
    const mockText = `
      营业执照
      
      名称：深圳市科技创新有限公司
      类型：有限责任公司
      住所：深圳市南山区科技园A座2201室
      法定代表人：张总
      注册资本：壹千万元整
      成立日期：2020年01月15日
      营业期限：2020年01月15日至2050年01月14日
      统一社会信用代码：91440300MA5XXXXX01
      
      经营范围：技术开发、技术咨询、技术服务；软件开发；信息系统集成服务。
    `;

    return {
      text: mockText.trim(),
      confidence: 0.95 + Math.random() * 0.04, // 95-99%的随机置信度
    };
  }

  // 提取营业执照结构化数据
  private extractBusinessLicenseData(text: string): any {
    const data: any = {};

    // 企业名称
    const nameMatch = text.match(/名称[：:]\s*([^\n\r]+)/);
    if (nameMatch) {
      data.company_name = nameMatch[1].trim();
    }

    // 统一社会信用代码
    const codeMatch = text.match(/统一社会信用代码[：:]\s*([A-Z0-9]{18})/);
    if (codeMatch) {
      data.credit_code = codeMatch[1];
    }

    // 法定代表人
    const legalMatch = text.match(/法定代表人[：:]\s*([^\n\r]+)/);
    if (legalMatch) {
      data.legal_person = legalMatch[1].trim();
    }

    // 住所地址
    const addressMatch = text.match(/住所[：:]\s*([^\n\r]+)/);
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }

    // 注册资本
    const capitalMatch = text.match(/注册资本[：:]\s*([^\n\r]+)/);
    if (capitalMatch) {
      data.registered_capital = capitalMatch[1].trim();
    }

    // 成立日期
    const dateMatch = text.match(/成立日期[：:]\s*([^\n\r]+)/);
    if (dateMatch) {
      data.establishment_date = dateMatch[1].trim();
    }

    return data;
  }

  // 数据对比
  private compareData(ocrData: any, systemData: ComparisonData): any {
    const comparison: any = {
      overall_accuracy: 0,
      fields: [],
      total_fields: 0,
      matched_fields: 0,
    };

    const fieldsToCompare = [
      { key: 'company_name', name: '企业名称' },
      { key: 'credit_code', name: '统一社会信用代码' },
      { key: 'legal_person', name: '法定代表人' },
      { key: 'address', name: '注册地址' },
      { key: 'registered_capital', name: '注册资本' },
    ];

    for (const field of fieldsToCompare) {
      const ocrValue = ocrData[field.key] || '';
      const systemValue = systemData[field.key as keyof ComparisonData] || '';

      if (ocrValue || systemValue) {
        comparison.total_fields++;
        
        const similarity = this.calculateSimilarity(ocrValue, systemValue);
        const match = similarity > 0.8;

        if (match) comparison.matched_fields++;

        comparison.fields.push({
          field_name: field.name,
          ocr_value: ocrValue,
          system_value: systemValue,
          match: match,
          similarity: similarity,
        });
      }
    }

    comparison.overall_accuracy = comparison.total_fields > 0 
      ? comparison.matched_fields / comparison.total_fields 
      : 0;

    return comparison;
  }

  // 计算字符串相似度
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 && !str2) return 1;
    if (!str1 || !str2) return 0;

    // 简单的相似度计算（实际项目中可以使用更复杂的算法）
    const clean1 = str1.replace(/[\s\-\(\)（）]/g, '').toLowerCase();
    const clean2 = str2.replace(/[\s\-\(\)（）]/g, '').toLowerCase();

    if (clean1 === clean2) return 1;

    // 使用简单的包含关系判断
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return 0.9;
    }

    // 使用编辑距离的简化版本
    const maxLength = Math.max(clean1.length, clean2.length);
    const minLength = Math.min(clean1.length, clean2.length);
    
    if (maxLength === 0) return 1;
    
    return minLength / maxLength;
  }

  // 生成建议
  private generateRecommendations(comparisonResult: any): string[] {
    const recommendations: string[] = [];
    
    if (!comparisonResult) return recommendations;

    const { overall_accuracy, fields } = comparisonResult;

    if (overall_accuracy >= 0.9) {
      recommendations.push('数据匹配度很高，可以直接确认');
    } else if (overall_accuracy >= 0.7) {
      recommendations.push('数据基本匹配，建议仔细核对差异字段');
    } else {
      recommendations.push('数据差异较大，建议人工复核');
    }

    // 针对具体字段的建议
    const unmatchedFields = fields.filter((f: any) => !f.match);
    if (unmatchedFields.length > 0) {
      const fieldNames = unmatchedFields.map((f: any) => f.field_name).join('、');
      recommendations.push(`需要特别确认：${fieldNames}`);
    }

    // 地址相关的特殊建议
    const addressField = fields.find((f: any) => f.field_name === '注册地址');
    if (addressField && !addressField.match) {
      recommendations.push('地址不匹配可能是由于搬迁或格式差异，请确认是否有地址变更');
    }

    return recommendations;
  }

  // 获取扫描统计
  async getScanStats(userId?: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let baseQuery = supabase.from(TABLES.SCAN_RECORDS);

      if (userId) {
        baseQuery = baseQuery.eq('user_id', userId);
      }

      // 总扫描次数
      const { count: totalScans, error: totalError } = await baseQuery
        .select('id', { count: 'exact' })
        .gte('created_at', startDate.toISOString());

      if (totalError) throw totalError;

      // 平均准确率
      const { data: scanData, error: scanError } = await baseQuery
        .select('accuracy_score')
        .not('accuracy_score', 'is', null)
        .gte('created_at', startDate.toISOString());

      if (scanError) throw scanError;

      let avgAccuracy = 0;
      if (scanData && scanData.length > 0) {
        const totalAccuracy = scanData.reduce((sum: number, scan: any) => sum + (scan.accuracy_score || 0), 0);
        avgAccuracy = totalAccuracy / scanData.length;
      }

      return {
        total_scans: totalScans || 0,
        avg_accuracy: Math.round(avgAccuracy * 1000) / 10, // 转换为百分比，保留一位小数
        period_days: days,
      };
    } catch (error: any) {
      throw createError(`获取扫描统计失败: ${error.message}`, 500);
    }
  }

  // 删除扫描记录
  async deleteScanRecord(id: string, userId: string): Promise<void> {
    try {
      // 检查记录是否属于当前用户
      const record = await this.getScanRecordById(id);
      
      if (record.user_id !== userId) {
        throw createError('无权删除此扫描记录', 403);
      }

      const { error } = await supabase
        .from(TABLES.SCAN_RECORDS)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`删除扫描记录失败: ${error.message}`, 500);
    }
  }
}

export const scanService = new ScanService(); 