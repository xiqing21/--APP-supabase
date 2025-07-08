import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

interface ComparisonField {
  fieldName: string;
  ocrValue: string;
  systemValue: string;
  match: boolean;
  confidence: number;
}

interface ComparisonResult {
  overall_accuracy: number;
  fields: ComparisonField[];
  recommendations: string[];
}

class OCRService {
  private worker: Tesseract.Worker | null = null;
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      this.worker = await createWorker({
        logger: m => console.log(m) // OCR进度日志
      });
      
      await this.worker.loadLanguage('chi_sim+eng'); // 中文简体 + 英文
      await this.worker.initialize('chi_sim+eng');
      
      // 设置OCR参数
      await this.worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz一二三四五六七八九十百千万亿壹贰叁肆伍陆柒捌玖拾佰仟萬億（）()，。：；""''【】[]{}、|\\/-_+=*&^%$#@!?<>~`',
      });
      
      this.initialized = true;
      console.log('OCR服务初始化完成');
    } catch (error) {
      console.error('OCR服务初始化失败:', error);
      throw error;
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }

  // 预处理图像以提高OCR准确率
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // 使用sharp进行图像预处理
      const processedImage = await sharp(imageBuffer)
        .resize(2000, 2000, { // 放大图像
          fit: 'inside',
          withoutEnlargement: false
        })
        .grayscale() // 转灰度
        .normalize() // 归一化
        .sharpen() // 锐化
        .png()
        .toBuffer();

      return processedImage;
    } catch (error) {
      console.error('图像预处理失败:', error);
      return imageBuffer; // 如果预处理失败，返回原图
    }
  }

  // OCR识别核心方法
  async recognizeText(imageBuffer: Buffer): Promise<OCRResult> {
    if (!this.initialized || !this.worker) {
      await this.initialize();
    }

    try {
      // 预处理图像
      const processedImage = await this.preprocessImage(imageBuffer);

      // 执行OCR识别
      const { data } = await this.worker!.recognize(processedImage);

      // 提取文本和置信度
      const boundingBoxes = data.words
        .filter(word => word.confidence > 30) // 过滤低置信度文本
        .map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        }));

      return {
        text: data.text.trim(),
        confidence: data.confidence,
        boundingBoxes: boundingBoxes
      };

    } catch (error) {
      console.error('OCR识别失败:', error);
      throw new Error(`OCR识别失败: ${error.message}`);
    }
  }

  // 识别营业执照信息
  async recognizeBusinessLicense(imageBuffer: Buffer): Promise<any> {
    const ocrResult = await this.recognizeText(imageBuffer);
    
    // 营业执照关键信息提取规则
    const extractedData = this.extractBusinessLicenseInfo(ocrResult.text);
    
    return {
      ...extractedData,
      confidence: ocrResult.confidence,
      raw_text: ocrResult.text
    };
  }

  // 提取营业执照关键信息
  private extractBusinessLicenseInfo(text: string): any {
    const info: any = {};

    // 企业名称提取
    const companyNameMatch = text.match(/(?:名\s*称|企业名称)[：:\s]*([^\n\r]+)/);
    if (companyNameMatch) {
      info.company_name = companyNameMatch[1].trim();
    }

    // 统一社会信用代码
    const creditCodeMatch = text.match(/(?:统一社会信用代码|信用代码)[：:\s]*([A-Z0-9]{18})/);
    if (creditCodeMatch) {
      info.credit_code = creditCodeMatch[1];
    }

    // 法定代表人
    const legalPersonMatch = text.match(/(?:法定代表人|代表人)[：:\s]*([^\n\r]+)/);
    if (legalPersonMatch) {
      info.legal_person = legalPersonMatch[1].trim();
    }

    // 注册地址
    const addressMatch = text.match(/(?:住所|地址|注册地址)[：:\s]*([^\n\r]+)/);
    if (addressMatch) {
      info.address = addressMatch[1].trim();
    }

    // 注册资本
    const capitalMatch = text.match(/(?:注册资本|资本)[：:\s]*([^\n\r]+)/);
    if (capitalMatch) {
      info.registered_capital = capitalMatch[1].trim();
    }

    // 营业期限
    const termMatch = text.match(/(?:营业期限|经营期限)[：:\s]*([^\n\r]+)/);
    if (termMatch) {
      info.business_term = termMatch[1].trim();
    }

    return info;
  }

  // 对比OCR结果与系统数据
  compareWithSystemData(ocrData: any, systemData: any): ComparisonResult {
    const fields: ComparisonField[] = [];
    let totalFields = 0;
    let matchingFields = 0;

    // 定义需要对比的字段
    const fieldsToCompare = [
      { key: 'company_name', name: '企业名称' },
      { key: 'credit_code', name: '统一社会信用代码' },
      { key: 'legal_person', name: '法定代表人' },
      { key: 'address', name: '注册地址' },
      { key: 'registered_capital', name: '注册资本' }
    ];

    for (const field of fieldsToCompare) {
      const ocrValue = ocrData[field.key] || '';
      const systemValue = systemData[field.key] || '';

      if (ocrValue || systemValue) {
        totalFields++;
        
        // 计算相似度
        const similarity = this.calculateSimilarity(ocrValue, systemValue);
        const match = similarity > 0.8; // 80%相似度认为匹配

        if (match) matchingFields++;

        fields.push({
          fieldName: field.name,
          ocrValue,
          systemValue,
          match,
          confidence: similarity
        });
      }
    }

    const overall_accuracy = totalFields > 0 ? matchingFields / totalFields : 0;

    // 生成建议
    const recommendations: string[] = [];
    if (overall_accuracy < 0.6) {
      recommendations.push('数据差异较大，建议人工复核');
    }
    
    const unmatchedFields = fields.filter(f => !f.match);
    if (unmatchedFields.length > 0) {
      recommendations.push(`以下字段需要确认：${unmatchedFields.map(f => f.fieldName).join('、')}`);
    }

    if (overall_accuracy > 0.9) {
      recommendations.push('数据高度匹配，可以直接确认');
    }

    return {
      overall_accuracy,
      fields,
      recommendations
    };
  }

  // 计算字符串相似度
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 && !str2) return 1;
    if (!str1 || !str2) return 0;

    // 去除空格和特殊字符
    const clean1 = str1.replace(/[\s\-\(\)（）]/g, '').toLowerCase();
    const clean2 = str2.replace(/[\s\-\(\)（）]/g, '').toLowerCase();

    if (clean1 === clean2) return 1;

    // 使用编辑距离计算相似度
    const distance = this.levenshteinDistance(clean1, clean2);
    const maxLength = Math.max(clean1.length, clean2.length);
    
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  // 计算编辑距离（Levenshtein距离）
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const ocrService = new OCRService(); 