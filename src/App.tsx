import React, { useEffect, useState } from 'react';
import { useDocumentStore } from './store/useDocumentStore';
import { SentenceStream } from './components/editor/SentenceStream';
import { TopProgressBar } from './components/layout/TopProgressBar';
import { ToastNotification } from './components/common/ToastNotification';
import { NavigationControls } from './components/common/NavigationControls';
import { useAutoSave } from './hooks/useAutoSave';
import { useMilestoneTracker } from './hooks/useMilestone';
import { exportToTXT } from './utils/fileExporter';

export default function App() {
  const loadFromIndexedDB = useDocumentStore((state) => state.loadFromIndexedDB);
  const importDocument = useDocumentStore((state) => state.importDocument);
  const documentId = useDocumentStore((state) => state.documentId);
  
  const [inputText, setInputText] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  const isImporting = useDocumentStore((state) => state.isImporting);
  const importProgress = useDocumentStore((state) => state.importProgress);

  useAutoSave();
  useMilestoneTracker();

  useEffect(() => {
    loadFromIndexedDB().finally(() => setIsInitializing(false));
  }, [loadFromIndexedDB]);

  if (isInitializing) {
     return <div className="flex w-full h-screen items-center justify-center text-gray-500">加载工作区...</div>;
  }
  
  if (isImporting) {
     return (
        <div className="flex flex-col w-full h-screen items-center justify-center text-gray-800">
             <div className="w-80 glass-panel-heavy p-8 rounded-[32px] shadow-xl flex flex-col gap-4">
                 <div className="text-sm font-medium flex justify-between tracking-wide">
                     <span>正在解析文章与底层结构...</span>
                     <span className="text-gray-800">{importProgress}%</span>
                 </div>
                 <div className="w-full bg-gray-200/50 rounded-full h-2 shadow-inner overflow-hidden">
                     <div className="bg-gray-800 h-2 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                 </div>
             </div>
        </div>
     );
  }

  if (!documentId) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen p-8 relative z-10 bg-white">
         <div className="w-full max-w-3xl glass-panel p-12 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.04)] border border-gray-100 relative flex flex-col items-center text-center">
             <h1 className="text-[34px] font-bold mb-4 tracking-tight text-gray-800">翻译辅助</h1>
             <p className="text-gray-500 mb-10 font-medium text-[17px]">请输入或粘贴原文内容以建立工作区。</p>
             <div className="relative w-full mb-10 group">
                 <textarea 
                    className="w-full h-80 p-6 glass-panel rounded-[24px] focus:outline-none focus:bg-white/70 transition-all resize-none text-[18px] text-gray-700 leading-relaxed font-sans placeholder:text-gray-400/60 shadow-inner"
                    placeholder="在此粘贴纯文本..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                 />
                 {inputText && (
                     <button
                         onClick={() => setInputText('')}
                         className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white/90 text-gray-400 hover:text-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                         title="清空文本"
                     >
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                     </button>
                 )}
             </div>
             <button 
                className="w-full py-4 bg-gray-900 text-white rounded-[24px] hover:bg-black hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-900/20 transition-all font-semibold tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-[18px]"
                onClick={() => importDocument(inputText)}
                disabled={!inputText.trim()}
             >
                进入工作区
             </button>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-white">
      <TopProgressBar />
      <SentenceStream />
      <NavigationControls />
            <ToastNotification />
    </div>
  );
}
