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
      showToast('已完成 10 句新进度。按 F2 保存进度文件到本地防丢失。');
      lastToastAtCount.current = completedSentences;
    }
  }, [completedSentences, showToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastExportTime.current > 15 * 60 * 1000) {
         showToast('距离上次备份已过 15 分钟。按 F2 保存进度。');
         lastExportTime.current = Date.now();
      }
    }, 60000); 
    return () => clearInterval(interval);
  }, [showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        exportToTXT(useDocumentStore.getState());
        lastExportTime.current = Date.now();
        showToast('文本文件已下载。');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToast]);
}
