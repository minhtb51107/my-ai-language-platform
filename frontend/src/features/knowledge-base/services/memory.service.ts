import { apiClient } from '@/core/api/api.client'; // Nhớ di chuyển api.client.ts vào thư mục core/api/

export const memoryService = {
  getDocuments: async () => apiClient.get('/memory/documents').then(r => r.data),
  deleteDocument: async (sourceName: string) => 
    apiClient.delete(`/memory/documents/${encodeURIComponent(sourceName)}`).then(r => r.data),
};