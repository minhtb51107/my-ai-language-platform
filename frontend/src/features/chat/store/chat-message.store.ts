import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { throttle } from 'lodash';
import { chatService } from '@/features/chat/services/chat.service';
import { useChatSessionStore } from './chat-session.store'; // Lấy SessionID hiện tại

export interface Attachment { url: string; name: string; type: string; }
export interface Message {
  id: string; text: string; sender: 'user' | 'ai'; timestamp: Date | string;
  isTyping?: boolean; status?: string | null; rating?: 'like' | 'dislike' | null; 
  attachments?: Attachment[]; sources?: any[]; 
}

interface ChatMessageState {
  socket: Socket | null; 
  isConnected: boolean; 
  messages: Message[];
  isLoadingMessages: boolean;
  pendingAttachments: Attachment[]; 
  isUploading: boolean;

  fetchMessagesForSession: (sessionId: string) => Promise<void>;
  clearMessages: () => void;
  uploadFile: (file: File) => Promise<void>;
  removePendingAttachment: (index: number) => void;
  rateMessage: (messageId: string, rating: 'like' | 'dislike') => Promise<void>;
  branchAndResend: (messageId: string, newContent: string) => Promise<void>;
  
  connectSocket: () => void;
  disconnectSocket: () => void;
  sendMessage: (text: string) => void;
  addMessage: (msg: Message) => void;
  updateAiMessage: (chunk: string) => void;
  setAiStatus: (status: string | null) => void;
}

export const useChatMessageStore = create<ChatMessageState>((set, get) => {
  // BỘ ĐỆM (BUFFER) GIỮ NGUYÊN LOGIC CỦA BẠN
  let chunkBuffer = '';
  
  const flushChunkBuffer = throttle(() => {
    if (!chunkBuffer) return;
    const textToAppend = chunkBuffer;
    chunkBuffer = ''; 
    
    set((state) => {
      const msgs = [...state.messages];
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.sender === 'ai' && lastMsg.isTyping) {
        lastMsg.text += textToAppend;
      }
      return { messages: msgs };
    });
  }, 50, { leading: true, trailing: true });

  return {
    socket: null, isConnected: false, messages: [],
    isLoadingMessages: false, pendingAttachments: [], isUploading: false,

    fetchMessagesForSession: async (sessionId: string) => {
      set({ isLoadingMessages: true, messages: [], pendingAttachments: [] });
      try {
        const res = await chatService.getMessagesBySession(sessionId);
        const history = (res.data || res || []).map((m: any) => ({
          id: m.id, text: m.content || '', sender: m.role === 'user' ? 'user' : 'ai',
          timestamp: m.createdAt || m.created_at, rating: m.rating || null,
          attachments: m.attachments || [], sources: m.analysisResult?.sources || m.sources || []
        }));
        set({ messages: history });
      } catch (error) { console.error(error); } finally { set({ isLoadingMessages: false }); }
    },

    clearMessages: () => set({ messages: [], pendingAttachments: [] }),

    uploadFile: async (file: File) => {
      const sessionId = useChatSessionStore.getState().currentSessionId; 
      if (!sessionId) return;
      set({ isUploading: true });
      try {
        const response = await chatService.uploadFile(sessionId, file);
        const attachment: Attachment = { url: response.url || '', name: response.name || file.name, type: response.type || file.type };
        set((state) => ({ pendingAttachments: [...state.pendingAttachments, attachment] }));
      } catch (error) { console.error("Lỗi upload:", error); } finally { set({ isUploading: false }); }
    },

    removePendingAttachment: (index: number) => set((state) => ({ pendingAttachments: state.pendingAttachments.filter((_, i) => i !== index) })),
    
    rateMessage: async (messageId, rating) => { 
      const sessionId = useChatSessionStore.getState().currentSessionId; 
      if (!sessionId) return; 
      try { 
        await chatService.rateMessage(sessionId, messageId, rating); 
        set((state) => ({ messages: state.messages.map(m => m.id === messageId ? { ...m, rating } : m) })); 
      } catch (error) { console.error(error); } 
    },
    
    branchAndResend: async (messageId, newContent) => {
      const sessionId = useChatSessionStore.getState().currentSessionId;
      const { sendMessage, socket } = get(); 
      if (!sessionId || !socket) return;
      try {
        await chatService.truncateHistory(sessionId, messageId);
        set((state) => {
          const msgIndex = state.messages.findIndex(m => m.id === messageId);
          if (msgIndex === -1) return state;
          return { messages: state.messages.slice(0, msgIndex) }; 
        });
        sendMessage(newContent);
      } catch (error) { console.error("Lỗi khi rẽ nhánh chat:", error); }
    },

    connectSocket: () => {
      const token = localStorage.getItem('access_token'); if (!token || get().socket) return;
      const newSocket = io('http://localhost:3000/api/v1/chat-stream', { auth: { token }, transports: ['websocket'] });
      
      newSocket.on('connect', () => set({ isConnected: true }));
      newSocket.on('disconnect', () => set({ isConnected: false }));
      
      newSocket.on('aiTyping', (data: any) => {
        if (data.sessionId !== useChatSessionStore.getState().currentSessionId) return;
        if (data.isTyping) get().addMessage({ id: 'temp-ai-msg', text: '', sender: 'ai', timestamp: new Date(), isTyping: true, status: 'Đang xử lý...' });
      });
      
      newSocket.on('agentStatus', (data: any) => {
        if (data.sessionId === useChatSessionStore.getState().currentSessionId) get().setAiStatus(data.status);
      });
      
      newSocket.on('messageChunk', (data: any) => {
        if (data.sessionId === useChatSessionStore.getState().currentSessionId) get().updateAiMessage(data.chunk);
      });
      
      newSocket.on('messageComplete', (data: any) => {
        if (data.sessionId !== useChatSessionStore.getState().currentSessionId) return;
        
        chunkBuffer = '';
        flushChunkBuffer.cancel();

        set((state) => {
          const msgs = [...state.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.sender === 'ai' && lastMsg.id === 'temp-ai-msg') {
            lastMsg.id = data.messageId || Date.now().toString(); 
            lastMsg.isTyping = false; lastMsg.text = data.fullMessage; lastMsg.sources = data.sources || []; 
          }
          return { messages: msgs };
        });
      });
      set({ socket: newSocket });
    },

    disconnectSocket: () => { const { socket } = get(); if (socket) { socket.disconnect(); set({ socket: null, isConnected: false }); } },
    
    sendMessage: (text: string) => {
      const sessionId = useChatSessionStore.getState().currentSessionId;
      const { socket, pendingAttachments } = get();
      if (!socket || (!text.trim() && pendingAttachments.length === 0) || !sessionId) return;
      
      const attachmentsToSend = [...pendingAttachments];
      get().addMessage({ id: Date.now().toString(), text, sender: 'user', timestamp: new Date(), attachments: attachmentsToSend });
      
      // Emit socket event
      socket.emit('sendMessage', { sessionId: sessionId, message: text, attachments: attachmentsToSend });
      set({ pendingAttachments: [] });
    },
    
    addMessage: (msg: Message) => set((state) => ({ messages: [...state.messages, msg] })),
    
    updateAiMessage: (chunk: string) => {
      chunkBuffer += chunk;
      flushChunkBuffer();
    },

    setAiStatus: (status: string | null) => set((state) => {
      const msgs = [...state.messages];
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.sender === 'ai' && lastMsg.isTyping) lastMsg.status = status;
      return { messages: msgs };
    })
  };
});