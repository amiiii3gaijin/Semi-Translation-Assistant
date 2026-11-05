import React, { useLayoutEffect, useRef } from 'react';
import { Sentence } from '../../types';
import { TokenList } from '../token/TokenList';
import { TranslationArea } from './TranslationArea';
import { clsx } from 'clsx';
import { useDocumentStore } from '../../store/useDocumentStore';

interface SentenceCardProps {
  sentence: Sentence;
  isActive: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  scrollPositions: Map<string, number>;
}

export function SentenceCard({ sentence, isActive, textareaRef, scrollPositions }: SentenceCardProps) {
  const originalFontSize = useDocumentStore(state => state.originalFontSize);
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = scrollPositions.get(sentence.id) ?? 0;
  }, [sentence.id, scrollPositions]);
  return <div className={clsx('sentence-card', isActive ? 'sentence-card--active' : 'sentence-card--inactive')}
    aria-hidden={!isActive || undefined}>
    <div ref={scrollRef} className="sentence-card-scroll overflow-y-auto custom-scrollbar"
      onScroll={event => scrollPositions.set(sentence.id, event.currentTarget.scrollTop)}>
      <div className="sentence-original">
        <div className="font-semibold text-gray-800 tracking-tight w-full text-center" style={{ fontSize: originalFontSize }}>
          <TokenList sentence={sentence} textareaRef={textareaRef} isActive={isActive} />
        </div>
      </div>
      <div className="sentence-divider" />
      <div className="sentence-translation">
        <TranslationArea sentenceId={sentence.id} initialText={sentence.translatedText} isActive={isActive} textareaRef={textareaRef} />
      </div>
    </div>
  </div>;
}

