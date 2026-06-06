import { useState } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { exportToTXT } from '../../utils/fileExporter';
import { motion, AnimatePresence } from 'motion/react';

export function NavigationControls() {
    const nextSentence = useDocumentStore((state) => state.nextSentence);
    const prevSentence = useDocumentStore((state) => state.prevSentence);
    const clearDocument = useDocumentStore((state) => state.clearDocument);
    const documentState = useDocumentStore((state) => state);
    
    // Font settings
    const originalFontSize = useDocumentStore((state) => state.originalFontSize);
    const setOriginalFontSize = useDocumentStore((state) => state.setOriginalFontSize);
    const translationFontSize = useDocumentStore((state) => state.translationFontSize);
    const setTranslationFontSize = useDocumentStore((state) => state.setTranslationFontSize);
    
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    
    const handleConfirmExit = () => {
        clearDocument();
        setShowExitConfirm(false);
    };

    return (
        <>
            <AnimatePresence>
                {showExitConfirm && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm pointer-events-auto"
                            onClick={() => setShowExitConfirm(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-white rounded-[32px] shadow-2xl p-8 max-w-sm w-full relative z-10 border border-gray-100 flex flex-col pointer-events-auto"
                        >
                            <h3 className="text-[22px] font-bold text-gray-900 mb-3 tracking-tight">退出工作区</h3>
                            <p className="text-gray-500 mb-8 font-medium text-[15px] leading-relaxed">确定要退出工作区吗？尚未导出的所有翻译进度将会永久丢失。</p>
                            <div className="flex gap-3 justify-end w-full">
                                <button 
                                    onClick={() => setShowExitConfirm(false)}
                                    className="px-6 py-2.5 rounded-[12px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all text-[15px]"
                                >
                                    取消
                                </button>
                                <button 
                                    onClick={handleConfirmExit}
                                    className="px-6 py-2.5 rounded-[12px] font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all text-[15px]"
                                >
                                    确认退出
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Symmetrical Close Button */}
            <div className="absolute top-6 left-6 z-50">
                <button 
                    onClick={() => setShowExitConfirm(true)}
                    title="关闭并清空工作区"
                    className="flex items-center gap-2 px-5 py-2 glass-panel-heavy text-sm font-semibold text-gray-700 rounded-full cursor-pointer hover:bg-white transition-all shadow-md hover:shadow-lg border-white group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-red-500 transition-colors"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    退出工作区
                </button>
            </div>
            
            <div className="absolute top-6 right-6 z-50 flex gap-3">
                <button 
                    onClick={() => exportToTXT(documentState)}
                    className="flex items-center gap-2 px-5 py-2 glass-panel-heavy text-sm font-semibold text-gray-800 rounded-full cursor-pointer hover:bg-white/90 transition-all shadow-md hover:shadow-lg border-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    导出成果
                </button>
            </div>
            
            <div className="absolute bottom-8 left-8 z-50 flex flex-col gap-4">
                <AnimatePresence>
                    {showShortcuts && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95, pointerEvents: 'none' }}
                            className="bg-white/80 backdrop-blur-xl p-6 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-[320px] border border-white text-gray-700 origin-bottom-left absolute bottom-[72px] left-0"
                        >
                            <div className="space-y-6">
                                {/* Font Size Controls */}
                                <div>
                                    <div className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-800 tracking-wide uppercase">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>
                                        显示设置
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[11px] font-medium text-gray-500">
                                                <span>原文大小</span>
                                                <span>{originalFontSize}px</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="16" 
                                                max="40" 
                                                value={originalFontSize}
                                                onChange={(e) => setOriginalFontSize(Number(e.target.value))}
                                                className="w-full accent-blue-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[11px] font-medium text-gray-500">
                                                <span>翻译文本大小</span>
                                                <span>{translationFontSize}px</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="16" 
                                                max="40" 
                                                value={translationFontSize}
                                                onChange={(e) => setTranslationFontSize(Number(e.target.value))}
                                                className="w-full accent-blue-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="h-[1px] w-full bg-gray-200/50" />
                                
                                {/* Shortcuts */}
                                <div>
                                    <div className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-800 tracking-wide uppercase">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="M7 16h10"/></svg>
                                        快捷键指南
                                    </div>
                                    <ul className="space-y-3 text-[11px] font-medium opacity-90">
                                        <li className="flex items-center justify-between">
                                            <span className="text-gray-500">上下翻句</span>
                                            <div className="flex gap-1"><kbd className="bg-white/80 border border-gray-200/60 rounded px-1.5 py-0.5 shadow-sm text-gray-700">PgUp</kbd><span className="text-gray-300">/</span><kbd className="bg-white/80 border border-gray-200/60 rounded px-1.5 py-0.5 shadow-sm text-gray-700">PgDn</kbd><span className="text-gray-300">/</span><kbd className="bg-white/80 border border-gray-200/60 rounded px-1.5 py-0.5 shadow-sm text-gray-700">Enter</kbd></div>
                                        </li>
                                        <li className="flex items-center justify-between">
                                            <span className="text-gray-500">左右平移焦点</span>
                                            <div className="flex gap-1"><kbd className="bg-white/80 border border-gray-200/60 rounded px-1.5 py-0.5 shadow-sm text-gray-700">4</kbd><span className="text-gray-300">/</span><kbd className="bg-white/80 border border-gray-200/60 rounded px-1.5 py-0.5 shadow-sm text-gray-700">6</kbd></div>
                                        </li>
                                        <li className="flex items-center justify-between">
                                            <span className="text-gray-500">跨行跳跃</span>
                                            <div className="flex gap-1"><kbd className="bg-white/80 border border-gray-200/60 rounded px-1.5 py-0.5 shadow-sm text-gray-700">8</kbd><span className="text-gray-300">/</span><kbd className="bg-white/80 border border-gray-200/60 rounded px-1.5 py-0.5 shadow-sm text-gray-700">2</kbd></div>
                                        </li>
                                        <li className="flex items-center justify-between">
                                            <span className="text-blue-600 font-bold">插入当前词</span>
                                            <kbd className="bg-blue-500 border border-blue-600 rounded px-2 py-0.5 shadow-sm text-white font-bold">5</kbd>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <button 
                    onClick={() => setShowShortcuts(prev => !prev)}
                    className="w-[54px] h-[54px] flex items-center justify-center bg-white/80 backdrop-blur-xl border border-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] text-gray-500 hover:text-blue-500 hover:-translate-y-1 transition-all duration-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </button>
            </div>
            
            <div className="absolute bottom-8 right-8 z-50 flex gap-3">
                 <button 
                     onClick={() => prevSentence()}
                     className="w-[52px] h-[52px] flex items-center justify-center bg-white/70 backdrop-blur-xl border border-white/50 rounded-full shadow-lg text-gray-600 hover:bg-white hover:text-gray-900 transition-all text-xl group"
                 >
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-y-0.5 transition-transform"><path d="m18 15-6-6-6 6"/></svg>
                 </button>
                 <button 
                     onClick={() => nextSentence()}
                     className="w-[52px] h-[52px] flex items-center justify-center bg-blue-500 border border-blue-400 rounded-full shadow-lg shadow-blue-500/30 text-white hover:bg-blue-600 transition-all text-xl group"
                 >
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-y-0.5 transition-transform"><path d="m6 9 6 6 6-6"/></svg>
                 </button>
            </div>
        </>
    );
}
