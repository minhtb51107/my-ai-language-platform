import { create } from 'zustand';
import { chatService } from '@/features/chat/services/chat.service';
import { useChatMessageStore } from './/chat-message.store'; // Import chéo để trigger load tin nhắn

export interface ChatSession {
  id: string; 
  title: string; 
  targetLanguage?: string; 
  updatedAt?: string; 
  created_at?: string; 
  isPinned?: boolean;
}

interface ChatSessionState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoadingSessions: boolean;

  fetchSessions: () => Promise<void>;
  createNewSession: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  togglePin: (sessionId: string, isPinned: boolean) => Promise<void>;
  shareSession: (sessionId: string) => Promise<string | null>;
}

export const useChatSessionStore = create<ChatSessionState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  isLoadingSessions: false,

  fetchSessions: async () => { 
    set({ isLoadingSessions: true }); 
    try { 
      const res = await chatService.getSessions(); 
      set({ sessions: res.data || res || [] }); 
    } catch (error) {
      console.error(error);
    } finally { 
      set({ isLoadingSessions: false }); 
    } 
  },

  createNewSession: async () => { 
    try { 
      const res = await chatService.createSession('Hội thoại mới'); 
      const newSession = res.data || res; 
      set((state) => ({ sessions: [newSession, ...state.sessions] })); 
      get().selectSession(newSession.id); 
    } catch (e) {
      console.error(e);
    } 
  },
  
  selectSession: async (sessionId: string) => {
    set({ currentSessionId: sessionId });
    // Trigger sang Message Store để load lịch sử tin nhắn của session này
    await useChatMessageStore.getState().fetchMessagesForSession(sessionId);
  },

  renameSession: async (sessionId, newTitle) => { 
    try { 
      await chatService.renameSession(sessionId, newTitle); 
      set((state) => ({ 
        sessions: state.sessions.map(s => s.id === sessionId ? { ...s, title: newTitle } : s) 
      })); 
    } catch (error) { console.error(error); } 
  },

  deleteSession: async (sessionId) => { 
    try { 
      await chatService.deleteSession(sessionId); 
      set((state) => {
        const isActive = state.currentSessionId === sessionId;
        if (isActive) useChatMessageStore.getState().clearMessages(); // Dọn dẹp tin nhắn nếu đang mở
        return {
          sessions: state.sessions.filter(s => s.id !== sessionId), 
          currentSessionId: isActive ? null : state.currentSessionId, 
        };
      }); 
    } catch (error) { console.error(error); } 
  },

  togglePin: async (sessionId, isPinned) => { 
    try { 
      await chatService.togglePin(sessionId, isPinned); 
      set((state) => ({ sessions: state.sessions.map(s => s.id === sessionId ? { ...s, isPinned } : s) })); 
    } catch (error) { console.error(error); } 
  },

  shareSession: async (sessionId) => { 
    try { 
      const res = await chatService.shareSession(sessionId); 
      return res.data?.shareToken || null; 
    } catch (error) { return null; } 
  },
}));