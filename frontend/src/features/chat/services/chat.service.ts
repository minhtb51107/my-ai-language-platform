import { apiClient } from '../../../core/api/api.client';

export const chatService = {
  getSessions: async () => apiClient.get('/chats').then(r => r.data),
  createSession: async (title: string, targetLanguage: string = 'English') => 
    apiClient.post('/chats', { title, targetLanguage }).then(r => r.data),
  getMessagesBySession: async (sessionId: string) => 
    apiClient.get(`/chats/${sessionId}/messages`).then(r => r.data),
  
  renameSession: async (sessionId: string, title: string) => 
    apiClient.patch(`/chats/${sessionId}`, { title }).then(r => r.data),
  deleteSession: async (sessionId: string) => 
    apiClient.delete(`/chats/${sessionId}`).then(r => r.data),
  rateMessage: async (sessionId: string, messageId: string, rating: 'like' | 'dislike') => 
    apiClient.post(`/chats/${sessionId}/messages/${messageId}/rate`, { rating }).then(r => r.data),

  // Upload File thật lên Backend NestJS
  uploadFile: async (sessionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/chats/${sessionId}/files/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // API Cấu hình cá nhân hóa (Settings)
  getPreferences: async () => apiClient.get('/chats/user/preferences').then(r => r.data),
  updatePreferences: async (data: any) => apiClient.patch('/chats/user/preferences', data).then(r => r.data),

  // API Rẽ nhánh cuộc trò chuyện (Truncate lịch sử cũ)
  truncateHistory: async (sessionId: string, messageId: string) => 
    apiClient.delete(`/chats/${sessionId}/messages/${messageId}/truncate`).then(r => r.data),

  // API Nối dây tính năng Ghim & Chia sẻ công khai
  togglePin: async (sessionId: string, isPinned: boolean) => 
    apiClient.patch(`/chats/${sessionId}/pin`, { isPinned }).then(r => r.data),
  shareSession: async (sessionId: string) => 
    apiClient.post(`/chats/${sessionId}/share`).then(r => r.data),
};

export const memoryService = {
  getDocuments: async () => apiClient.get('/memory/documents').then(r => r.data),
  deleteDocument: async (sourceName: string) => 
    apiClient.delete(`/memory/documents/${encodeURIComponent(sourceName)}`).then(r => r.data),
};