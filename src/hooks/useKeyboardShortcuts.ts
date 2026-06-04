import React, { useEffect } from 'react';
import { useDocumentStore } from '../store/useDocumentStore';

export function useKeyboardShortcuts(textareaRef: React.RefObject<HTMLTextAreaElement | null>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      const { 
        sentences, 
        currentActiveIndex, 
        setActiveTokenIndex,
        insertTokenToTranslation,
        nextSentence,
        prevSentence
      } = useDocumentStore.getState();

      const currentSentence = sentences[currentActiveIndex];
      if (!currentSentence) return;
      
      const tokens = currentSentence.tokens;

      if (e.code === 'Numpad4') { 
        e.preventDefault();
        let nextIndex = currentSentence.activeTokenIndex - 1;
        while (nextIndex >= 0 && tokens[nextIndex]?.isPunctuation) {
          nextIndex--;
        }
        if (nextIndex >= 0) {
          setActiveTokenIndex(currentSentence.id, nextIndex);
        }
      } else if (e.code === 'Numpad6') { 
        e.preventDefault();
        let nextIndex = currentSentence.activeTokenIndex + 1;
        while (nextIndex < tokens.length && tokens[nextIndex]?.isPunctuation) {
          nextIndex++;
        }
        if (nextIndex < tokens.length) {
          setActiveTokenIndex(currentSentence.id, nextIndex);
        }
      } else if (e.code === 'Numpad8') {
        e.preventDefault();
        let nextIndex = currentSentence.activeTokenIndex - 8;
        if (nextIndex < 0) nextIndex = 0;
        while (nextIndex >= 0 && tokens[nextIndex]?.isPunctuation) nextIndex--;
        if (nextIndex >= 0) setActiveTokenIndex(currentSentence.id, nextIndex);
      } else if (e.code === 'Numpad2') {
        e.preventDefault();
        let nextIndex = currentSentence.activeTokenIndex + 8;
        if (nextIndex >= tokens.length) nextIndex = tokens.length - 1;
        while (nextIndex < tokens.length && tokens[nextIndex]?.isPunctuation) nextIndex++;
        if (nextIndex < tokens.length) setActiveTokenIndex(currentSentence.id, nextIndex);
      } else if (e.code === 'Numpad5') { 
        e.preventDefault();
        const activeToken = tokens[currentSentence.activeTokenIndex];
        if (activeToken && !activeToken.isPunctuation) {
          if (textareaRef.current) {
            const textarea = textareaRef.current;
            const start = textarea.selectionStart;
            const currentVal = textarea.value;
            const text = activeToken.text;
            const newVal = currentVal.substring(0, start) + text + currentVal.substring(textarea.selectionEnd);
            useDocumentStore.getState().updateTranslation(currentSentence.id, newVal);
            setTimeout(() => {
                textarea.setSelectionRange(start + text.length, start + text.length);
                textarea.focus();
            }, 0);
          } else {
            insertTokenToTranslation(currentSentence.id, activeToken.text);
          }
        }
      } else if (e.code === 'PageUp') { 
         e.preventDefault();
         prevSentence();
         setTimeout(() => textareaRef.current?.focus(), 0);
      } else if (e.code === 'PageDown') { 
         e.preventDefault();
         nextSentence();
         setTimeout(() => textareaRef.current?.focus(), 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [textareaRef]);
}
