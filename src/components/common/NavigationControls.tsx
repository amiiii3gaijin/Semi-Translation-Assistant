import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, Copy, Download, Info, X } from 'lucide-react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useUIStore } from '../../store/useUIStore';
import { exportToTXT, translationText } from '../../utils/fileExporter';
import { copyToClipboard } from '../../utils/clipboard';
import { Button } from './Button';
import { ExitDialog } from './ExitDialog';
import { UI_MOTION } from '../../design/motion';
import { usePreferencesStore } from '../../store/usePreferencesStore';

const shortcuts = [
  ['前后切句', 'PgUp / PgDn'],
  ['上一句', '小键盘 +'],
  ['逐词移动 / 调整选区', '4 / 6'],
  ['上移一行 / 下移一行', '8 / 2'],
  ['扩成词组 / 收回', '9 / 7'],
  ['按下选择，松开插入', '5'],
  ['取消预选 / 本次抓取', '1'],
  ['完成并切到下一句', 'Enter'],
  ['换行', 'Shift + Enter'],
  ['导出并复制', 'F2'],
];

export function NavigationControls() {
  const nextSentence = useDocumentStore(state => state.nextSentence);
  const prevSentence = useDocumentStore(state => state.prevSentence);
  const clearDocument = useDocumentStore(state => state.clearDocument);
  const currentIndex = useDocumentStore(state => state.currentActiveIndex);
  const total = useDocumentStore(state => state.totalSentences);
  const originalFontSize = useDocumentStore(state => state.originalFontSize);
  const translationFontSize = useDocumentStore(state => state.translationFontSize);
  const setOriginalFontSize = useDocumentStore(state => state.setOriginalFontSize);
  const setTranslationFontSize = useDocumentStore(state => state.setTranslationFontSize);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const autoSelectGroups = usePreferencesStore(state => state.autoSelectGroups);
  const { spaceCapturedWords, showPhraseMarkers, setSpaceCapturedWords, setShowPhraseMarkers } = usePreferencesStore();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const helpDock = useRef<HTMLDivElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showShortcuts) return;
    const outside = (event: PointerEvent) => {
      if (!helpDock.current?.contains(event.target as Node)) setShowShortcuts(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowShortcuts(false);
        helpButton.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [showShortcuts]);

  return <>
    {showExitConfirm && <ExitDialog onClose={() => setShowExitConfirm(false)} onConfirm={async () => {
      await clearDocument();
      setShowExitConfirm(false);
    }} />}
    <div className="toolbar-left">
      <Button aria-label="退出工作区" title="退出工作区" onClick={() => { setShowShortcuts(false); setShowExitConfirm(true); }}>
        <X className="ui-icon" aria-hidden="true" /><span className="toolbar-label">退出工作区</span>
      </Button>
    </div>
    <div className="toolbar-right">
      <Button aria-label="复制成果" title="复制成果" onClick={async () => {
        const success = await copyToClipboard(translationText(useDocumentStore.getState()));
        useUIStore.getState().showToast(success ? '已复制全部译文。' : '复制失败，请重试。');
      }}><Copy className="ui-icon" aria-hidden="true" /><span className="toolbar-label">复制成果</span></Button>
      <Button aria-label="导出译文" title="导出译文" onClick={() => exportToTXT(useDocumentStore.getState())}>
        <Download className="ui-icon" aria-hidden="true" /><span className="toolbar-label">一键导出</span>
      </Button>
    </div>

    <div ref={helpDock} className="help-dock">
      <AnimatePresence>
        {showShortcuts && <motion.section id="workspace-help" aria-labelledby="help-title"
          className="ui-panel help-panel overflow-y-auto custom-scrollbar"
          initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={UI_MOTION.panel}>
          <div className="help-panel-heading">
            <h2 id="help-title" className="ui-section-title">显示设置</h2>
            <Button variant="quiet" shape="rounded" aria-label="关闭帮助" onClick={() => {
              setShowShortcuts(false); helpButton.current?.focus({ preventScroll: true });
            }}><X className="ui-icon" aria-hidden="true" /></Button>
          </div>
          <div className="help-settings">
            <label className="preference-toggle">
              <span>自动整组选词</span>
              <input type="checkbox" role="switch" checked={autoSelectGroups}
                onChange={event => usePreferencesStore.getState().setAutoSelectGroups(event.target.checked)} />
            </label>
            <label className="preference-toggle">
              <span>显示词组标记</span>
              <input type="checkbox" role="switch" checked={showPhraseMarkers}
                onChange={event => setShowPhraseMarkers(event.target.checked)} />
            </label>
            <div>
              <label className="preference-toggle">
                <span>抓取时按细词加空格</span>
                <input type="checkbox" role="switch" checked={spaceCapturedWords}
                  onChange={event => setSpaceCapturedWords(event.target.checked)} />
              </label>
              <p className="ui-caption help-copy">只影响新抓取的内容，保留原有空白与引用格式。</p>
            </div>
            <label>
              <span className="help-setting-label"><span>原文字号</span><span>{originalFontSize}px</span></span>
              <input className="ui-range" type="range" min="16" max="40" value={originalFontSize}
                onChange={event => setOriginalFontSize(Number(event.target.value))} />
            </label>
            <label>
              <span className="help-setting-label"><span>译文字号</span><span>{translationFontSize}px</span></span>
              <input className="ui-range" type="range" min="16" max="40" value={translationFontSize}
                onChange={event => setTranslationFontSize(Number(event.target.value))} />
            </label>
          </div>
          <div className="help-divider" />
          <h3 className="ui-section-title">快捷键</h3>
          <p className="ui-caption help-copy">高级词组线调参：Ctrl + Alt + Shift + F9 打开或关闭。</p>
          <ul className="shortcut-list">
            {shortcuts.map(([label, key]) => <li key={key}><span>{label}</span>
              <kbd className={key === '5' ? 'shortcut-primary' : undefined}>{key}</kbd></li>)}
          </ul>
          <p className="ui-caption help-copy">数字键指小键盘。按住 5，用 4/6 连续选词；9 扩展当前块，7 收回。也可先按 9 预选，再点按 5。</p>
          <p className="ui-caption help-copy">贴近文字的灰色圆头线标出候选词组，蓝色胶囊表示整个选区。隐藏标记后仍可用 9/7 扩缩。鼠标直接拖选，松开插入。</p>
          <p className="ui-caption help-copy">小键盘 + 返回上一句，Enter 完成并进入下一句；主键盘加号正常输入。</p>
          <p className="ui-caption help-copy">自动整组选词开启时，进入词组即选整组；7 收回到首个细词，离开该组前保持细选，9 可重新扩组。长引文需按 9 确认。</p>
          <p className="ui-caption help-copy">8/2 按屏幕实际行上下移动，尽量保持横向位置；按住 5 或手动预选时不换行。括号、引号和运算符可用键盘定位；普通停顿标点跳过，但范围抓取仍保留。3 暂无快捷功能。</p>
        </motion.section>}
      </AnimatePresence>
      <Button ref={helpButton} shape="round" aria-label="显示设置与快捷键" title="显示设置与快捷键"
        aria-expanded={showShortcuts} aria-controls="workspace-help" onClick={() => setShowShortcuts(value => !value)}>
        <Info className="ui-icon" aria-hidden="true" />
      </Button>
    </div>
    <nav className="sentence-navigation" aria-label="句子导航">
      <Button shape="round" aria-label="上一句" title="上一句 · 小键盘 + / PageUp" disabled={currentIndex <= 0} onClick={prevSentence}>
        <ChevronUp className="ui-icon" aria-hidden="true" />
      </Button>
      <Button variant="primary" shape="round" aria-label="下一句" title="下一句 · PageDown" disabled={currentIndex >= total - 1} onClick={nextSentence}>
        <ChevronDown className="ui-icon" aria-hidden="true" />
      </Button>
    </nav>
  </>;
}

