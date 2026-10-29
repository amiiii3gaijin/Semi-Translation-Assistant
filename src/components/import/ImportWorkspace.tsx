import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Copy, X } from 'lucide-react';
import localforage from 'localforage';
import { Button } from '../common/Button';
import { UI_MOTION } from '../../design/motion';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useUIStore } from '../../store/useUIStore';
import { ToastNotification } from '../common/ToastNotification';
import { copyToClipboard, scheduleClipboardCopy } from '../../utils/clipboard';
import { prepareImport, makePrompt, validateReply, buildAssistedSentences, type Preparation } from '../../utils/llmImport';

type Mode = 'local' | 'llm';
interface Draft { version: 2; source: string; mode: Mode; preparation: Preparation | null; reply: string; copied: boolean }
const DRAFT_KEY = 'half-translation-import-draft-v2';
const emptyDraft: Draft = { version: 2, source: '', mode: 'local', preparation: null, reply: '', copied: false };

export function ImportWorkspace() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manualCopy, setManualCopy] = useState('');
  const [saveError, setSaveError] = useState(false);
  const queue = useRef(Promise.resolve());
  const finishing = useRef(false);
  const lock = useRef(false);
  const copyField = useRef<HTMLTextAreaElement>(null);
  const reduced = useReducedMotion();
  const { preparation: prep } = draft;
  const patch = (change: Partial<Draft>) => { setDraft(d => ({ ...d, ...change })); setError(''); setNotice(''); };

  useEffect(() => {
    let active = true;
    Promise.all([localforage.getItem<Draft>(DRAFT_KEY), localforage.getItem<Mode>('half-translation-import-mode'), localforage.getItem<any>('half-translation-import-draft-v1')]).then(([saved, mode, legacy]) => {
      if (!active) return;
      if (saved?.version === 2 && typeof saved.source === 'string' && typeof saved.reply === 'string' && (!saved.preparation || saved.preparation.version === 2)) {
        // Preserve an in-flight reply and its document key, but retire hidden preferences.
        setDraft({ version: 2, source: saved.source, mode: saved.mode, reply: saved.reply, copied: saved.copied,
          preparation: saved.preparation ? { ...saved.preparation, requirements: '' } : null });
      }
      else if (legacy && typeof legacy.source === 'string' && legacy.source.trim()) {
        setDraft({ ...emptyDraft, source: legacy.source, mode: legacy.mode === 'llm' ? 'llm' : 'local' });
        setNotice('已保留旧版原文。新版无需分批，请重新准备任务；旧回复仍保留在本地备份中。');
      } else if (mode === 'llm') setDraft({ ...emptyDraft, mode });
    }).catch(() => { if (active) setSaveError(true); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || finishing.current) return;
    // Serialize saves so an older response cannot overwrite the newest draft.
    queue.current = queue.current.then(async () => {
      if (finishing.current) return;
      await localforage.setItem(DRAFT_KEY, draft);
      await localforage.setItem('half-translation-import-mode', draft.mode);
      setSaveError(false);
    }).catch(() => setSaveError(true));
  }, [draft, ready]);
  useEffect(() => { if (manualCopy) { copyField.current?.focus(); copyField.current?.select(); } }, [manualCopy]);

  const showCopyResult = (text: string, success: boolean) => {
    if (success) {
      setNotice(''); setManualCopy('');
      setDraft(d => ({ ...d, copied: true }));
      useUIStore.getState().showToast('已复制完整任务，可以直接粘贴给 LLM。');
    } else {
      setDraft(d => ({ ...d, copied: false }));
      setManualCopy(text); setNotice('自动复制未成功，请在下方选中的内容上按 Ctrl+C。');
    }
  };
  const copy = async (text: string) => {
    showCopyResult(text, await copyToClipboard(text));
  };
  const clearDraft = async () => {
    finishing.current = true;
    await queue.current;
    await localforage.setItem(DRAFT_KEY, { ...emptyDraft, mode: draft.mode });
  };
  const acceptReply = (text: string) => {
    if (!text.trim()) { setNotice('剪贴板为空，已保留当前回复。'); return; }
    if (text.includes('全文（id 仅用于例外定位') || text === (prep ? makePrompt(prep) : '')) {
      setNotice('这是发给 LLM 的任务，请复制 LLM 的完整回复。'); return;
    }
    patch({ reply: text });
  };
  const begin = async () => {
    if (lock.current) return;
    lock.current = true; setError(''); setBusy(draft.mode === 'llm' ? '正在准备任务…' : '正在整理原文…');
    try {
      if (draft.mode === 'local') {
        await clearDraft();
        await useDocumentStore.getState().importDocument(draft.source);
      } else {
        const pending = prepareImport(draft.source, '');
        const text = pending.then(makePrompt);
        // Attach a handler even when the clipboard API is unavailable.
        void text.catch(() => {});
        const copying = scheduleClipboardCopy(text);
        const preparation = await pending;
        patch({ preparation, reply: '', copied: false });
        const task = makePrompt(preparation);
        const copied = copying ? await copying : false;
        showCopyResult(task, copied || await copyToClipboard(task));
      }
    } catch (e) { finishing.current = false; setError(e instanceof Error ? e.message : '未能准备任务，请重试。'); }
    finally { lock.current = false; setBusy(''); }
  };
  const validate = async () => {
    if (!prep || lock.current) return;
    lock.current = true; setBusy('正在核对原文与词组…'); setError('');
    try {
      await new Promise(r => setTimeout(r, 30));
      const result = validateReply(draft.reply, prep);
      const sentences = await buildAssistedSentences(prep, result);
      finishing.current = true;
      await useDocumentStore.getState().importAssistedDocument(prep.source, sentences);
      await clearDraft();
    } catch (e) { finishing.current = false; setError(e instanceof Error ? e.message : '校验失败，请重试。'); }
    finally { lock.current = false; setBusy(''); }
  };
  const prompt = prep ? makePrompt(prep) : '';
  const repair = `上一份结果未通过校验：${error}\n请按以下任务修正并返回一个完整结果，仅含去重的表达和必要局部例外，不逐句重复登记。\n\n${prompt}`;
  const transition = reduced ? { duration: 0 } : UI_MOTION.stream;
  if (!ready) return <main className="loading-screen"><p className="ui-caption">正在恢复导入草稿…</p></main>;

  return <main className="import-screen custom-scrollbar">
    <motion.section layout className={`import-card ${prep ? 'import-card--preparation' : ''}`} transition={transition} aria-labelledby="app-title" aria-busy={!!busy}>
      <motion.div layout="position" transition={transition} className="import-heading">
        <h1 id="app-title" className="import-title">{prep ? '粘贴 LLM 回复' : '半翻'}</h1>
        {prep && <Button variant="quiet" disabled={!!busy} onClick={() => { patch({ preparation: null }); setManualCopy(''); }}><ArrowLeft className="ui-icon" />修改原文</Button>}
      </motion.div>
      <AnimatePresence mode="wait" initial={false}>
        {!prep ? <motion.div key="source" initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={reduced ? { duration: 0 } : UI_MOTION.panel}>
          <div className="import-mode" role="group" aria-label="分词方式">
            {([['local', '本地分词'], ['llm', 'LLM 辅助']] as const).map(([mode, label]) => <button key={mode} disabled={!!busy} aria-pressed={draft.mode === mode} onClick={() => patch({ mode })}>
              {draft.mode === mode && <motion.span layoutId="import-mode-face" className="import-mode-face" transition={transition} />}
              <span>{label}</span>
            </button>)}
          </div>
          <p className="import-mode-description">{draft.mode === 'local' ? '粘贴原文，直接开始。' : '准备任务发给 LLM，再粘贴回复。'}</p>
          <div className="import-field">
            <textarea className="import-textarea custom-scrollbar" aria-label="待翻译原文" disabled={!!busy} placeholder="在此粘贴或输入原文内容…" value={draft.source} onChange={e => patch({ source: e.target.value, reply: '', copied: false })} />
            {draft.source && <div className="import-clear"><Button variant="quiet" shape="round" aria-label="清空原文" disabled={!!busy} onClick={() => patch({ source: '', reply: '', copied: false })}><X className="ui-icon" /></Button></div>}
          </div>
          <div className="import-start-actions">
            <Button className="import-submit" variant="primary" disabled={!!busy || !draft.source.trim()} onClick={begin}>{busy || (draft.mode === 'local' ? '进入工作区' : '准备并复制任务')}<ArrowRight className="ui-icon" /></Button>
          </div>
        </motion.div> : <motion.div key="preparation" initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={reduced ? { duration: 0 } : UI_MOTION.panel}>
          <p className="import-intro">将任务发给 LLM，把它的完整回复粘贴到下方。</p>
          {prep.source.length > 30000 && <p className="import-length-note">原文较长，请使用能容纳全文的模型。</p>}
          <section className="import-send-row" aria-labelledby="send-title">
            <div><h2 id="send-title"><span className="import-step-number">{draft.copied ? <Check className="ui-icon" /> : '1'}</span>{draft.copied ? '任务已复制' : '复制任务'}</h2>
            </div>
            <Button variant={draft.copied || draft.reply ? 'surface' : 'primary'} disabled={!!busy} onClick={() => copy(prompt)}><Copy className="ui-icon" />{draft.copied ? '重新复制' : '复制完整任务'}</Button>
          </section>
          <motion.section layout="position" transition={transition} className="import-receive" aria-label="粘贴回复并开始">
            <div className="import-field import-reply-field">
              <textarea className="import-textarea custom-scrollbar" aria-label="LLM 完整回复" placeholder="在此粘贴完整回复（Ctrl+V）…" disabled={!!busy} value={draft.reply} onChange={e => patch({ reply: e.target.value })}
                onPaste={event => { event.preventDefault(); acceptReply(event.clipboardData.getData('text/plain')); }} />
            </div>
            {error && <div className="import-feedback" role="alert"><p>{error}</p><Button variant="surface" disabled={!!busy} onClick={() => copy(repair)}><Copy className="ui-icon" />复制修复请求</Button></div>}
            <div className="import-action-row import-final-action"><Button variant="primary" disabled={!!busy || !draft.reply.trim()} onClick={validate}>{busy || '开始翻译'}<ArrowRight className="ui-icon" /></Button></div>
          </motion.section>
        </motion.div>}
      </AnimatePresence>
      {error && !prep && <div className="import-feedback" role="alert"><p>{error}</p></div>}
      {(notice || saveError) && <p className="import-status ui-caption" role="status" aria-live="polite">{notice || '草稿保存失败，请暂时不要关闭页面。'}</p>}
      {manualCopy && <div className="import-field"><textarea ref={copyField} readOnly value={manualCopy} className="import-textarea custom-scrollbar" aria-label="手动复制任务" /></div>}
    </motion.section>
    <ToastNotification />
  </main>;
}
