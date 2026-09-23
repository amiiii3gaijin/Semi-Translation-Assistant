import React from 'react';
import { Sentence } from '../../types';
import { TokenList } from '../token/TokenList';
import { TranslationArea } from './TranslationArea';
import { clsx } from 'clsx';
import { useDocumentStore } from '../../store/useDocumentStore';

interface SentenceCardProps {
  sentence: Sentence;
  isActive: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function SentenceCard({ sentence, isActive, textareaRef }: SentenceCardProps) {
  const originalFontSize = useDocumentStore(state => state.originalFontSize);
  const translationFontSize = useDocumentStore(state => state.translationFontSize);
  return <div className={clsx('sentence-card', isActive ? 'sentence-card--active' : 'sentence-card--inactive')}
    aria-hidden={!isActive || undefined}>
    <div className="sentence-card-scroll overflow-y-auto custom-scrollbar">
      <div className="sentence-original">
        {isActive
          ? <div className="font-semibold text-gray-800 tracking-tight w-full text-center" style={{ fontSize: originalFontSize }}>
              <TokenList sentence={sentence} textareaRef={textareaRef} />
            </div>
          : <div className="text-gray-500 font-medium leading-relaxed px-6 text-center whitespace-pre-wrap opacity-80"
              style={{ fontSize: Math.max(16, originalFontSize - 3) }}>{sentence.originalText}</div>}
      </div>
      <div className="sentence-divider" />
      <div className="sentence-translation">
        {isActive
          ? <TranslationArea sentenceId={sentence.id} initialText={sentence.translatedText} isActive textareaRef={textareaRef} />
          : <div className="text-gray-500 font-medium whitespace-pre-wrap px-8 leading-relaxed opacity-70 tracking-wide text-left"
              style={{ fontSize: Math.max(16, translationFontSize - 3) }}>{sentence.translatedText || null}</div>}
      </div>
    </div>
  </div>;
}

