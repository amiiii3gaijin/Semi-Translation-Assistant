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

  return (
    <div className="w-full h-screen overflow-hidden relative bg-transparent flex items-center justify-center">
       
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ perspective: '1600px' }}>
          <AnimatePresence>
            {sentences.map((sentence, index) => {
                const diff = index - currentActiveIndex;
                
                // Show more items so the spherical background feels complete
                if (Math.abs(diff) > 4) return null;

                const isActive = diff === 0;
                
                // Cylinder projection
                const radius = 900;
                const angleDeg = diff * 22; // 22 degrees per card
                const angleRad = angleDeg * (Math.PI / 180);
                
                const y = radius * Math.sin(angleRad);
                const z = radius * Math.cos(angleRad) - radius;
                const rotateX = -angleDeg;

                const scale = isActive ? 1 : 1 - (Math.abs(diff) * 0.05);
                const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(diff) * 0.25);
                const blurValue = isActive ? 0 : Math.abs(diff) * 2.5;
                const zIndex = 50 - Math.abs(diff);

                return (
                   <motion.div
                      key={sentence.id}
                      initial={false}
                      animate={{
                          y,
                          z,
                          rotateX,
                          scale,
                          opacity,
                          filter: `blur(${blurValue}px)`,
                          zIndex
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
                      className="text-[13px] font-bold tracking-widest text-gray-500 hover:text-blue-500 uppercase flex items-center gap-2 transition-all opacity-80 hover:opacity-100 bg-white/70 backdrop-blur-md px-6 py-2.5 rounded-full shadow-sm hover:shadow border border-white/60 mb-2"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
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
                              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/60">
                                  <SentenceTrunk tokens={currentSentence.tokens} />
                              </div>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}
