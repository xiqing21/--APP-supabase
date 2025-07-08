// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  employee_id: string;
  role: 'admin' | 'worker';
  region?: string;
  level: number;
  experience_points: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// 任务相关类型
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  created_by: string;
  customer_name?: string;
  customer_phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  contract_number?: string;
  estimated_duration?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  assigned_user?: User;
  creator_user?: User;
}

// 成就相关类型
export interface Achievement {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  points: number;
  requirements?: any;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

// 绩效相关类型
export interface Performance {
  id: string;
  user_id: string;
  date: string;
  tasks_completed: number;
  accuracy_rate: number;
  response_time_avg: number;
  score: number;
  created_at: string;
}

// 位置相关类型
export interface Location {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

// 扫描记录类型
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

// 通知类型
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  related_task_id?: string;
  read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 认证上下文类型
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: 'admin' | 'worker') => void;
}

// 分页类型
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 地图相关类型
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: 'user' | 'task' | 'hotspot';
  data?: any;
}

// AI助手相关类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'chart' | 'suggestion';
  data?: any;
}

// OCR识别结果类型
export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ComparisonResult {
  field: string;
  ocrValue: string;
  systemValue: string;
  match: boolean;
  confidence: number;
} 