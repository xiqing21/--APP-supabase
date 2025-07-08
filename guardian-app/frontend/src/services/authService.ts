import { User } from '../types';
import { apiClient } from './apiClient';

export interface LoginResponse {
  user: User;
  token: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async register(userData: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    employee_id: string;
    role?: 'admin' | 'worker';
  }): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  async refreshToken(): Promise<string> {
    const response = await apiClient.post('/auth/refresh');
    return response.data.token;
  },
}; 