import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ChatUIState {
  isSidebarOpen: boolean;
  isKnowledgeBaseOpen: boolean;
  isSettingsOpen: boolean;
  
  toggleSidebar: () => void;
  setKnowledgeBaseOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
}

export const useChatUIStore = create<ChatUIState>()(
  devtools(
    persist(
      (set) => ({
        isSidebarOpen: true,
        isKnowledgeBaseOpen: false,
        isSettingsOpen: false,

        toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        setKnowledgeBaseOpen: (isOpen) => set({ isKnowledgeBaseOpen: isOpen }),
        setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
      }),
      { name: 'chat-ui-storage', partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen }) }
    ),
    { name: 'ChatUIStore' }
  )
);