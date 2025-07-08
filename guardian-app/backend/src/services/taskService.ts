import { supabase, TABLES } from '../config/database';
import { createError } from '../middleware/errorHandler';

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
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assigned_to?: string;
  created_by?: string;
  region?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface TaskStats {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  avg_completion_time: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  customer_name?: string;
  customer_phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  contract_number?: string;
  estimated_duration?: number;
  due_date?: string;
  assigned_to?: string;
}

class TaskService {
  // 创建任务
  async createTask(taskData: CreateTaskData, createdBy: string): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TASKS)
        .insert({
          ...taskData,
          created_by: createdBy,
          status: taskData.assigned_to ? 'assigned' : 'pending',
          priority: taskData.priority || 'normal',
        })
        .select()
        .single();

      if (error) throw error;

      // 记录任务历史
      await this.recordTaskHistory(data.id, createdBy, 'created', '任务已创建');

      // 如果分配了执行人，发送通知
      if (taskData.assigned_to) {
        await this.sendTaskNotification(taskData.assigned_to, 'new_task', data);
      }

      return data;
    } catch (error: any) {
      throw createError(`创建任务失败: ${error.message}`, 500);
    }
  }

  // 获取任务列表
  async getTasks(filters: TaskFilters = {}) {
    try {
      let query = supabase
        .from(TABLES.TASKS)
        .select(`
          *,
          assigned_user:assigned_to(id, full_name, username),
          creator_user:created_by(id, full_name, username)
        `);

      // 应用过滤器
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // 分页
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        tasks: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error: any) {
      throw createError(`获取任务列表失败: ${error.message}`, 500);
    }
  }

  // 根据ID获取任务详情
  async getTaskById(id: string): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TASKS)
        .select(`
          *,
          assigned_user:assigned_to(id, full_name, username, avatar_url),
          creator_user:created_by(id, full_name, username, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw createError('任务不存在', 404);

      return data;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`获取任务详情失败: ${error.message}`, 500);
    }
  }

  // 更新任务
  async updateTask(id: string, updateData: Partial<Task>, userId: string): Promise<Task> {
    try {
      const task = await this.getTaskById(id);
      
      // 移除不允许更新的字段
      const { id: _, created_at, created_by, ...allowedFields } = updateData;

      const { data, error } = await supabase
        .from(TABLES.TASKS)
        .update({
          ...allowedFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 记录任务历史
      await this.recordTaskHistory(id, userId, 'updated', '任务信息已更新');

      return data;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`更新任务失败: ${error.message}`, 500);
    }
  }

  // 分配任务
  async assignTask(taskId: string, assignedTo: string, assignedBy: string): Promise<Task> {
    try {
      const task = await this.getTaskById(taskId);

      if (task.status !== 'pending') {
        throw createError('只能分配待分配状态的任务', 400);
      }

      const { data, error } = await supabase
        .from(TABLES.TASKS)
        .update({
          assigned_to: assignedTo,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // 记录任务历史
      await this.recordTaskHistory(taskId, assignedBy, 'assigned', `任务已分配给用户`);

      // 发送通知
      await this.sendTaskNotification(assignedTo, 'task_assigned', data);

      return data;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`分配任务失败: ${error.message}`, 500);
    }
  }

  // 开始执行任务
  async startTask(taskId: string, userId: string): Promise<Task> {
    try {
      const task = await this.getTaskById(taskId);

      if (task.assigned_to !== userId) {
        throw createError('只能开始执行分配给自己的任务', 403);
      }

      if (task.status !== 'assigned') {
        throw createError('只能开始执行已分配状态的任务', 400);
      }

      const { data, error } = await supabase
        .from(TABLES.TASKS)
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // 记录任务历史
      await this.recordTaskHistory(taskId, userId, 'started', '任务已开始执行');

      return data;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`开始任务失败: ${error.message}`, 500);
    }
  }

  // 完成任务
  async completeTask(taskId: string, userId: string, completionNote?: string): Promise<Task> {
    try {
      const task = await this.getTaskById(taskId);

      if (task.assigned_to !== userId) {
        throw createError('只能完成分配给自己的任务', 403);
      }

      if (task.status !== 'in_progress') {
        throw createError('只能完成正在执行的任务', 400);
      }

      const { data, error } = await supabase
        .from(TABLES.TASKS)
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // 记录任务历史
      await this.recordTaskHistory(taskId, userId, 'completed', completionNote || '任务已完成');

      // 计算并更新用户绩效
      await this.updateUserPerformance(userId, task);

      // 检查是否应该授予成就
      await this.checkAndGrantAchievements(userId);

      return data;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`完成任务失败: ${error.message}`, 500);
    }
  }

  // 获取任务历史记录
  async getTaskHistory(taskId: string) {
    try {
      const { data, error } = await supabase
        .from(TABLES.TASK_HISTORY)
        .select(`
          id, action, description, created_at,
          user:user_id(id, full_name, username)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      throw createError(`获取任务历史失败: ${error.message}`, 500);
    }
  }

  // 获取任务统计信息
  async getTaskStats(userId?: string, days: number = 30): Promise<TaskStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let baseQuery = supabase.from(TABLES.TASKS);

      if (userId) {
        baseQuery = baseQuery.eq('assigned_to', userId);
      }

      // 总任务数
      const { count: totalTasks, error: totalError } = await baseQuery
        .select('id', { count: 'exact' });

      if (totalError) throw totalError;

      // 各状态任务数
      const { data: statusData, error: statusError } = await baseQuery
        .select('status');

      if (statusError) throw statusError;

      const pendingTasks = statusData?.filter(t => t.status === 'pending').length || 0;
      const inProgressTasks = statusData?.filter(t => t.status === 'in_progress').length || 0;
      const completedTasks = statusData?.filter(t => t.status === 'completed').length || 0;

      // 过期任务数
      const now = new Date().toISOString();
      const { count: overdueTasks, error: overdueError } = await baseQuery
        .select('id', { count: 'exact' })
        .lt('due_date', now)
        .neq('status', 'completed');

      if (overdueError) throw overdueError;

      // 完成率
      const completionRate = totalTasks ? completedTasks / (totalTasks || 1) : 0;

      // 平均完成时间（天）
      const { data: completedTasksData, error: avgError } = await baseQuery
        .select('created_at, updated_at')
        .eq('status', 'completed')
        .gte('updated_at', startDate.toISOString());

      if (avgError) throw avgError;

      let avgCompletionTime = 0;
      if (completedTasksData && completedTasksData.length > 0) {
        const totalTime = completedTasksData.reduce((sum, task) => {
          const created = new Date(task.created_at).getTime();
          const completed = new Date(task.updated_at).getTime();
          return sum + (completed - created);
        }, 0);
        avgCompletionTime = totalTime / completedTasksData.length / (1000 * 60 * 60 * 24); // 转换为天
      }

      return {
        total_tasks: totalTasks || 0,
        pending_tasks: pendingTasks,
        in_progress_tasks: inProgressTasks,
        completed_tasks: completedTasks,
        overdue_tasks: overdueTasks || 0,
        completion_rate: completionRate,
        avg_completion_time: Math.round(avgCompletionTime * 10) / 10, // 保留一位小数
      };
    } catch (error: any) {
      throw createError(`获取任务统计失败: ${error.message}`, 500);
    }
  }

  // 记录任务历史
  private async recordTaskHistory(taskId: string, userId: string, action: string, description: string) {
    try {
      const { error } = await supabase
        .from(TABLES.TASK_HISTORY)
        .insert({
          task_id: taskId,
          user_id: userId,
          action,
          description,
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('记录任务历史失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  // 发送任务通知
  private async sendTaskNotification(userId: string, type: string, task: any) {
    try {
      let title = '';
      let message = '';

      switch (type) {
        case 'new_task':
          title = '新任务分配';
          message = `您有新的任务：${task.title}`;
          break;
        case 'task_assigned':
          title = '任务已分配';
          message = `任务"${task.title}"已分配给您`;
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .insert({
          user_id: userId,
          title,
          message,
          type: 'info',
          related_task_id: task.id,
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('发送任务通知失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  // 更新用户绩效
  private async updateUserPerformance(userId: string, task: any) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 查询今日绩效记录
      const { data: existing, error: queryError } = await supabase
        .from(TABLES.PERFORMANCE)
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError;
      }

      if (existing) {
        // 更新现有记录
        const { error: updateError } = await supabase
          .from(TABLES.PERFORMANCE)
          .update({
            tasks_completed: existing.tasks_completed + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // 创建新记录
        const { error: insertError } = await supabase
          .from(TABLES.PERFORMANCE)
          .insert({
            user_id: userId,
            date: today,
            tasks_completed: 1,
            accuracy_rate: 1.0,
            score: 100,
          });

        if (insertError) throw insertError;
      }
    } catch (error: any) {
      console.error('更新用户绩效失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  // 检查并授予成就
  private async checkAndGrantAchievements(userId: string) {
    try {
      // 获取用户完成的任务数
      const { count: completedCount, error } = await supabase
        .from(TABLES.TASKS)
        .select('id', { count: 'exact' })
        .eq('assigned_to', userId)
        .eq('status', 'completed');

      if (error) throw error;

      // 检查是否达到成就条件
      const achievementRules = [
        { count: 1, achievementName: 'first_task' },
        { count: 10, achievementName: 'task_master_10' },
        { count: 50, achievementName: 'task_master_50' },
        { count: 100, achievementName: 'task_master_100' },
      ];

      for (const rule of achievementRules) {
        if (completedCount === rule.count) {
          // 这里应该调用用户服务的授予成就方法
          // await userService.grantAchievementByName(userId, rule.achievementName);
        }
      }
    } catch (error: any) {
      console.error('检查成就失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  // 获取附近的任务（基于地理位置）
  async getNearbyTasks(latitude: number, longitude: number, radius: number = 5) {
    try {
      // 简单的地理距离计算（实际项目中可以使用PostGIS）
      const { data, error } = await supabase
        .from(TABLES.TASKS)
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .neq('status', 'completed');

      if (error) throw error;

      // 在JavaScript中过滤附近的任务
      const nearbyTasks = (data || []).filter(task => {
        if (!task.latitude || !task.longitude) return false;
        
        const distance = this.calculateDistance(
          latitude, longitude,
          task.latitude, task.longitude
        );
        
        return distance <= radius;
      });

      return nearbyTasks;
    } catch (error: any) {
      throw createError(`获取附近任务失败: ${error.message}`, 500);
    }
  }

  // 计算两点间距离（单位：公里）
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const taskService = new TaskService(); 