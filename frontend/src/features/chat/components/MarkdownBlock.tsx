import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math'; 
import rehypeKatex from 'rehype-katex'; 
import { FileText } from 'lucide-react';
import ShikiCodeBlock from './ShikiCodeBlock'; // Import Component Shiki

interface MarkdownBlockProps {
  content: string;
  sources?: any[]; 
}

export default function MarkdownBlock({ content, sources = [] }: MarkdownBlockProps) {
  const processedContent = content.replace(/\[(\d+)\]/g, '[[$1]](#cite-$1)');

  return (
    <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base prose-p:leading-relaxed prose-pre:p-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]} 
        rehypePlugins={[rehypeKatex]}           
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && match) {
              // Gọi Shiki để highlight code chuẩn màu VS Code
              return <ShikiCodeBlock code={codeString} language={match[1]} />;
            }
            return (
              <code {...props} className="bg-zinc-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded-md font-mono text-[0.9em]">
                {children}
              </code>
            );
          },
          table({ children }) {
            return <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-zinc-300 dark:divide-zinc-700 border border-zinc-200 dark:border-zinc-800 rounded-lg">{children}</table></div>;
          },
          th({ children }) {
            return <th className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 text-left text-sm font-semibold text-zinc-900 dark:text-white">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-2 text-sm border-t border-zinc-200 dark:border-zinc-800">{children}</td>;
          },
          a({ href, children }) {
            if (href?.startsWith('#cite-')) {
              const citeId = parseInt(href.replace('#cite-', ''), 10);
              const sourceInfo = sources && sources.length > 0 ? sources[citeId - 1] : null;

              return (
                <span className="relative group inline-block ml-0.5 cursor-pointer align-super">
                  <sup className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[1.25rem] text-[10px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 rounded-full transition-colors group-hover:bg-blue-200 dark:group-hover:bg-blue-800/60 shadow-sm border border-blue-200/50 dark:border-blue-800/50">
                    {citeId}
                  </sup>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-64 p-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl shadow-2xl z-50 text-xs text-left animate-in fade-in zoom-in-95 duration-200 border border-zinc-800 dark:border-zinc-200">
                    <div className="flex items-center gap-1.5 font-semibold mb-1.5 text-blue-400 dark:text-blue-600 border-b border-zinc-700 dark:border-zinc-300 pb-1.5">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{sourceInfo?.title || sourceInfo?.sourceName || `Tài liệu tham khảo ${citeId}`}</span>
                    </div>
                    <div className="line-clamp-4 text-zinc-300 dark:text-zinc-600 leading-relaxed italic">
                      "{sourceInfo?.content || 'Chưa có thông tin trích xuất chi tiết cho tài liệu này.'}"
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45 border-b border-r border-zinc-800 dark:border-zinc-200"></div>
                  </div>
                </span>
              );
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{children}</a>;
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}