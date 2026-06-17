import React, { useEffect, useState } from 'react';
import { X, Save, Sliders, MessageCircle, BookOpen, Loader2 } from 'lucide-react';
import { useUiStore } from '@/store/ui.store';

export default function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, preferences, fetchPreferences, updatePreferences, isLoadingPreferences } = useUiStore();
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isSettingsOpen) {
      fetchPreferences();
    }
  }, [isSettingsOpen, fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  if (!isSettingsOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await updatePreferences(formData);
    setIsSaving(false);
    setSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-bold flex items-center gap-2 dark:text-white">
            <Sliders className="h-5 w-5 text-blue-500" />
            Cài đặt Cá nhân hóa AI
          </h3>
          <button onClick={() => setSettingsOpen(false)} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {isLoadingPreferences && !formData.id ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <MessageCircle className="h-4 w-4" /> Phong cách giao tiếp
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['formal', 'balanced', 'friendly'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setFormData({ ...formData, communication_style: style })}
                      className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                        formData.communication_style === style 
                          ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500 dark:text-blue-300 ring-1 ring-blue-500' 
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {style === 'formal' ? 'Nghiêm túc' : style === 'friendly' ? 'Thân thiện' : 'Cân bằng'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Sliders className="h-4 w-4" /> Mức độ chi tiết
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['concise', 'balanced', 'detailed'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setFormData({ ...formData, detail_preference: level })}
                      className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                        formData.detail_preference === level 
                          ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-500/20 dark:border-purple-500 dark:text-purple-300 ring-1 ring-purple-500' 
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {level === 'concise' ? 'Ngắn gọn' : level === 'detailed' ? 'Chi tiết' : 'Vừa phải'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <BookOpen className="h-4 w-4" /> Khuyến nghị học tập
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['visual', 'auditory', 'reading'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setFormData({ ...formData, learning_style: style })}
                      className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                        formData.learning_style === style 
                          ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-500/20 dark:border-green-500 dark:text-green-300 ring-1 ring-green-500' 
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {style === 'visual' ? 'Trực quan' : style === 'auditory' ? 'Thính giác' : 'Đọc & Viết'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  MindRevol AI sẽ dựa vào cấu hình này để tối ưu hóa câu trả lời, sử dụng ngôn từ và định dạng phù hợp nhất với bạn.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex justify-end gap-3">
          <button 
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || isLoadingPreferences}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}