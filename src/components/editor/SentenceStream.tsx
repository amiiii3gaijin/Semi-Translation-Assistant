import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Eye } from 'lucide-react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { SentenceCard } from './SentenceCard';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { SentenceTrunk } from './SentenceTrunk';
import { Button } from '../common/Button';
import { UI_MOTION } from '../../design/motion';

export function SentenceStream() {
  const sentences = useDocumentStore(state => state.sentences);
  const currentActiveIndex = useDocumentStore(state => state.currentActiveIndex);
  const nextSentence = useDocumentStore(state => state.nextSentence);
  const prevSentence = useDocumentStore(state => state.prevSentence);
  const [showTrunk, setShowTrunk] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reducedMotion = useReducedMotion();
  useKeyboardShortcuts(textareaRef);

  const isWheeling = useRef(false);
  useEffect(() => {
    let cooldown: ReturnType<typeof setTimeout> | undefined;
    const handleWheel = (event: WheelEvent) => {
      if (isWheeling.current || event.ctrlKey || document.querySelector('dialog[open]')) return;
      const target = event.target instanceof Element ? event.target : null;
      // Tool panels have their own scroll context; don't flip the document underneath.
      if (target?.closest('.help-panel, .trunk-popover, [data-ribbon-dev]')) return;
      const scrollable = target?.closest('.overflow-y-auto');
      if (scrollable) {
        const { scrollTop, scrollHeight, clientHeight } = scrollable;
        const atTop = scrollTop <= 0;
        const atBottom = Math.abs(scrollHeight - clientHeight - scrollTop) <= 1;
        if (event.deltaY > 0 && !atBottom) return;
        if (event.deltaY < 0 && !atTop) return;
      }
      if (Math.abs(event.deltaY) <= 30) return;
      if (event.deltaY > 0) nextSentence(); else prevSentence();
      isWheeling.current = true;
      cooldown = setTimeout(() => { isWheeling.current = false; }, 400);
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearTimeout(cooldown);
      isWheeling.current = false;
    };
  }, [nextSentence, prevSentence]);

  if (!sentences.length) return null;
  const currentSentence = sentences[currentActiveIndex];
  const getCylinderStyles = (diff: number) => {
    const radius = 900;
    const angleDeg = diff * 22;
    const angleRad = angleDeg * Math.PI / 180;
    const isActive = diff === 0;
    return {
      y: radius * Math.sin(angleRad),
      z: radius * Math.cos(angleRad) - radius,
      rotateX: -angleDeg,
      scale: isActive ? 1 : 1 - Math.abs(diff) * 0.05,
      opacity: isActive ? 1 : Math.max(0, 1 - Math.abs(diff) * 0.25),
      filter: `blur(${isActive ? 0 : Math.abs(diff) * 0.8}px)`,
      zIndex: 50 - Math.abs(diff),
    };
  };

  return <div className="sentence-stream">
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ perspective: 1600 }}>
      <AnimatePresence custom={currentActiveIndex}>
        {sentences.map((sentence, index) => {
          const diff = index - currentActiveIndex;
          if (Math.abs(diff) > 4) return null;
          const isActive = diff === 0;
          return <motion.div key={sentence.id}
            initial={reducedMotion ? false : getCylinderStyles(index > currentActiveIndex ? 5 : -5)}
            animate={getCylinderStyles(diff)}
            variants={{ leave: (activeIndex: number) => getCylinderStyles(index < activeIndex ? -5 : 5) }}
            exit="leave"
            transition={reducedMotion ? { duration: 0 } : UI_MOTION.stream}
            className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="sentence-frame" style={{ pointerEvents: isActive ? 'auto' : 'none' }}>
              <SentenceCard sentence={sentence} isActive={isActive} textareaRef={isActive ? textareaRef : undefined} />
            </div>
          </motion.div>;
        })}
      </AnimatePresence>
    </div>
    {currentSentence && <div className="trunk-dock">
      <AnimatePresence>
        {showTrunk && <motion.div id="sentence-trunk" className="trunk-popover overflow-y-auto custom-scrollbar"
          initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={UI_MOTION.panel}>
          <SentenceTrunk tokens={currentSentence.tokens} />
        </motion.div>}
      </AnimatePresence>
      <Button className="trunk-toggle" aria-expanded={showTrunk} aria-controls="sentence-trunk"
        onClick={() => setShowTrunk(value => !value)}>
        <Eye className="ui-icon" aria-hidden="true" />{showTrunk ? '隐藏结构主干' : '显示结构主干'}
      </Button>
    </div>}
  </div>;
}

