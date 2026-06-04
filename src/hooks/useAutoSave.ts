import { useEffect, useRef } from 'react';
import { useDocumentStore } from '../store/useDocumentStore';

export function useAutoSave() {
  const saveToIndexedDB = useDocumentStore((state) => state.saveToIndexedDB);
  const documentId = useDocumentStore((state) => state.documentId);
  const sentences = useDocumentStore((state) => state.sentences);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!documentId) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
       saveToIndexedDB();
    }, 2000); 

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [sentences, documentId, saveToIndexedDB]); 
}
