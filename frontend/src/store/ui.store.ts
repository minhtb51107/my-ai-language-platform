import { create } from 'zustand';
import { chatService } from '@/features/chat/services/chat.service';

interface UiState {
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  selectedModel: string;
  
  // Trạng thái cho Settings Modal
  isSettingsOpen: boolean;
  preferences: any;
  isLoadingPreferences: boolean;
  
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setModel: (model: string) => void;
  initTheme: () => void;
  
  // Actions cho Settings
  setSettingsOpen: (isOpen: boolean) => void;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (data: any) => Promise<void>;
}

export const useUiStore = create<UiState>((set, get) => ({
  isDarkMode: false,
  isSidebarOpen: true,
  selectedModel: 'gpt-4o-mini',
  isSettingsOpen: false,
  preferences: null,
  isLoadingPreferences: false,

  toggleDarkMode: () => {
    const newMode = !get().isDarkMode;
    set({ isDarkMode: newMode });
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  },

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setModel: (model) => set({ selectedModel: model }),
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

  fetchPreferences: async () => {
    set({ isLoadingPreferences: true });
    try {
      const res = await chatService.getPreferences();
      set({ preferences: res.data || res });
    } catch (error) {
      console.error("Lỗi tải cấu hình:", error);
    } finally {
      set({ isLoadingPreferences: false });
    }
  },

  updatePreferences: async (data) => {
    try {
      const res = await chatService.updatePreferences(data);
      set({ preferences: res.data || res });
    } catch (error) {
      console.error("Lỗi cập nhật cấu hình:", error);
      alert("Có lỗi xảy ra khi lưu cấu hình.");
    }
  },

  initTheme: () => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    set({ isDarkMode: isDark });
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
}));