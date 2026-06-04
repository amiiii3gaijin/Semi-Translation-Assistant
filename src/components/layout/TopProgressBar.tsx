import { useDocumentStore } from '../../store/useDocumentStore';
import { motion } from 'motion/react';

export function TopProgressBar() {
  const totalSentences = useDocumentStore((state) => state.totalSentences);
  const completedSentences = useDocumentStore((state) => state.completedSentences);

  if (totalSentences === 0) return null;

  const percentage = (completedSentences / totalSentences) * 100;

  return (
    <div className="absolute top-0 left-0 w-full z-[100] pointer-events-none">
      <div className="w-full h-1.5 bg-white/30 backdrop-blur-md flex items-center justify-center relative shadow-sm border-b border-white/20">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        />
      </div>
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1 drop-shadow-sm">Translation Progress</div>
          <div className="flex items-baseline gap-2 bg-white/60 backdrop-blur-xl px-5 py-1.5 rounded-full border border-white/80 shadow-md">
             <span className="text-xl font-bold text-gray-800 tracking-tight">{Math.round(percentage)}%</span>
             <span className="text-xs font-semibold text-gray-600">· {completedSentences} / {totalSentences}</span>
          </div>
      </div>
    </div>
  );
}
