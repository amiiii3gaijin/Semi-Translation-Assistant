import { motion } from 'motion/react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { UI_MOTION } from '../../design/motion';

export function TopProgressBar() {
  const total = useDocumentStore(state => state.totalSentences);
  const completed = useDocumentStore(state => state.completedSentences);
  const current = useDocumentStore(state => state.currentActiveIndex) + 1;
  if (!total) return null;
  const percentage = Math.max(0, Math.min(100, completed / total * 100));
  return <>
    <div className="progress-track" role="progressbar" aria-label="翻译进度"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}>
      <motion.div className="progress-fill" initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }} transition={UI_MOTION.control} />
    </div>
    <div className="progress-summary">
      <div className="progress-pill">
        <div className="progress-metric"><span className="progress-label">翻译进度</span><span className="progress-number">{Math.round(percentage)}%</span></div>
        <span className="progress-separator" aria-hidden="true" />
        <div className="progress-metric"><span className="progress-label">当前页</span><span className="progress-page" style={{ minWidth: `${String(total).length * 2 + 3}ch` }}>{current} / {total}</span></div>
      </div>
    </div>
  </>;
}

