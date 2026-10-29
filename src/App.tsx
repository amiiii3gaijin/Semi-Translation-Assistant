import { lazy, Suspense, useEffect, useState } from 'react';
import { ImportWorkspace } from './components/import/ImportWorkspace';

import { useDocumentStore } from './store/useDocumentStore';
import { SentenceStream } from './components/editor/SentenceStream';
import { TopProgressBar } from './components/layout/TopProgressBar';
import { ToastNotification } from './components/common/ToastNotification';
import { NavigationControls } from './components/common/NavigationControls';
import { Button } from './components/common/Button';
import { useAutoSave } from './hooks/useAutoSave';
import { useMilestoneTracker } from './hooks/useMilestone';

const RibbonDeveloperPanel = lazy(() => import('./components/dev/RibbonDeveloperPanel'));

export default function App() {
  const loadFromIndexedDB = useDocumentStore(state => state.loadFromIndexedDB);

  const documentId = useDocumentStore(state => state.documentId);
  const isImporting = useDocumentStore(state => state.isImporting);
  const importProgress = useDocumentStore(state => state.importProgress);

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

  if (isInitializing) return <main key="restoring" className="loading-screen">
    <section className="ui-panel loading-panel" aria-busy="true">
      <h1 className="ui-section-title">正在恢复工作区…</h1>
      <Button variant="quiet" shape="rounded" onClick={async () => {
        await useDocumentStore.getState().clearDocument(); window.location.reload();
      }}>重置并清理缓存</Button>
    </section>
  </main>;

  if (isImporting) return <main key="importing" className="loading-screen">
    <section className="ui-panel loading-panel" aria-busy="true" aria-label="导入原文">
      <div className="loading-heading"><span>正在整理原文…</span><span>{importProgress}%</span></div>
      <div className="loading-track" role="progressbar" aria-label="导入进度"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={importProgress}>
        <div className="loading-fill" style={{ width: `${importProgress}%` }} />
      </div>
      <Button variant="quiet" shape="rounded" onClick={async () => {
        await useDocumentStore.getState().clearDocument(); window.location.reload();
      }}>停止并清理缓存</Button>
    </section>
  </main>;

  if (!documentId) return <ImportWorkspace />;

  return <main key="workbench" className="workbench" aria-label="半翻工作区">
    <TopProgressBar /><SentenceStream /><NavigationControls /><ToastNotification />
    {showRibbonPanel && <Suspense fallback={null}><RibbonDeveloperPanel onClose={() => setShowRibbonPanel(false)} /></Suspense>}
  </main>;
}

