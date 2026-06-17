import React, { useState, useRef, useEffect } from 'react';
import type { DragEvent } from 'react'; // ✅ SỬA LỖI 1: Tách riêng import type
import { Send, Paperclip, Mic, Square, X, FileText, Loader2, Zap } from 'lucide-react';
import { useChatMessageStore } from '@/features/chat/store/chat-message.store';
import { useChatSessionStore } from '@/features/chat/store/chat-session.store';
import { useSpeech } from '@/features/chat/hooks/useSpeech';

export default function InputArea() {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentSessionId } = useChatSessionStore();
  
  // ✅ SỬA LỖI 2: Dùng `as any` tạm thời hoặc set giá trị mặc định nếu bạn chưa kịp thêm vào store
  const { 
    messages, sendMessage, disconnectSocket, connectSocket,
    uploadFile, isUploading, pendingAttachments, removePendingAttachment,
    currentTokens = 0, maxTokensLimit = 8192
  } = useChatMessageStore() as any; 

  const { isListening, handleMicClick } = useSpeech(setInput);
  const isAiTyping = messages.length > 0 && messages[messages.length - 1].isTyping;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && pendingAttachments.length === 0) || !currentSessionId || isAiTyping) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleStopGenerating = () => { disconnectSocket(); setTimeout(() => connectSocket(), 500); };
  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) await uploadFile(files[i]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- XỬ LÝ KÉO THẢ FILE ---
  const onDragOver = (e: DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentSessionId) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = async (e: DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!currentSessionId) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      for (let i = 0; i < files.length; i++) await uploadFile(files[i]);
    }
  };

  // Tính màu Token
  const tokenPercentage = (currentTokens / maxTokensLimit) * 100;
  const tokenColor = tokenPercentage > 95 ? "text-red-500" : tokenPercentage > 80 ? "text-orange-500" : "text-zinc-400";

  return (
    <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 sticky bottom-0">
      <div className="max-w-3xl mx-auto relative">
        <form 
          onSubmit={handleSend} 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:shadow-[0_0_15px_rgba(0,0,0,0.2)] border rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden transition-all ${
            !currentSessionId ? 'border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed' 
            : isDragging ? 'border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
            : 'border-zinc-300 dark:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600'
          }`}
        >
          {/* OVERLAY KHI KÉO THẢ */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-50/90 dark:bg-blue-900/30 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400">
              <Paperclip className="h-8 w-8 mb-2 animate-bounce" />
              <span className="font-medium text-sm">Thả tài liệu vào đây để phân tích</span>
            </div>
          )}
          
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-4 pb-1">
              {/* ✅ SỬA Ở ĐÂY: Thêm :any cho file và :number cho idx */}
              {pendingAttachments.map((file: any, idx: number) => (
                <div key={idx} className="relative flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-2 border border-zinc-200 dark:border-zinc-700 pr-8">
                  {file.type.startsWith('image/') ? <img src={file.url} className="w-10 h-10 object-cover rounded-lg" /> : <div className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>}
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">{file.name}</span>
                  <button type="button" onClick={() => removePendingAttachment(idx)} className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors shadow-sm"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {isUploading && <div className="flex items-center justify-center w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-300"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>}
            </div>
          )}

          <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} disabled={!currentSessionId} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={currentSessionId ? "Nhắn tin cho MindRevol AI... (Kéo thả file vào đây)" : "Vui lòng chọn một đoạn chat..."} className={`w-full max-h-40 resize-none bg-transparent px-4 pb-2 focus:outline-none text-[15px] disabled:cursor-not-allowed dark:text-zinc-100 placeholder:text-zinc-500 scrollbar-thin ${pendingAttachments.length > 0 ? 'pt-2 min-h-[40px]' : 'pt-4 min-h-[60px]'}`} rows={1} />
          
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1">
              <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={triggerFileSelect} disabled={!currentSessionId || isUploading} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50" title="Đính kèm tệp"><Paperclip className="h-5 w-5" /></button>
              <button type="button" disabled={!currentSessionId} onClick={handleMicClick} className={`p-2 rounded-lg transition-all disabled:opacity-50 ${isListening ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`} title="Sử dụng Micro"><Mic className="h-5 w-5" /></button>
            </div>

            {isAiTyping ? (
              <button type="button" onClick={handleStopGenerating} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-colors shadow-sm text-sm font-medium"><Square className="h-4 w-4 fill-current" /> Dừng</button>
            ) : (
              <button type="submit" disabled={(!input.trim() && pendingAttachments.length === 0) || !currentSessionId || isUploading} className="p-2 rounded-xl bg-black dark:bg-white text-white dark:text-black disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 transition-colors shadow-sm"><Send className="h-5 w-5" /></button>
            )}
          </div>
        </form>

        {/* COMPONENT THƯỚC ĐO TOKEN */}
        {currentSessionId && (
          <div className="absolute -bottom-5 right-2 flex items-center gap-1.5 text-[10px] font-medium tracking-wide">
            <Zap className={`w-3 h-3 ${currentTokens > 0 ? 'text-amber-500' : 'text-zinc-400'}`} />
            <span className={`${tokenColor}`}>
              Ngữ cảnh: {currentTokens.toLocaleString()} / {maxTokensLimit.toLocaleString()} tokens
            </span>
          </div>
        )}

      </div>
    </div>
  );
}