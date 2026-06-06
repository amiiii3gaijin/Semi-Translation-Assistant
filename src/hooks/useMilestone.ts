import { useEffect, useRef } from 'react';
import { useDocumentStore } from '../store/useDocumentStore';
import { useUIStore } from '../store/useUIStore';
import { exportToTXT } from '../utils/fileExporter';

export function useMilestoneTracker() {
  const completedSentences = useDocumentStore((state) => state.completedSentences);
  const showToast = useUIStore((state) => state.showToast);
  
  const lastToastAtCount = useRef(0);
  const lastExportTime = useRef(Date.now());

  useEffect(() => {
    if (completedSentences >= lastToastAtCount.current + 10) {
      showToast('已完成 10 句新进度。按 F2 一键导出/备份进度。');
      lastToastAtCount.current = completedSentences;
    }
  }, [completedSentences, showToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastExportTime.current > 15 * 60 * 1000) {
         showToast('距离上次备份已过 15 分钟。按 F2 一键导出。');
         lastExportTime.current = Date.now();
      }
    }, 60000); 
    return () => clearInterval(interval);
  }, [showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const docState = useDocumentStore.getState();
        exportToTXT(docState);
        
        const textToCopy = docState.sentences
            .map(s => s.translatedText || s.originalText)
            .join('\n\n');
        navigator.clipboard.writeText(textToCopy).catch(() => {});
            
        lastExportTime.current = Date.now();
        showToast('已导出文本并复制到剪贴板。');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToast]);
}
