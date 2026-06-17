import React, { useEffect, useState } from 'react';
import { createHighlighter } from 'shiki';
import type { Highlighter } from 'shiki';
import { Check, Copy } from 'lucide-react';

// Khởi tạo Highlighter dạng Singleton để tải 1 lần duy nhất
let highlighterInstance: Highlighter | null = null;

interface ShikiCodeBlockProps {
  code: string;
  language: string;
}

export default function ShikiCodeBlock({ code, language }: ShikiCodeBlockProps) {
  const [html, setHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const highlightCode = async () => {
      try {
        const safeLang = language || 'text';

        // 1. Nếu chưa có instance, tạo mới
        if (!highlighterInstance) {
          highlighterInstance = await createHighlighter({
            themes: ['vsc-dark-plus'], 
            langs: ['javascript', 'typescript', 'json', 'bash', 'html', 'css', 'python', 'java', 'sql', 'markdown', safeLang],
          });
        } else {
          // 2. Nếu instance đã tồn tại, nhưng ngôn ngữ này AI mới bịa ra -> Tải thêm ngôn ngữ đó
          const loadedLangs = highlighterInstance.getLoadedLanguages();
          if (!loadedLangs.includes(safeLang as any) && safeLang !== 'text') {
            await highlighterInstance.loadLanguage(safeLang as any).catch(() => {});
          }
        }
        
        // Kiểm tra lại xem ngôn ngữ đã sẵn sàng chưa, nếu không hỗ trợ thì lùi về 'text'
        const isLangLoaded = highlighterInstance.getLoadedLanguages().includes(safeLang as any);
        const finalLang = isLangLoaded ? safeLang : 'text';
        
        // 3. Render ra HTML
        const highlightedHtml = highlighterInstance.codeToHtml(code, {
          lang: finalLang,
          theme: 'vsc-dark-plus',
        });

        if (isMounted) setHtml(highlightedHtml);
      } catch (error) {
        console.error("Lỗi Shiki Render:", error);
        if (isMounted) setHtml(`<pre><code>${code}</code></pre>`);
      }
    };

    highlightCode();
    return () => { isMounted = false; };
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg overflow-hidden my-4 border border-zinc-200 dark:border-zinc-800 not-prose font-mono text-[14px]">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
        <span className="text-xs text-zinc-400 lowercase">{language || 'text'}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors p-1">
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      
      {/* Vùng render code từ Shiki */}
      {html ? (
        <div 
          className="[&>pre]:!m-0 [&>pre]:!p-4 [&>pre]:!bg-[#1E1E1E] overflow-x-auto scrollbar-thin"
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      ) : (
        <div className="p-4 bg-[#1E1E1E] text-zinc-400 animate-pulse text-sm">Đang tô màu cú pháp...</div>
      )}
    </div>
  );
}