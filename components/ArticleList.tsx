
import React from 'react';
import { Article } from '../types';

interface ArticleListProps {
  articles: Article[];
  onRemove: (id: string) => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({ articles, onRemove }) => {
  if (articles.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
        <p className="text-slate-500 font-bold">No articles added yet. Paste some content above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <div key={article.id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <h4 className="font-bold text-slate-900 text-lg line-clamp-1">
                {article.title || 'Untitled Article'}
              </h4>
              <p className="text-sm text-slate-700 font-medium line-clamp-2 mt-2 leading-relaxed">
                {article.content}
              </p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {article.url && (
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 flex items-center bg-indigo-100 px-3 py-1 rounded-full uppercase tracking-tight"
                  >
                    <i className="fa-solid fa-link mr-1.5"></i>
                    Original Link
                  </a>
                )}
                {article.sources && article.sources.length > 0 && (
                  <div className="flex items-center">
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full flex items-center uppercase tracking-tight">
                      <i className="fa-solid fa-circle-check mr-1.5"></i>
                      Verified Source
                    </span>
                  </div>
                )}
              </div>
              
              {article.sources && article.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                   <p className="text-[10px] text-slate-900 font-black mb-2 uppercase tracking-widest">Grounding References:</p>
                   <div className="flex flex-wrap gap-3">
                     {article.sources.map((src, idx) => (
                       <a 
                        key={idx}
                        href={src.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[11px] text-slate-700 font-bold hover:text-indigo-600 underline truncate max-w-[200px]"
                        title={src.title}
                       >
                        {src.title}
                       </a>
                     ))}
                   </div>
                </div>
              )}
            </div>
            <button
              onClick={() => onRemove(article.id)}
              className="text-slate-400 hover:text-red-600 transition-colors p-2 -mt-2 -mr-2"
              title="Remove article"
            >
              <i className="fa-solid fa-trash-can text-lg"></i>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
