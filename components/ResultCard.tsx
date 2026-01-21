import React, { useState } from 'react';
import { RedNoteOption } from '../types';

interface ResultCardProps {
  option: RedNoteOption;
  index: number;
}

const ResultCard: React.FC<ResultCardProps> = ({ option, index }) => {
  const [copiedField, setCopiedField] = useState<'title' | 'content' | 'all' | null>(null);

  const handleCopy = (text: string, field: 'title' | 'content' | 'all') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    const fullText = `${option.title}\n\n${option.content}\n\n${option.tags.join(' ')}`;
    handleCopy(fullText, 'all');
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#FF2442]/20 transition-all duration-300 flex flex-col h-full group">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="bg-red-50 text-[#FF2442] text-xs font-bold px-3 py-1 rounded-full border border-red-100">
          方案 {index + 1}
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg max-w-[60%] truncate">
          💡 {option.reasoning}
        </div>
      </div>

      {/* Title Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400">标题 (Title)</span>
             <button 
                onClick={() => handleCopy(option.title, 'title')}
                className="text-xs text-[#FF2442] opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
             >
                {copiedField === 'title' ? '已复制' : '复制'}
             </button>
        </div>
        <div 
          className="text-lg font-bold text-gray-900 leading-snug cursor-pointer p-3 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-colors"
          onClick={() => handleCopy(option.title, 'title')}
        >
          {option.title}
        </div>
      </div>

      {/* Content Section */}
      <div className="mb-5 flex-grow">
        <div className="flex items-center justify-between mb-2">
             <span className="text-xs font-bold text-gray-400">正文 (Content)</span>
             <button 
                onClick={() => handleCopy(option.content, 'content')}
                className="text-xs text-[#FF2442] opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
             >
                {copiedField === 'content' ? '已复制' : '复制'}
             </button>
        </div>
        <div 
          className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed cursor-pointer p-3 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-colors max-h-[300px] overflow-y-auto custom-scrollbar"
          onClick={() => handleCopy(option.content, 'content')}
        >
          {option.content}
        </div>
      </div>

      {/* Tags Section */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {option.tags.map((tag, i) => (
            <span key={i} className="text-[#133276] text-xs bg-[#133276]/5 px-2 py-1 rounded-md hover:bg-[#133276]/10 cursor-pointer transition-colors">
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-auto">
        <button
          onClick={copyAll}
          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2
            ${copiedField === 'all' 
              ? 'bg-green-500 text-white' 
              : 'bg-[#FF2442] text-white hover:bg-[#ff4d67] shadow-lg shadow-[#FF2442]/20 hover:shadow-[#FF2442]/30 active:scale-98'
            }
          `}
        >
          {copiedField === 'all' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              已复制全部
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              一键复制 (标题+正文+标签)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ResultCard;