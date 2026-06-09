import { Sentence } from '../../types';
import { TokenItem } from './TokenItem';
import { useDocumentStore } from '../../store/useDocumentStore';
import React, { useState, useRef, useEffect } from 'react';

interface TokenListProps {
  sentence: Sentence;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function TokenList({ sentence, textareaRef }: TokenListProps) {
  const setActiveTokenIndex = useDocumentStore((state) => state.setActiveTokenIndex);
  const insertTokenToTranslation = useDocumentStore((state) => state.insertTokenToTranslation);
  const updateTranslation = useDocumentStore((state) => state.updateTranslation);

  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [dragEndIdx, setDragEndIdx] = useState<number | null>(null);
  const isDragging = useRef(false);

  // Helper to insert text cleanly without focus jumping badly
  const insertTextAtCursor = (text: string) => {
    if (textareaRef?.current) {
        const textarea = textareaRef.current;
        textarea.focus({ preventScroll: true });
        const success = document.execCommand('insertText', false, text);
        if (!success) {
            const start = textarea.selectionStart;
            const currentVal = textarea.value;
            const newVal = currentVal.substring(0, start) + text + currentVal.substring(textarea.selectionEnd);
            updateTranslation(sentence.id, newVal);
            setTimeout(() => {
                textarea.setSelectionRange(start + text.length, start + text.length);
            }, 0);
        }
    } else {
        insertTokenToTranslation(sentence.id, text);
    }
  };

  const handlePointerDown = (index: number) => {
     isDragging.current = true;
     setDragStartIdx(index);
     setDragEndIdx(index);
     setActiveTokenIndex(sentence.id, index);
  };

  const handlePointerEnter = (index: number) => {
     if (isDragging.current && dragStartIdx !== null) {
         setDragEndIdx(index);
     }
  };

  const handlePointerUp = () => {
     if (!isDragging.current) return;
     isDragging.current = false;
     
     if (dragStartIdx !== null && dragEndIdx !== null) {
         const start = Math.min(dragStartIdx, dragEndIdx);
         const end = Math.max(dragStartIdx, dragEndIdx);
         
         const selectedTokens = sentence.tokens.slice(start, end + 1);
         const textToInsert = selectedTokens.map(t => t.text).join('').trim().replace(/[\r\n]+/g, '');
         
         if (textToInsert) {
             insertTextAtCursor(textToInsert);
         }
     }
     
     setDragStartIdx(null);
     setDragEndIdx(null);
  };

  const getDragPosition = (index: number) => {
      if (dragStartIdx === null || dragEndIdx === null) return null;
      const start = Math.min(dragStartIdx, dragEndIdx);
      const end = Math.max(dragStartIdx, dragEndIdx);
      if (index < start || index > end) return null;
      if (start === end) return 'single';
      if (index === start) return 'start';
      if (index === end) return 'end';
      return 'middle';
  };

    useEffect(() => {
     const onGlobalPointerUp = () => {
         if (isDragging.current) {
             handlePointerUp();
         }
     };

     const onCardPointerLeave = () => {
         if (isDragging.current) {
             handlePointerUp();
         }
     };

     window.addEventListener('pointerup', onGlobalPointerUp);
     window.addEventListener('cardPointerLeave', onCardPointerLeave as EventListener);
     
     return () => {
         window.removeEventListener('pointerup', onGlobalPointerUp);
         window.removeEventListener('cardPointerLeave', onCardPointerLeave as EventListener);
     };
  }, [dragStartIdx, dragEndIdx, sentence]);

  return (
    <div 
        className="flex flex-wrap items-center justify-center text-center leading-[2] gap-y-2 gap-x-0 touch-none py-2"
        onPointerUp={handlePointerUp}
    >
      {sentence.tokens.map((token, index) => {
        const isActive = sentence.activeTokenIndex === index && sentence.status === 'active';
        const dragPos = getDragPosition(index);
        
        return (
          <TokenItem
            key={token.id}
            token={token}
            isActive={isActive}
            dragPos={dragPos}
            onPointerDown={() => handlePointerDown(index)}
            onPointerEnter={() => handlePointerEnter(index)}
          />
        );
      })}
    </div>
  );
}
