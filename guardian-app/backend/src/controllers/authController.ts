import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { userService } from '../services/userService';
import { generateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export interface LoginData {
  username?: string;
  email?: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: 'grid_worker' | 'admin';
}

class AuthController {
  // 用户登录
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password }: LoginData = req.body;

      // 验证输入
      if (!password) {
        throw createError('密码不能为空', 400);
      }

      if (!username && !email) {
        throw createError('用户名或邮箱不能为空', 400);
      }

      // 根据用户名或邮箱查找用户
      const user = await userService.getUserByCredentials(username || '', email || '');

      if (!user) {
        throw createError('用户名、邮箱或密码错误', 401);
      }

      if (!user.is_active) {
        throw createError('账户已被禁用，请联系管理员', 401);
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw createError('用户名、邮箱或密码错误', 401);
      }

      // 生成JWT令牌
      const token = generateToken(user);

      // 更新最后登录时间
      await userService.updateUser(user.id, {
        last_login: new Date().toISOString(),
      });

      // 返回用户信息和令牌（不包含密码）
      const { password_hash, ...userInfo } = user;

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: userInfo,
          token,
          expires_in: process.env.JWT_EXPIRES_IN || '24h',
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // 用户注册
  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: RegisterData = req.body;

      // 验证必填字段
      if (!userData.username || !userData.email || !userData.password || !userData.full_name) {
        throw createError('用户名、邮箱、密码和姓名不能为空', 400);
      }

      // 验证用户名格式
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(userData.username)) {
        throw createError('用户名必须是3-20位字母、数字或下划线', 400);
      }

      // 验证邮箱格式
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        throw createError('邮箱格式不正确', 400);
      }

      // 验证密码强度
      if (userData.password.length < 6) {
        throw createError('密码长度不能少于6位', 400);
      }

      // 检查用户名和邮箱是否已存在
      const existingUser = await userService.getUserByCredentials(userData.username, userData.email);
      if (existingUser) {
        throw createError('用户名或邮箱已存在', 409);
      }

      // 创建用户
      const newUser = await userService.createUser({
        ...userData,
        role: userData.role || 'grid_worker', // 默认角色为网格员
      });

      // 生成JWT令牌
      const token = generateToken(newUser);

      // 返回用户信息和令牌（不包含密码）
      const { password_hash, ...userInfo } = newUser;

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: userInfo,
          token,
          expires_in: process.env.JWT_EXPIRES_IN || '24h',
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // 获取当前用户信息
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw createError('用户未认证', 401);
      }

      // 获取最新的用户信息
      const user = await userService.getUserById(req.user.id);
      
      // 返回用户信息（不包含密码）
      const { password_hash, ...userInfo } = user;

      res.json({
        success: true,
        data: {
          user: userInfo,
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // 修改密码
  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw createError('用户未认证', 401);
      }

      const { currentPassword, newPassword } = req.body;

      // 验证输入
      if (!currentPassword || !newPassword) {
        throw createError('当前密码和新密码不能为空', 400);
      }

      if (newPassword.length < 6) {
        throw createError('新密码长度不能少于6位', 400);
      }

      // 获取用户信息
      const user = await userService.getUserById(req.user.id);

      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw createError('当前密码错误', 400);
      }

      // 加密新密码
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // 更新密码
      await userService.updateUser(req.user.id, {
        password_hash: newPasswordHash,
      });

      res.json({
        success: true,
        message: '密码修改成功',
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // 刷新令牌
  async refreshToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw createError('用户未认证', 401);
      }

      // 生成新的JWT令牌
      const token = generateToken(req.user);

      res.json({
        success: true,
        message: '令牌刷新成功',
        data: {
          token,
          expires_in: process.env.JWT_EXPIRES_IN || '24h',
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // 用户登出（客户端处理）
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      // JWT是无状态的，服务端无需处理登出
      // 客户端应该删除存储的令牌
      res.json({
        success: true,
        message: '登出成功',
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // 验证令牌有效性
  async validateToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw createError('令牌无效', 401);
      }

      res.json({
        success: true,
        message: '令牌有效',
        data: {
          user: req.user,
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // 重置密码请求（实际项目中需要邮件服务）
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw createError('邮箱不能为空', 400);
      }

      // 查找用户
      const user = await userService.getUserByCredentials('', email);
      
      if (!user) {
        // 出于安全考虑，即使用户不存在也返回成功消息
        res.json({
          success: true,
          message: '如果该邮箱存在，重置链接已发送',
        });
        return;
      }

      // TODO: 在实际项目中，这里应该：
      // 1. 生成重置令牌
      // 2. 存储到数据库（带过期时间）
      // 3. 发送邮件给用户

      res.json({
        success: true,
        message: '如果该邮箱存在，重置链接已发送',
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const authController = new AuthController(); 