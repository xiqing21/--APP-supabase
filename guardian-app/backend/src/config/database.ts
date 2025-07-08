import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// 创建Supabase客户端 - 用于服务端操作
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 创建Supabase客户端 - 用于用户认证
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseAnonKey) {
  throw new Error('Missing Supabase anon key');
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 数据库表名常量
export const TABLES = {
  USERS: 'users',
  TASKS: 'tasks',
  ACHIEVEMENTS: 'achievements',
  USER_ACHIEVEMENTS: 'user_achievements',
  TASK_HISTORY: 'task_history',
  PERFORMANCE: 'performance',
  LOCATIONS: 'locations',
  SCAN_RECORDS: 'scan_records',
  NOTIFICATIONS: 'notifications',
  TODOS: 'todos',
} as const; 