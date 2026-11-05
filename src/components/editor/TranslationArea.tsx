import React, { useEffect, useState, RefObject } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useCaptureModeStore } from '../../store/useCaptureModeStore';
import { useSelectionStore } from '../../store/useSelectionStore';

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
  // Mirrors TokenList's data-capture-active so only one cursor looks live at a time.
  const capturing = useCaptureModeStore(state => state.active);
  const selecting = useSelectionStore(state => state.selection?.sentenceId === sentenceId && state.selection.mode !== 'preview');

  // The native textarea selection is a square system-blue block; it is painted
  // transparent and redrawn here as rounded blue runs behind the text.
  const [selected, setSelected] = useState<{ start: number; end: number } | null>(null);
  useEffect(() => {
    const area = textareaRef?.current;
    if (!area || !isActive) { setSelected(null); return; }
    const sync = () => {
      const focused = document.activeElement === area;
      const { selectionStart: start, selectionEnd: end } = area;
      setSelected(previous => !focused || start === end ? null
        : previous?.start === start && previous.end === end ? previous : { start, end });
    };
    const events = ['select', 'selectionchange', 'input', 'keyup', 'mouseup', 'focus', 'blur'];
    events.forEach(name => area.addEventListener(name, sync));
    document.addEventListener('selectionchange', sync);
    sync();
    return () => {
      events.forEach(name => area.removeEventListener(name, sync));
      document.removeEventListener('selectionchange', sync);
    };
  }, [isActive, textareaRef]);

  useEffect(() => {
      if (isActive && textareaRef?.current) {
          const timer = setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 50);
          return () => clearTimeout(timer);
      }
  }, [isActive, textareaRef]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateTranslation(sentenceId, e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        if (!e.shiftKey) {
            e.preventDefault();
            markCurrentSentenceCompleted();
            nextSentence();
        }
    }
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

            {selected && (
                <div
                    className="translation-selection col-start-1 row-start-1 whitespace-pre-wrap w-full font-sans font-medium leading-[1.6] tracking-tight text-left pointer-events-none p-4"
                    aria-hidden="true"
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', fontSize: `${translationFontSize}px` }}
                >
                    {initialText.slice(0, selected.start)}<mark>{initialText.slice(selected.start, selected.end)}</mark>{initialText.slice(selected.end) + ' '}
                </div>
            )}

            <textarea
                ref={textareaRef}
                data-sentence-id={sentenceId}
                data-capture-active={isActive && (capturing || selecting)}
                aria-label="当前句子的译文"
                value={initialText}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                readOnly={!isActive}
                tabIndex={isActive ? 0 : -1}
                placeholder={isActive ? "在此输入…" : ""}
                className="translation-input col-start-1 row-start-1 w-full h-full bg-transparent resize-none font-medium leading-[1.6] tracking-tight text-gray-800 placeholder:text-gray-400/60 overflow-hidden font-sans text-left p-4 m-0"
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', fontSize: `${translationFontSize}px` }}
            />
        </div>
    </div>
  );
}
