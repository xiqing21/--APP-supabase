import { supabase, TABLES } from '../config/database';
import { createError } from '../middleware/errorHandler';

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

export interface UserFilters {
  role?: 'admin' | 'worker';
  region?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  admin_count: number;
  worker_count: number;
  regions: Array<{ region: string; count: number }>;
}

class UserService {
  // 获取用户列表
  async getUsers(filters: UserFilters = {}) {
    try {
      let query = supabase
        .from(TABLES.USERS)
        .select(`
          id, username, email, full_name, employee_id, role, 
          region, level, experience_points, avatar_url, 
          created_at, updated_at
        `);

      // 应用过滤器
      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      if (filters.region) {
        query = query.eq('region', filters.region);
      }

      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,username.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
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
        users: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error: any) {
      throw createError(`获取用户列表失败: ${error.message}`, 500);
    }
  }

  // 根据ID获取用户
  async getUserById(id: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select(`
          id, username, email, full_name, employee_id, role, 
          region, level, experience_points, avatar_url, 
          created_at, updated_at
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw createError('用户不存在', 404);

      return data;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`获取用户信息失败: ${error.message}`, 500);
    }
  }

  // 更新用户信息
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    try {
      // 移除不允许更新的字段
      const { id: _, created_at, ...allowedFields } = updateData;

      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update({
          ...allowedFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          id, username, email, full_name, employee_id, role, 
          region, level, experience_points, avatar_url, 
          created_at, updated_at
        `)
        .single();

      if (error) throw error;
      if (!data) throw createError('用户不存在', 404);

      return data;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`更新用户信息失败: ${error.message}`, 500);
    }
  }

  // 删除用户（软删除或标记为非活跃）
  async deleteUser(id: string): Promise<void> {
    try {
      // 检查用户是否存在
      const user = await this.getUserById(id);

      // 检查是否有关联的活跃任务
      const { data: activeTasks, error: taskError } = await supabase
        .from(TABLES.TASKS)
        .select('id')
        .eq('assigned_to', id)
        .in('status', ['assigned', 'in_progress']);

      if (taskError) throw taskError;

      if (activeTasks && activeTasks.length > 0) {
        throw createError('用户有活跃任务，无法删除', 400);
      }

      // 删除用户（实际项目中可能只是标记为非活跃）
      const { error } = await supabase
        .from(TABLES.USERS)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`删除用户失败: ${error.message}`, 500);
    }
  }

  // 增加用户经验值
  async addExperiencePoints(userId: string, points: number): Promise<User> {
    try {
      const user = await this.getUserById(userId);
      
      const newPoints = user.experience_points + points;
      const newLevel = this.calculateLevel(newPoints);

      return await this.updateUser(userId, {
        experience_points: newPoints,
        level: newLevel,
      });
    } catch (error: any) {
      throw createError(`增加经验值失败: ${error.message}`, 500);
    }
  }

  // 计算用户等级
  private calculateLevel(experiencePoints: number): number {
    // 简单的等级计算规则：每1000点经验升一级
    return Math.floor(experiencePoints / 1000) + 1;
  }

  // 获取用户统计信息
  async getUserStats(): Promise<UserStats> {
    try {
      // 总用户数
      const { count: totalUsers, error: totalError } = await supabase
        .from(TABLES.USERS)
        .select('id', { count: 'exact' });

      if (totalError) throw totalError;

      // 活跃用户数（30天内有登录活动的用户）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeUsers, error: activeError } = await supabase
        .from(TABLES.USERS)
        .select('id', { count: 'exact' })
        .gte('updated_at', thirtyDaysAgo.toISOString());

      if (activeError) throw activeError;

      // 按角色统计
      const { data: roleStats, error: roleError } = await supabase
        .from(TABLES.USERS)
        .select('role')
        .in('role', ['admin', 'worker']);

      if (roleError) throw roleError;

      const adminCount = roleStats?.filter(u => u.role === 'admin').length || 0;
      const workerCount = roleStats?.filter(u => u.role === 'worker').length || 0;

      // 按地区统计
      const { data: regionData, error: regionError } = await supabase
        .from(TABLES.USERS)
        .select('region')
        .not('region', 'is', null);

      if (regionError) throw regionError;

      const regionStats = regionData?.reduce((acc: any, user) => {
        const region = user.region || '未分配';
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {}) || {};

      const regions = Object.entries(regionStats).map(([region, count]) => ({
        region,
        count: count as number,
      }));

      return {
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        admin_count: adminCount,
        worker_count: workerCount,
        regions,
      };
    } catch (error: any) {
      throw createError(`获取用户统计失败: ${error.message}`, 500);
    }
  }

  // 获取用户绩效数据
  async getUserPerformance(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from(TABLES.PERFORMANCE)
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      throw createError(`获取用户绩效失败: ${error.message}`, 500);
    }
  }

  // 获取用户成就
  async getUserAchievements(userId: string) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_ACHIEVEMENTS)
        .select(`
          id,
          earned_at,
          achievements (
            id, name, description, icon, category, points
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      throw createError(`获取用户成就失败: ${error.message}`, 500);
    }
  }

  // 为用户授予成就
  async grantAchievement(userId: string, achievementId: string) {
    try {
      // 检查是否已经拥有该成就
      const { data: existing, error: checkError } = await supabase
        .from(TABLES.USER_ACHIEVEMENTS)
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        throw createError('用户已拥有该成就', 400);
      }

      // 获取成就信息
      const { data: achievement, error: achievementError } = await supabase
        .from(TABLES.ACHIEVEMENTS)
        .select('points')
        .eq('id', achievementId)
        .single();

      if (achievementError) throw achievementError;
      if (!achievement) throw createError('成就不存在', 404);

      // 授予成就
      const { error: grantError } = await supabase
        .from(TABLES.USER_ACHIEVEMENTS)
        .insert({
          user_id: userId,
          achievement_id: achievementId,
        });

      if (grantError) throw grantError;

      // 增加经验值
      await this.addExperiencePoints(userId, achievement.points);

      return { success: true };
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError(`授予成就失败: ${error.message}`, 500);
    }
  }
}

export const userService = new UserService(); 