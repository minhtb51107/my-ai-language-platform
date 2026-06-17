import { create } from 'zustand';
import { apiClient } from '@/core/api/api.client';

export interface User {
  id: string;
  email: string;
  fullname: string;
  avatarUrl?: string;
  roles?: any[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (token: string, user: User) => void;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token') && localStorage.getItem('access_token') !== 'undefined',
  isLoading: true,

  login: (token, user) => {
    console.log('[🔑 AUTH] Đang lưu Token:', token);
    localStorage.setItem('access_token', token);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    console.log('[🚪 AUTH] User đăng xuất');
    localStorage.removeItem('access_token');
    set({ user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      console.log('[🔄 AUTH] Bắt đầu lấy Profile (F5)...');
      set({ isLoading: true });

      const token = localStorage.getItem('access_token');
      if (!token || token === 'undefined') {
         console.warn('[⚠️ AUTH] Token bị rỗng hoặc lỗi chữ "undefined" -> Hủy lấy profile');
         throw new Error('Token không hợp lệ');
      }

      // Gọi API sang NestJS
      const res = await apiClient.get('/users/me'); 
      console.log('[🎉 AUTH] Lấy Profile thành công:', res.data);
      
      // Đề phòng NestJS bọc data trong res.data.data hoặc trả thẳng res.data
      const userData = res.data?.data || res.data;
      
      set({ user: userData, isAuthenticated: true });
    } catch (error) {
      console.error('[💥 AUTH] Lỗi fetchProfile -> Ép văng ra Login!', error);
      localStorage.removeItem('access_token');
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));