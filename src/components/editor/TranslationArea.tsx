import React, { useEffect, RefObject } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';

interface TranslationAreaProps {
  sentenceId: string;
  initialText: string;
  isActive: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

export function TranslationArea({ sentenceId, initialText, isActive, textareaRef }: TranslationAreaProps) {
  const updateTranslation = useDocumentStore((state) => state.updateTranslation);
  const markCurrentSentenceCompleted = useDocumentStore((state) => state.markCurrentSentenceCompleted);
  const nextSentence = useDocumentStore((state) => state.nextSentence);
  const translationFontSize = useDocumentStore((state) => state.translationFontSize);

  useEffect(() => {
      if (isActive && textareaRef?.current) {
          // Delay to allow animation to settle slightly for smoother UX
          setTimeout(() => textareaRef.current?.focus(), 50);
      }
  }, [isActive, textareaRef]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateTranslation(sentenceId, e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (!e.shiftKey) {
            e.preventDefault();
            markCurrentSentenceCompleted();
            nextSentence();
        }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const start = textareaRef?.current?.selectionStart || 0;
    const end = textareaRef?.current?.selectionEnd || 0;
    const newText = initialText.substring(0, start) + text + initialText.substring(end);
    updateTranslation(sentenceId, newText);
    setTimeout(() => {
      if (textareaRef?.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length;
      }
    }, 0);
  };

  return (
    <div className="w-full h-full flex flex-col justify-start relative px-4">
        <div className="grid w-full items-start relative min-w-0">
            {/* Invisible measuring wrapper for auto-expanding vertically-centered textarea */}
            <div 
                className="col-start-1 row-start-1 whitespace-pre-wrap w-full invisible font-sans font-medium leading-[1.6] tracking-tight text-left pointer-events-none p-4" 
                aria-hidden="true"
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', fontSize: `${translationFontSize}px` }}
            >
                {initialText + ' '}
            </div>
            
            <textarea
                ref={textareaRef}
                value={initialText}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={!isActive}
                placeholder={isActive ? "在此输入..." : ""}
                className="col-start-1 row-start-1 w-full h-full bg-transparent resize-none focus:outline-none font-medium leading-[1.6] tracking-tight text-gray-800 placeholder:text-gray-400/60 overflow-hidden font-sans text-left p-4 m-0"
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', fontSize: `${translationFontSize}px` }}
            />
        </div>
    </div>
  );
}
