import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';
import { useDocumentStore } from './store/useDocumentStore';
import { SentenceStream } from './components/editor/SentenceStream';
import { TopProgressBar } from './components/layout/TopProgressBar';
import { ToastNotification } from './components/common/ToastNotification';
import { NavigationControls } from './components/common/NavigationControls';
import { Button } from './components/common/Button';
import { useAutoSave } from './hooks/useAutoSave';
import { useMilestoneTracker } from './hooks/useMilestone';
import { UI_MOTION } from './design/motion';
const RibbonDeveloperPanel = lazy(() => import('./components/dev/RibbonDeveloperPanel'));

export default function App() {
  const loadFromIndexedDB = useDocumentStore(state => state.loadFromIndexedDB);
  const importDocument = useDocumentStore(state => state.importDocument);
  const documentId = useDocumentStore(state => state.documentId);
  const isImporting = useDocumentStore(state => state.isImporting);
  const importProgress = useDocumentStore(state => state.importProgress);
  const [inputText, setInputText] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showRibbonPanel, setShowRibbonPanel] = useState(false);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.code !== 'F9' || !event.ctrlKey || !event.altKey || !event.shiftKey || event.metaKey || event.isComposing) return;
      if (!documentId || isImporting || document.querySelector('dialog[open]')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) setShowRibbonPanel(value => !value);
    };
    window.addEventListener('keydown', toggle, true);
    return () => window.removeEventListener('keydown', toggle, true);
  }, [documentId, isImporting]);
  useEffect(() => { setShowRibbonPanel(false); }, [documentId]);
  useAutoSave();
  useMilestoneTracker();
  useEffect(() => { loadFromIndexedDB().finally(() => setIsInitializing(false)); }, [loadFromIndexedDB]);

  if (isInitializing) return <main className="loading-screen">
    <section className="ui-panel loading-panel" aria-busy="true">
      <h1 className="ui-section-title">正在恢复工作区…</h1>
      <Button variant="quiet" shape="rounded" onClick={async () => {
        await useDocumentStore.getState().clearDocument(); window.location.reload();
      }}>重置并清理缓存</Button>
    </section>
  </main>;

  if (isImporting) return <main className="loading-screen">
    <section className="ui-panel loading-panel" aria-busy="true" aria-label="导入原文">
      <div className="loading-heading"><span>正在整理原文…</span><span>{importProgress}%</span></div>
      <div className="loading-track" role="progressbar" aria-label="导入进度"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={importProgress}>
        <div className="loading-fill" style={{ width: `${importProgress}%` }} />
      </div>
      <Button variant="danger" shape="rounded" onClick={async () => {
        await useDocumentStore.getState().clearDocument(); window.location.reload();
      }}>停止并清理缓存</Button>
    </section>
  </main>;

  if (!documentId) return <main className="import-screen">
    <section className="import-card" aria-labelledby="app-title">
      <h1 id="app-title" className="import-title">半翻</h1>
      <div className="import-field">
        <textarea className="import-textarea custom-scrollbar" aria-label="待翻译原文"
          placeholder="在此粘贴或输入原文内容…" value={inputText} onChange={event => setInputText(event.target.value)} />
        <AnimatePresence>
          {inputText && <motion.div className="import-clear" initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={UI_MOTION.control}>
            <Button variant="quiet" shape="round" aria-label="清空原文" title="清空原文" onClick={() => setInputText('')}>
              <X className="ui-icon" aria-hidden="true" />
            </Button>
          </motion.div>}
        </AnimatePresence>
      </div>
      <Button variant="ink" shape="rounded" className="import-submit" disabled={!inputText.trim()}
        onClick={() => importDocument(inputText)}>
        进入工作区 <ArrowRight className="ui-icon" aria-hidden="true" />
      </Button>
    </section>
  </main>;

  return <main className="workbench" aria-label="半翻工作区">
    <TopProgressBar /><SentenceStream /><NavigationControls /><ToastNotification />
    {showRibbonPanel && <Suspense fallback={null}><RibbonDeveloperPanel onClose={() => setShowRibbonPanel(false)} /></Suspense>}
  </main>;
}

