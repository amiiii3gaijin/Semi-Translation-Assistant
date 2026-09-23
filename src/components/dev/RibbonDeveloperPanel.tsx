import { useEffect, useState } from 'react';
import { Button } from '../common/Button';
import { copyToClipboard } from '../../utils/clipboard';
import { useDocumentStore } from '../../store/useDocumentStore';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { getRibbonParameters, RIBBON_DEFAULTS, RIBBON_ENGINE, RIBBON_FIELDS, RIBBON_SCHEMA,
  ribbonEditor, ribbonReadings, RibbonReading, useRibbonEditor } from '../../design/ribbonParameters';
import './ribbonDeveloper.css';

function ParameterNumber({ field, value, disabled }: {
  field: typeof RIBBON_FIELDS[number]; value: number; disabled: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  return <input className="ribbon-dev-number" type="number" aria-label={`${field.label}数值`}
    min={field.min} max={field.max} step={field.step} value={text} disabled={disabled}
    onChange={event => {
      setText(event.target.value);
      const next = event.target.valueAsNumber;
      if (Number.isFinite(next) && next >= field.min && next <= field.max) ribbonEditor.set(field.key, next);
    }}
    onBlur={() => {
      const parsed = text.trim() === '' ? value : Number(text);
      const next = Number.isFinite(parsed) ? Math.max(field.min, Math.min(field.max, parsed)) : value;
      setText(String(next)); ribbonEditor.set(field.key, next);
    }} />;
}

export default function RibbonDeveloperPanel({ onClose }: { onClose: () => void }) {
  const [left, setLeft] = useState(false);
  const [readings, setReadings] = useState<RibbonReading[]>([]);
  const [message, setMessage] = useState('');
  const [exportText, setExportText] = useState('');
  const state = useRibbonEditor();
  const visible = usePreferencesStore(s => s.showPhraseMarkers);
  const activeIndex = useDocumentStore(s => s.currentActiveIndex);
  const fontSize = useDocumentStore(s => s.originalFontSize);
  const shown = state.comparing && state.reference ? state.reference : state.draft;
  const focusEditor = () => document.querySelector<HTMLTextAreaElement>('textarea[data-sentence-id]')?.focus({ preventScroll: true });

  useEffect(() => {
    setReadings([]);
    const unsubscribe = ribbonReadings.subscribe(setReadings);
    window.dispatchEvent(new Event('ribbon-dev-refresh'));
    return unsubscribe;
  }, [visible, activeIndex]);

  const copy = async () => {
    const payload = JSON.stringify({
      schemaVersion: RIBBON_SCHEMA, engine: RIBBON_ENGINE,
      exportedAt: new Date().toISOString(), units: 'distances calibrated at 25px source font',
      activePreset: state.comparing ? 'reference' : 'draft',
      parameters: getRibbonParameters(), draft: state.draft, reference: state.reference,
      context: { originalFontSize: fontSize, viewport: { width: innerWidth, height: innerHeight }, devicePixelRatio },
    }, null, 2);
    setExportText(payload);
    const copied = await copyToClipboard(payload);
    setMessage(copied ? '参数已复制，可以直接发给我。' : '自动复制失败，请从下方文本框手动复制。');
  };

  return <aside className={`ribbon-dev-dock ${left ? 'ribbon-dev-left' : ''}`} data-ribbon-dev
    aria-label="词组线开发调参" onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { onClose(); focusEditor(); }
    }}>
    <section className="ui-panel ribbon-dev-panel">
        <header><strong>词组线调参</strong><span>高级设置</span></header>
        <div className="ribbon-dev-actions">
          <Button variant="quiet" onClick={() => setLeft(value => !value)}>移到{left ? '右' : '左'}侧</Button>
          <Button variant="quiet" onClick={() => { onClose(); focusEditor(); }}>收起</Button>
          <Button variant="quiet" onClick={focusEditor}>返回键盘操作</Button>
        </div>
        <div className="ribbon-dev-scroll custom-scrollbar">
        <p className="ui-caption">距离以 25px 原文字号为基准，随字号适配，线宽和抬升保留小字号下限。当前字号 {fontSize}px。面板不改变原文换行。</p>
        {!visible && <p className="ribbon-dev-notice">词组标记已隐藏。<button onClick={() => usePreferencesStore.getState().setShowPhraseMarkers(true)}>显示标记</button></p>}
        <div className="ribbon-dev-comparison" role="group" aria-label="参数对比">
          <Button variant={!state.comparing ? 'primary' : 'quiet'} aria-pressed={!state.comparing} onClick={() => ribbonEditor.compare(false)}>当前调整</Button>
          <Button variant={state.comparing ? 'primary' : 'quiet'} disabled={!state.reference} aria-pressed={state.comparing} onClick={() => ribbonEditor.compare(true)}>保存的对照</Button>
        </div>
        {state.comparing && <p className="ui-caption">正在查看对照，参数暂不可编辑。切回“当前调整”继续。</p>}
        <div className="ribbon-dev-fields">
          {RIBBON_FIELDS.map(field => <div className="ribbon-dev-field" key={field.key}>
            <label htmlFor={`ribbon-${field.key}`}>{field.label}</label>
            <div>
              <input id={`ribbon-${field.key}`} className="ui-range" type="range" min={field.min} max={field.max} step={field.step}
                value={shown[field.key]} disabled={state.comparing}
                onChange={event => ribbonEditor.set(field.key, Number(event.target.value))} />
              <ParameterNumber field={field} value={shown[field.key]} disabled={state.comparing} />
              <button disabled={state.comparing} aria-label={`重置${field.label}`} title="恢复此项默认值"
                onClick={() => ribbonEditor.set(field.key, RIBBON_DEFAULTS[field.key])}>重置</button>
            </div>
            <small>{field.unit}</small>
          </div>)}
        </div>
        <section className="ribbon-dev-readings" aria-label="抬升采样读数">
          <strong>当前抬升：目标 → 避让后</strong>
          <p className="ui-caption">来自可见词组路径采样的峰值，单位为当前字号下的页面 px；约每秒最多 10 次更新，不是逐字精确间隔。</p>
          {!visible ? <p>标记隐藏时不采样。</p> : readings.length === 0 ? <p>当前没有受到托举的词组线。</p>
            : readings.slice(0, 8).map((row, i) => <div key={i}><span>{row.label}</span><output>{row.target.toFixed(2)} → {row.actual.toFixed(2)} px</output></div>)}
          {readings.length > 8 && <p>另有 {readings.length - 8} 条受影响线，面板仅列前 8 条。</p>}
        </section>
        <div className="ribbon-dev-actions">
          <Button disabled={state.comparing} onClick={() => { ribbonEditor.saveReference(); setMessage('已将当前调整保存为对照。'); }}>保存当前为对照</Button>
          <Button variant="quiet" onClick={() => { ribbonEditor.reset(); setMessage('已恢复默认；保存的对照仍保留。'); }}>恢复全部默认</Button>
          <Button variant="primary" onClick={copy}>复制全部参数</Button>
        </div>
        <p role="status" className="ui-caption">{message}</p>
        {state.storageFailed && <p role="alert" className="ribbon-dev-notice">浏览器未能保存参数，请先复制备份，避免刷新后丢失。</p>}
        {exportText && <details><summary>导出快照（复制时生成）</summary><textarea readOnly aria-label="参数导出快照" value={exportText} onFocus={event => event.target.select()} /></details>}
        </div>
      </section>
  </aside>;
}
