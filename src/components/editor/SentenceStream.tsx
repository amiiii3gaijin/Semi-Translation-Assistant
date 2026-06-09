import { useEffect, useRef, useState } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { SentenceCard } from './SentenceCard';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { motion, AnimatePresence } from 'motion/react';
import { SentenceTrunk } from './SentenceTrunk';

export function SentenceStream() {
  const sentences = useDocumentStore((state) => state.sentences);
  const currentActiveIndex = useDocumentStore((state) => state.currentActiveIndex);
  const nextSentence = useDocumentStore((state) => state.nextSentence);
  const prevSentence = useDocumentStore((state) => state.prevSentence);
  const [showTrunk, setShowTrunk] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useKeyboardShortcuts(textareaRef);

  // Wheel navigation to completely eliminate scrollbars
  const isWheeling = useRef(false);
  useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
          if (isWheeling.current) return;
          
          const target = e.target as HTMLElement;
          const scrollable = target.closest('.overflow-y-auto');
          
          if (scrollable) {
              const { scrollTop, scrollHeight, clientHeight } = scrollable;
              const isAtTop = scrollTop === 0;
              const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) <= 1;
              
              // Only allow card flip if at the very boundaries of the scrollable area
              if (e.deltaY > 0 && !isAtBottom) return;
              if (e.deltaY < 0 && !isAtTop) return;
          }
          
          if (e.deltaY > 30) {
              nextSentence();
              isWheeling.current = true;
              setTimeout(() => { isWheeling.current = false; }, 400);
          } else if (e.deltaY < -30) {
              prevSentence();
              isWheeling.current = true;
              setTimeout(() => { isWheeling.current = false; }, 400);
          }
      };

      window.addEventListener('wheel', handleWheel, { passive: true });
      return () => window.removeEventListener('wheel', handleWheel);
  }, [nextSentence, prevSentence]);

  if (sentences.length === 0) return null;

  const currentSentence = sentences[currentActiveIndex];

  const getCylinderStyles = (diff: number) => {
      const radius = 900;
      const angleDeg = diff * 22; // 22 degrees per card
      const angleRad = angleDeg * (Math.PI / 180);
      
      const y = radius * Math.sin(angleRad);
      const z = radius * Math.cos(angleRad) - radius;
      const rotateX = -angleDeg;

      const isActive = diff === 0;
      const scale = isActive ? 1 : 1 - (Math.abs(diff) * 0.05);
      const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(diff) * 0.25);
      const blurValue = isActive ? 0 : Math.abs(diff) * 0.8;
      const zIndex = 50 - Math.abs(diff);

      return {
          y,
          z,
          rotateX,
          scale,
          opacity,
          filter: `blur(${blurValue}px)`,
          zIndex
      };
  };

  return (
    <div className="w-full h-screen overflow-hidden relative bg-transparent flex items-center justify-center">
       
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ perspective: '1600px' }}>
          <AnimatePresence custom={currentActiveIndex}>
            {sentences.map((sentence, index) => {
                const diff = index - currentActiveIndex;
                
                // Show more items so the spherical background feels complete
                if (Math.abs(diff) > 4) return null;

                const isActive = diff === 0;

                return (
                   <motion.div
                      key={sentence.id}
                      custom={index}
                      initial={(idx: number) => getCylinderStyles(idx > currentActiveIndex ? 5 : -5)}
                      animate={getCylinderStyles(diff)}
                      exit={(idx: number) => {
                          const isOldActiveAhead = currentActiveIndex > idx;
                          return getCylinderStyles(isOldActiveAhead ? -5 : 5);
                      }}
                      transition={{
                          type: 'spring',
                          stiffness: 260,
                          damping: 30,
                          mass: 1
                      }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                   >
                       <div className="w-full max-w-[1200px] px-8" style={{ pointerEvents: isActive ? 'auto' : 'none' }}>
                           <SentenceCard 
                               sentence={sentence} 
                               isActive={isActive} 
                               textareaRef={isActive ? textareaRef : undefined}
                           />
                       </div>
                   </motion.div>
                );
            })}
          </AnimatePresence>
       </div>

       {/* Show Trunk Feature - Floating Below */}
       <AnimatePresence>
          {currentSentence && (
              <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="absolute bottom-12 z-50 flex flex-col items-center w-full"
              >
                  <button 
                      onClick={() => setShowTrunk(!showTrunk)}
                      className={`px-5 py-2 rounded-full flex items-center gap-2 text-xs font-semibold tracking-widest uppercase transition-all duration-500 drop-shadow-sm group 
                          ${showTrunk 
                              ? 'bg-transparent border border-gray-400/40 text-gray-500 hover:text-blue-500 hover:border-blue-400/60 hover:bg-white/30 backdrop-blur-sm' 
                              : 'bg-white/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-white text-gray-600 hover:text-blue-500 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]'}`}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:scale-110 group-hover:rotate-[15deg] transition-transform duration-500"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      {showTrunk ? '隐藏结构主干' : '显示结构主干'}
                  </button>
                  
                  <AnimatePresence>
                      {showTrunk && (
                          <motion.div 
                              initial={{ opacity: 0, height: 0, scale: 0.95 }}
                              animate={{ opacity: 1, height: 'auto', scale: 1 }}
                              exit={{ opacity: 0, height: 0, scale: 0.95 }}
                              className="w-[90%] max-w-4xl"
                          >
                              <SentenceTrunk tokens={currentSentence.tokens} />
                          </motion.div>
                      )}
                  </AnimatePresence>
              </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}
