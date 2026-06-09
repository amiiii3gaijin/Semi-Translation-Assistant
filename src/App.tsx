import React, { useEffect, useState } from 'react';
import { useDocumentStore } from './store/useDocumentStore';
import { SentenceStream } from './components/editor/SentenceStream';
import { TopProgressBar } from './components/layout/TopProgressBar';
import { ToastNotification } from './components/common/ToastNotification';
import { NavigationControls } from './components/common/NavigationControls';
import { useAutoSave } from './hooks/useAutoSave';
import { useMilestoneTracker } from './hooks/useMilestone';
import { exportToTXT } from './utils/fileExporter';
import { motion, AnimatePresence } from 'motion/react';

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
     return (
         <div className="flex flex-col w-full h-screen items-center justify-center text-gray-500 gap-4">
             <div>加载工作区...</div>
             <button 
                 onClick={() => {
                     useDocumentStore.getState().clearDocument();
                     window.location.reload();
                 }}
                 className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-[12px] transition-colors"
             >
                 重置并清理缓存
             </button>
         </div>
     );
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
                 
                 <button 
                     onClick={() => {
                         useDocumentStore.getState().clearDocument();
                         window.location.reload();
                     }}
                     className="mt-2 w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-[16px] text-sm font-semibold transition-colors"
                 >
                     停止并清理缓存
                 </button>
             </div>
        </div>
     );
  }

  if (!documentId) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen p-8 relative z-10 bg-white">
         <div className="w-full max-w-3xl glass-panel p-12 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.04)] border border-gray-100 relative flex flex-col items-center text-center">
             <div className="flex flex-col items-center mb-10 w-full">
                 <h1 className="text-[40px] font-bold tracking-tight text-gray-900">翻译辅助</h1>
             </div>
             
             <div className="relative w-full mb-10 group">
                 <textarea 
                    className="w-full h-80 p-8 glass-panel rounded-[24px] focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:bg-white/90 transition-all resize-none text-[18px] text-gray-700 leading-relaxed font-sans placeholder:text-gray-400/80 shadow-inner border border-gray-100"
                    placeholder="在此粘贴或输入原文内容..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                 />
                 <AnimatePresence>
                 {inputText && (
                     <motion.button
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.9 }}
                         onClick={() => setInputText('')}
                         className="absolute top-6 right-6 p-2.5 bg-gray-100/80 hover:bg-gray-200 text-gray-500 hover:text-red-500 rounded-full transition-all shadow-sm backdrop-blur-sm cursor-pointer z-10"
                         title="清空内容"
                     >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                     </motion.button>
                 )}
                 </AnimatePresence>
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
