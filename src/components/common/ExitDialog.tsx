import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './Button';
import { UI_MOTION } from '../../design/motion';

export function ExitDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className="ui-dialog" role="dialog" aria-modal="true"
    aria-labelledby="exit-title" aria-describedby="exit-description"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <motion.div className="ui-modal-content" initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }} transition={UI_MOTION.panel}>
      <h2 id="exit-title" className="ui-dialog-title">退出工作区</h2>
      <p id="exit-description" className="ui-dialog-copy">退出将清空当前工作区。请先导出需要保留的译文。</p>
      <div className="ui-dialog-actions">
        <Button variant="quiet" shape="rounded" autoFocus disabled={busy} onClick={onClose}>取消</Button>
        <Button variant="primary" shape="rounded" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await onConfirm(); } finally { setBusy(false); }
        }}>{busy ? '正在退出…' : '确认退出'}</Button>
      </div>
    </motion.div>
  </dialog>;
}
