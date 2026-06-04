import React from 'react';
import { Sentence } from '../../types';
import { TokenList } from '../token/TokenList';
import { TranslationArea } from './TranslationArea';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useDocumentStore } from '../../store/useDocumentStore';

interface SentenceCardProps {
  sentence: Sentence;
  isActive: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function SentenceCard({ sentence, isActive, textareaRef }: SentenceCardProps) {
  const originalFontSize = useDocumentStore((state) => state.originalFontSize);
  const translationFontSize = useDocumentStore((state) => state.translationFontSize);

  return (
    <div className={twMerge(
        clsx(
            "w-full rounded-[38px] overflow-hidden transition-all duration-300",
            isActive 
                 ? "bg-white shadow-[0_30px_70px_rgba(0,0,0,0.08)] border border-gray-100" 
                 : "bg-white/30 backdrop-blur-sm shadow-xl border border-white/40 select-none pointer-events-none"
        )
    )}>
        <div className="flex flex-col w-full min-h-[460px] items-stretch">
            {/* Top side: Original text and tokens */}
            <div className="w-full px-10 pt-16 pb-8 flex flex-col justify-center relative min-h-[180px]">
                {isActive ? (
                    <div 
                        className="font-semibold leading-[1.7] text-gray-800 tracking-tight flex items-center justify-center w-full text-center"
                        style={{ fontSize: `${originalFontSize}px` }}
                    >
                        <TokenList sentence={sentence} textareaRef={textareaRef} />
                    </div>
                ) : (
                    <div 
                        className="text-gray-500 font-medium leading-relaxed px-6 text-center opacity-80"
                        style={{ fontSize: `${Math.max(16, originalFontSize - 3)}px` }}
                    >
                        {sentence.originalText}
                    </div>
                )}
            </div>
            
            {/* Divider separator */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-300/40 to-transparent my-2" />

            {/* Bottom side: Translation */}
            <div className="w-full px-10 pb-16 pt-8 flex flex-col justify-start relative">
                {isActive ? (
                    <TranslationArea 
                        sentenceId={sentence.id} 
                        initialText={sentence.translatedText} 
                        isActive={true} 
                        textareaRef={textareaRef} 
                    />
                ) : (
                    <div 
                        className="text-gray-500 font-medium whitespace-pre-wrap px-8 leading-relaxed flex items-start justify-start opacity-70 tracking-wide text-left"
                        style={{ fontSize: `${Math.max(16, translationFontSize - 3)}px` }}
                    >
                        {sentence.translatedText || <span className="opacity-40 italic">...</span>}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
