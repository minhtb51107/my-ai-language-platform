import { apiClient } from '../../../core/api/api.client';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, fullname: string) => {
    const response = await apiClient.post('/auth/register', { email, password, fullname });
    return response.data;
  },

  // SỬA LẠI HÀM NÀY: Khớp với NestJS Controller và Strategy
  googleLogin: async (idToken: string) => {
    // Đổi endpoint thành /auth/social/google
    // Đổi key thành idToken
    const response = await apiClient.post('/auth/social/google', { idToken }); 
    return response.data;
  }
};