import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase, TABLES } from '../config/database';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    full_name?: string;
  };
}

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// JWT认证中间件
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw createError('访问令牌缺失', 401);
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw createError('JWT密钥未配置', 500);
    }

    // 验证JWT令牌
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // 从数据库获取最新用户信息
    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .select('id, username, email, role, full_name, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      throw createError('用户不存在', 401);
    }

    if (!user.is_active) {
      throw createError('用户账户已被禁用', 401);
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期',
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: '认证失败',
    });
  }
};

// 角色授权中间件
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw createError('用户未认证', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw createError('权限不足', 403);
      }

      next();
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  };
};

// 管理员权限中间件
export const requireAdmin = requireRole(['admin']);

// 网格员或管理员权限中间件
export const requireGridWorkerOrAdmin = requireRole(['grid_worker', 'admin']);

// 可选认证中间件（不强制要求登录）
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
          
          // 从数据库获取用户信息
          const { data: user, error } = await supabase
            .from(TABLES.USERS)
            .select('id, username, email, role, full_name, is_active')
            .eq('id', decoded.userId)
            .single();

          if (!error && user && user.is_active) {
            req.user = {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              full_name: user.full_name,
            };
          }
        } catch (error) {
          // 忽略JWT验证错误，继续处理请求
        }
      }
    }

    next();
  } catch (error) {
    // 可选认证中不抛出错误
    next();
  }
};

// 生成JWT令牌
export const generateToken = (user: any): string => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  if (!JWT_SECRET) {
    throw createError('JWT密钥未配置', 500);
  }

  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// 验证用户是否有权访问特定资源
export const checkResourceOwnership = (resourceUserId: string, currentUserId: string, currentUserRole: string): boolean => {
  // 管理员可以访问所有资源
  if (currentUserRole === 'admin') {
    return true;
  }

  // 用户只能访问自己的资源
  return resourceUserId === currentUserId;
};

// 用户自己或管理员权限中间件工厂
export const requireOwnershipOrAdmin = (getUserIdFromParams: (req: Request) => string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw createError('用户未认证', 401);
      }

      const resourceUserId = getUserIdFromParams(req);
      
      if (!checkResourceOwnership(resourceUserId, req.user.id, req.user.role)) {
        throw createError('权限不足，只能访问自己的资源', 403);
      }

      next();
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  };
};

// 刷新令牌中间件
export const refreshToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('用户未认证', 401);
    }

    // 生成新的令牌
    const newToken = generateToken(req.user);
    
    // 将新令牌添加到响应头
    res.setHeader('X-New-Token', newToken);
    
    next();
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
}; 