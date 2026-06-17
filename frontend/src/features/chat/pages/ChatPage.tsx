import { useState, useEffect, useRef } from 'react';
import { Bot, Loader2, ChevronDown, Copy, ThumbsUp, ThumbsDown, RotateCw, Check, Volume2, Square, FileText, Edit2, Sparkles, Send, AlertCircle } from 'lucide-react';
// IMPORT STORE MỚI
import { useChatMessageStore } from '@/features/chat/store/chat-message.store';
import { useChatSessionStore } from '@/features/chat/store/chat-session.store';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import MarkdownBlock from '@/features/chat/components/MarkdownBlock';
import InputArea from '@/features/chat/components/InputArea';
import { useSpeech } from '@/features/chat/hooks/useSpeech';

export default function ChatPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuthStore();
  const { selectedModel } = useUiStore();
  
  // TÁCH STORE NHƯ KIẾN TRÚC MỚI
  const { currentSessionId } = useChatSessionStore();
  const { 
    messages, connectSocket, disconnectSocket, isConnected,
    isLoadingMessages, rateMessage, branchAndResend, fetchMessagesForSession 
  } = useChatMessageStore();

  const { speakingId, handleSpeak, stopSpeaking } = useSpeech(() => {});

  // Kết nối socket khi mount
  useEffect(() => {
    connectSocket();
    return () => { disconnectSocket(); stopSpeaking(); };
  }, [connectSocket, disconnectSocket]);

  // Load tin nhắn khi session thay đổi (Logic của kiến trúc mới)
  useEffect(() => {
    if (currentSessionId) fetchMessagesForSession(currentSessionId);
  }, [currentSessionId, fetchMessagesForSession]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleCopy = (id: string, text: string) => { 
    navigator.clipboard.writeText(text); 
    setCopiedId(id); 
    setTimeout(() => setCopiedId(null), 2000); 
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950 relative">
      {/* Nút hiển thị trạng thái mất kết nối (bổ sung an toàn) */}
      {!isConnected && currentSessionId && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md z-10 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" /> Mất kết nối tới máy chủ
        </div>
      )}

      <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-3 z-20">
        <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          <span>{selectedModel === 'gpt-4o-mini' ? 'GPT-4o Mini' : 'Claude 3.5 Sonnet'}</span><ChevronDown className="h-4 w-4 text-zinc-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth scrollbar-thin mt-8">
        {!currentSessionId ? (
          <div className="flex h-full flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"><Sparkles className="h-8 w-8 text-white" /></div>
            <h2 className="text-2xl font-bold dark:text-white">Xin chào, {user?.fullname}!</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md">Hãy chọn một đoạn chat bên trái hoặc tạo mới để bắt đầu.</p>
          </div>
        ) : isLoadingMessages ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-zinc-400 italic text-sm">
            <Bot className="h-10 w-10 mb-4 opacity-50" /> Bắt đầu cuộc trò chuyện với MindRevol AI...
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 pb-4">
            {messages.map((msg, index) => (
              <div key={msg.id || index} className={`flex gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group w-full`}>
                {msg.sender === 'ai' && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm"><Sparkles className="h-4 w-4 text-white" /></div>
                )}

                <div className={`flex flex-col max-w-[85%] sm:max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'} overflow-hidden`}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 justify-end">
                      {msg.attachments.map((att, idx) => (
                        att.type.startsWith('image/') ? <img key={idx} src={att.url} className="max-w-[240px] max-h-[240px] object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm" />
                        : <div key={idx} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"><FileText className="h-5 w-5 text-blue-500" /><span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 max-w-[150px] truncate">{att.name}</span></div>
                      ))}
                    </div>
                  )}

                  <div className={`px-5 py-4 w-full ${msg.sender === 'user' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-[1.5rem] rounded-br-md shadow-sm text-[15px]' : 'bg-transparent text-zinc-800 dark:text-zinc-200'}`}>
                    {msg.status && <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2 animate-pulse flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> {msg.status}</div>}
                    
                    {editingMsgId === msg.id && msg.sender === 'user' ? (
                      <div className="w-full space-y-3 min-w-[300px]">
                        <textarea autoFocus value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-3 bg-white dark:bg-zinc-900 border border-blue-500 rounded-xl text-sm outline-none text-zinc-800 dark:text-zinc-200 resize-none shadow-inner" rows={3} />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingMsgId(null)} className="px-3 py-1.5 text-xs font-medium bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">Hủy</button>
                          <button onClick={() => { branchAndResend(msg.id, editContent); setEditingMsgId(null); }} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"><Send className="h-3 w-3" /> Gửi & Tạo lại</button>
                        </div>
                      </div>
                    ) : msg.sender === 'ai' ? (
                      <div className="min-w-0 break-words"><MarkdownBlock content={msg.text + (msg.isTyping ? ' ▍' : '')} sources={msg.sources} /></div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed font-normal">{msg.text}</p>
                    )}
                  </div>

                  {msg.sender === 'ai' && !msg.isTyping && (
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleSpeak(msg.id, msg.text)} className={`p-1.5 rounded-md transition-colors ${speakingId === msg.id ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`} title="Đọc văn bản">{speakingId === msg.id ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}</button>
                      <button onClick={() => handleCopy(msg.id, msg.text)} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Copy">{copiedId === msg.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</button>
                      <button onClick={() => rateMessage(msg.id, 'like')} className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${msg.rating === 'like' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' : 'text-zinc-400 hover:text-green-600'}`}><ThumbsUp className="h-4 w-4" /></button>
                      <button onClick={() => rateMessage(msg.id, 'dislike')} className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${msg.rating === 'dislike' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' : 'text-zinc-400 hover:text-red-600'}`}><ThumbsDown className="h-4 w-4" /></button>
                      <button className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-2 flex items-center gap-1 text-xs font-medium"><RotateCw className="h-3.5 w-3.5" /> Tạo lại</button>
                    </div>
                  )}

                  {msg.sender === 'user' && !editingMsgId && (
                    <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingMsgId(msg.id); setEditContent(msg.text); }} className="p-1 text-zinc-400 hover:text-blue-500 rounded-md bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700" title="Chỉnh sửa và Rẽ nhánh"><Edit2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1 uppercase text-zinc-600 dark:text-zinc-300">{user?.fullname?.charAt(0) || 'U'}</div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <InputArea />
      
    </div>
  );
}