import { useEffect, useState, useRef, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from "@/features/auth/store/auth.store";
// IMPORT TỪ STORE MỚI TÁCH
import type { ChatSession } from '@/features/chat/store/chat-session.store';
import { useUiStore } from '@/store/ui.store';
import SettingsModal from '@/features/chat/components/SettingsModal';
import KnowledgeBaseModal from '@/features/chat/components/KnowledgeBaseModal'; 
import { useChatSessionStore } from '@/features/chat/store/chat-session.store';
import { 
  LogOut, MessageSquare, Plus, Sparkles, Loader2, 
  PanelLeftClose, PanelLeftOpen, Search, Moon, Sun, 
  MoreHorizontal, Pin, Edit2, Trash2, Check, X, Share2, Settings, Database
} from 'lucide-react';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  
  // Layout này CHỈ ĐĂNG KÝ (subscribe) vào Session Store. Do đó khi Socket stream tin nhắn mới, 
  // MainLayout sẽ KHÔNG bị re-render. Rất tối ưu!
  const { 
    sessions, currentSessionId, fetchSessions, createNewSession, 
    selectSession, renameSession, deleteSession, isLoadingSessions,
    togglePin, shareSession 
  } = useChatSessionStore();
  
  const { isDarkMode, isSidebarOpen, toggleDarkMode, toggleSidebar, initTheme, setSettingsOpen } = useUiStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isKBOpen, setIsKBOpen] = useState(false); 
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { initTheme(); fetchSessions(); }, [initTheme, fetchSessions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setActiveMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // SỬ DỤNG USEMEMO để thuật toán group chỉ chạy lại khi sessions thật sự thay đổi
  const grouped = useMemo(() => {
    const filtered = sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const groups: { [key: string]: ChatSession[] } = {
      'Đã ghim': [], 'Hôm nay': [], 'Hôm qua': [], '7 ngày trước': [], 'Cũ hơn': []
    };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    filtered.forEach(session => {
      if (session.isPinned) { groups['Đã ghim'].push(session); return; }
      const updatedAt = new Date(session.updatedAt || session.created_at || Date.now());
      if (updatedAt >= today) groups['Hôm nay'].push(session);
      else if (updatedAt >= yesterday) groups['Hôm qua'].push(session);
      else if (updatedAt >= sevenDaysAgo) groups['7 ngày trước'].push(session);
      else groups['Cũ hơn'].push(session);
    });
    return groups;
  }, [sessions, searchQuery]);

  const handleStartEdit = (session: ChatSession, e: React.MouseEvent) => { e.stopPropagation(); setEditingId(session.id); setEditTitle(session.title); setActiveMenuId(null); };
  const handleSaveEdit = async (e?: React.MouseEvent | React.FormEvent) => { if (e) e.stopPropagation(); if (editingId && editTitle.trim()) await renameSession(editingId, editTitle); setEditingId(null); };
  const handleDelete = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); if (window.confirm('Bạn có chắc chắn muốn xóa đoạn chat này không?')) await deleteSession(id); setActiveMenuId(null); };
  const handleToggleMenu = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setActiveMenuId(activeMenuId === id ? null : id); };
  
  const handlePin = async (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePin(session.id, !session.isPinned);
    setActiveMenuId(null);
  };

  const handleShare = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = await shareSession(id);
    if (token) {
      const shareUrl = `${window.location.origin}/share/${token}`;
      navigator.clipboard.writeText(shareUrl);
      alert('Đã copy liên kết chia sẻ công khai vào bộ nhớ tạm:\n' + shareUrl);
    }
    setActiveMenuId(null);
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-zinc-950 overflow-hidden text-zinc-800 dark:text-zinc-200 transition-colors duration-200">
      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0 opacity-0'} flex flex-col bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800/80 transition-all duration-300 ease-in-out md:flex flex-shrink-0 z-20 absolute md:relative h-full`}>
        <div className="p-3">
          <button onClick={createNewSession} className="flex w-full items-center justify-between gap-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-sm">
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" /> Chat mới</span><Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input type="text" placeholder="Tìm kiếm..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-200/50 dark:bg-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow placeholder:text-zinc-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-4 scrollbar-thin">
          {isLoadingSessions ? (
            <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
          ) : Object.keys(grouped).every(k => grouped[k].length === 0) ? (
            <div className="text-sm text-zinc-500 px-2 italic text-center mt-4">Không tìm thấy đoạn chat.</div>
          ) : (
            Object.entries(grouped).map(([groupName, groupSessions]) => (
              groupSessions.length > 0 && (
                <div key={groupName}>
                  <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1 px-2 uppercase tracking-wider">{groupName}</div>
                  <div className="space-y-0.5">
                    {groupSessions.map((session) => (
                      <div key={session.id} className={`group relative flex w-full items-center rounded-lg transition-colors ${currentSessionId === session.id ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}>
                        {editingId === session.id ? (
                          <div className="flex items-center w-full p-1.5 gap-1">
                            <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' ? handleSaveEdit() : e.key === 'Escape' ? setEditingId(null) : null} className="flex-1 bg-white dark:bg-zinc-900 border border-blue-500 rounded px-2 py-1 text-sm outline-none" />
                            <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => selectSession(session.id)} className="flex-1 flex items-center gap-3 p-2.5 text-sm text-left truncate">
                              {session.isPinned ? <Pin className="h-4 w-4 text-blue-500 flex-shrink-0" /> : <MessageSquare className="h-4 w-4 flex-shrink-0" />}
                              <span className="truncate">{session.title || 'Phiên trò chuyện'}</span>
                            </button>
                            <div className="absolute right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => handleToggleMenu(session.id, e)} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-md"><MoreHorizontal className="h-4 w-4" /></button>
                            </div>
                            {activeMenuId === session.id && (
                              <div ref={menuRef} className="absolute right-2 top-8 w-36 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <button onClick={(e) => handlePin(session, e)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"><Pin className="h-3.5 w-3.5" /> {session.isPinned ? 'Bỏ ghim' : 'Ghim'}</button>
                                <button onClick={(e) => handleStartEdit(session, e)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"><Edit2 className="h-3.5 w-3.5" /> Đổi tên</button>
                                <button onClick={(e) => handleShare(session.id, e)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"><Share2 className="h-3.5 w-3.5" /> Chia sẻ</button>
                                <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1"></div>
                                <button onClick={(e) => handleDelete(session.id, e)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Xóa</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))
          )}
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 uppercase shadow-sm">{user?.fullname?.charAt(0) || 'U'}</div>
            <div className="flex flex-col"><span className="text-sm font-medium truncate leading-none">{user?.fullname}</span><span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user?.email}</span></div>
          </div>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-10 md:hidden" onClick={toggleSidebar} />}

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col relative min-w-0">
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
              {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </button>
            <div className="font-semibold text-lg flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 hidden sm:block">MindRevol</span>
              <span className="bg-zinc-100 dark:bg-zinc-800 text-xs px-2 py-1 rounded-md text-zinc-600 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">Beta</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setIsKBOpen(true)} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Kho tài liệu RAG"><Database className="h-5 w-5" /></button>
            <button onClick={() => setSettingsOpen(true)} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Cá nhân hóa AI"><Settings className="h-5 w-5" /></button>
            <button onClick={toggleDarkMode} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">{isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <button onClick={logout} className="p-2 text-zinc-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors rounded-md ml-1" title="Đăng xuất"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>

        <Outlet />
      </div>

      <SettingsModal />
      <KnowledgeBaseModal isOpen={isKBOpen} onClose={() => setIsKBOpen(false)} />
    </div>
  );
}