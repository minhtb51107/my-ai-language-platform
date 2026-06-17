import React, { useEffect, useState } from 'react';
import { X, Database, FileText, Trash2, Loader2, Calendar } from 'lucide-react';
import { memoryService } from '@/features/chat/services/chat.service';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KnowledgeBaseModal({ isOpen, onClose }: KnowledgeBaseModalProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const res = await memoryService.getDocuments();
      setDocuments(res.data || []);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchDocs();
  }, [isOpen]);

  const handleDelete = async (sourceName: string) => {
    if (!window.confirm(`Xóa tài liệu "${sourceName}" khỏi bộ nhớ AI?`)) return;
    try {
      await memoryService.deleteDocument(sourceName);
      setDocuments(docs => docs.filter(d => d.name !== sourceName));
    } catch (e) { console.error(e); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="text-lg font-bold flex items-center gap-2 dark:text-white">
            <Database className="h-5 w-5 text-blue-500" />
            Kho tài liệu RAG
          </h3>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Các tài liệu dưới đây đã được băm nhỏ (chunking) và vector hóa. AI sẽ dùng chúng để tìm kiếm ngữ cảnh trích dẫn.</p>
          
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              <Database className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Kho tài liệu đang trống.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm truncate dark:text-zinc-200">{doc.name}</span>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                        <span className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full">{doc.chunkCount} chunks</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(doc.name)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors ml-2" title="Xóa tài liệu">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}