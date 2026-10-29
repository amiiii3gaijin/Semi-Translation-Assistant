import { useState } from 'react';
import { CASES, type LabCase } from './cases';
import { analyzeCase, compare, LAB_LIMIT, makeBaseline, makeReport, readBaseline, validateCases, type Baseline, type CaseResult } from './engine';
import './lab.css';

const BASELINE_KEY = 'half-translation-tokenizer-lab-baseline-v1';
const reviewLabels = { proposed: '预期待确认', accepted: '已确认预期', unannotated: '未标注预期' };
const origins: Record<string, string> = { segmentit: 'Segmentit', lexicon: '词表细分', 'source-gap': '原文补齐', 'protected-run': '非中文 / 受保护片段', 'document-term': '文档术语', 'boundary-repair': '基础边界保护' };
const outcomes: Record<string, string> = { accepted: '已采用', overlap: '与较高优先级候选重叠', unaligned: '未对齐细词边界', 'single-token': '已经是单个细词', 'low-confidence': '结构标记冲突' };
const rules: Record<string, string> = {
  'paired-span': '成对引号 / 括号', 'statistical-expression': '统计表达式', 'author-year': '作者与年份',
  'figure-table': '图表编号', 'mixed-language-term': '中英混合术语', 'phrase-lexicon': '内置词组表',
  'latin-word-run': '连续英文单词', duration: '时长', 'adjacent-nouns': '相邻名词组合',
  'document-term': '文档术语',
};
function visible(text: string) { return text.replace(/ /g, '·').replace(/\t/g, '⇥').replace(/\r/g, '␍').replace(/\n/g, '↵\n'); }
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TokenizerLab() {
  const [corpus, setCorpus] = useState<LabCase[]>(CASES);
  const [sample, setSample] = useState<LabCase>(CASES[0]);
  const [results, setResults] = useState<CaseResult[]>([]);
  const [baseline, setBaseline] = useState<Baseline | null>(() => {
    try { return readBaseline(localStorage.getItem(BASELINE_KEY)); } catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('尚未分析。实验台不读取或修改工作区译文。');
  const [showWhitespace, setShowWhitespace] = useState(true);
  const [annotations, setAnnotations] = useState('');

  async function run(samples: LabCase[]) {
    setBusy(true); setMessage('正在分析…');
    const next: CaseResult[] = [];
    try {
      for (const item of samples) {
        await new Promise(resolve => setTimeout(resolve, 0));
        next.push(analyzeCase(item));
        setMessage(`正在分析 ${next.length} / ${samples.length}`);
      }
      setResults(next); setMessage(`已分析 ${next.length} 个样例。耗时包含首次词典初始化，不等于稳定性能基准。`);
    } catch (error) { setMessage(`分析未完成：${String(error)}`); }
    finally { setBusy(false); }
  }
  function choose(id: string) {
    const found = corpus.find(c => c.id === id);
    if (found) { setSample(found); setAnnotations(''); }
  }
  function saveBaseline() {
    const next = makeBaseline(results); setBaseline(next);
    try { localStorage.setItem(BASELINE_KEY, JSON.stringify(next)); setMessage('已保存对照；只会比较 ID 和原文均相同的样例。'); }
    catch { setMessage('浏览器无法保存对照；本次打开期间仍可比较，请下载对照备份。'); }
  }
  async function importCorpus(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('样例文件不能超过 2 MB。');
      const items = validateCases(JSON.parse((await file.text()).replace(/^\uFEFF/, '')));
      setCorpus(items); setSample(items[0]); setAnnotations(''); setMessage(`已载入 ${items.length} 个样例，请点击分析。`);
    } catch (error) { setMessage(`导入失败：${String(error)}`); }
  }
  async function importBaseline(file?: File) {
    if (!file) return;
    try {
      if (file.size > 4_000_000) throw new Error('对照文件不能超过 4 MB。');
      const next = readBaseline((await file.text()).replace(/^\uFEFF/, ''));
      if (!next) throw new Error('请选择实验台导出的对照 JSON。');
      setBaseline(next);
      try { localStorage.setItem(BASELINE_KEY, JSON.stringify(next)); setMessage('已导入并保存对照。'); }
      catch { setMessage('已导入对照；浏览器无法持久保存，本次打开期间仍可比较。'); }
    } catch (error) { setMessage(`导入对照失败：${String(error)}`); }
  }
  function saveSample() {
    try {
      const next = { ...sample, expectations: annotations.trim() ? JSON.parse(annotations) : sample.expectations };
      const nextCorpus = validateCases([...corpus.filter(c => c.id !== next.id), next]);
      setSample(next); setCorpus(nextCorpus);
      setMessage('已加入本次样例集。请下载样例集以长期保存；浏览器刷新不会保留未导出的新样例。');
    } catch (error) { setMessage(`预期格式有误：${String(error)}`); }
  }

  return <main className="tokenizer-lab custom-scrollbar">
    <header className="lab-header"><div><h1>分词实验台</h1><p>细词、词组与规则诊断 · 与半翻共用解析核心</p></div>
      <a href={window.location.pathname}>返回半翻</a></header>
    <section className="lab-panel">
      <div className="lab-toolbar"><label>样例 <select disabled={busy} value={sample.id} onChange={e => choose(e.target.value)}>
        {!corpus.some(c => c.id === sample.id) && <option value={sample.id}>自定义输入</option>}
        {corpus.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <label><input type="checkbox" checked={showWhitespace} onChange={e => setShowWhitespace(e.target.checked)} /> 显示空白记号</label></div>
      <label className="lab-input-label" htmlFor="lab-source">原文（最多 {LAB_LIMIT.toLocaleString()} 个字符）</label>
      <textarea id="lab-source" className="custom-scrollbar" value={sample.source} maxLength={LAB_LIMIT} disabled={busy}
        onChange={e => { setSample({ id: 'custom', title: '自定义输入', source: e.target.value, review: 'unannotated', expectations: [] }); setAnnotations(''); }} />
      {sample.note && <p>{sample.note}</p>}
      <div className="lab-toolbar">
        <button className="lab-primary" disabled={busy} onClick={() => void run([sample])}>分析当前原文</button>
        <button disabled={busy} onClick={() => void run(corpus)}>分析整个样例集（{corpus.length}）</button>
        <button disabled={busy || !results.length} onClick={() => download('tokenizer-report.json', makeReport(results))}>下载分析结果</button>
      </div>
      <details><summary>样例与预期管理</summary>
        <p>预期是部分约束，不是整句唯一答案。截图转录样例的预期尚待确认。新增样例先下载保存，以后可导入或交给我批量分析。</p>
        <div className="lab-toolbar"><label>ID <input value={sample.id} disabled={busy} onChange={e => setSample({ ...sample, id: e.target.value })} /></label>
          <label>名称 <input value={sample.title} disabled={busy} onChange={e => setSample({ ...sample, title: e.target.value })} /></label>
          <label>预期状态 <select disabled={busy} value={sample.review} onChange={e => setSample({ ...sample, review: e.target.value as LabCase['review'] })}>
            {Object.entries(reviewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label></div>
        <p>预期 JSON：token = 独立细词；group = 完整词组；no-group = 不应成组；boundary = 指定位置应有细词边界。occurrence 从 0 起，offset 使用 UTF-16。</p>
        <textarea aria-label="预期 JSON" value={annotations || JSON.stringify(sample.expectations, null, 2)} disabled={busy} onChange={e => setAnnotations(e.target.value)} />
        <div className="lab-toolbar"><button disabled={busy} onClick={saveSample}>保存到本次样例集</button>
          <button onClick={() => download('tokenizer-cases.json', corpus)}>下载样例集</button>
          <label>导入样例集 <input type="file" accept=".json,application/json" disabled={busy} onChange={e => { void importCorpus(e.target.files?.[0]); e.target.value = ''; }} /></label>
        </div>
      </details>
    </section>
    <section className="lab-panel">
      <div className="lab-toolbar"><button disabled={busy || !results.length} onClick={saveBaseline}>将显示结果保存为对照</button>
        <button disabled={!baseline} onClick={() => download('tokenizer-baseline.json', baseline)}>下载对照</button>
        <label>导入对照 <input type="file" accept=".json,application/json" disabled={busy} onChange={e => { void importBaseline(e.target.files?.[0]); e.target.value = ''; }} /></label>
        <button disabled={!baseline} onClick={() => { setBaseline(null); try { localStorage.removeItem(BASELINE_KEY); } catch { /* In-memory reset still works. */ } }}>清除对照</button></div>
      <p>{baseline ? `对照保存于 ${new Date(baseline.createdAt).toLocaleString()}，解析版本 ${baseline.parserVersion}` : '先分析并保存对照，之后修改解析规则，再分析同一批样例查看差异。'}</p>
      <p role="status" aria-live="polite">{message}</p>
    </section>
    {results.map(result => {
      const diff = compare(result, baseline);
      return <section className="lab-panel" key={result.id}>
        <h2>{result.title} <span className="lab-badge">{reviewLabels[result.review]}</span></h2>
        <p>解析版本 {result.parserVersion} · {result.sentences.length} 句 · {result.elapsedMs.toFixed(1)} ms ·
          {' '}{result.integrityErrors.length ? `完整性异常 ${result.integrityErrors.length} 项` : '原文与分词完整性通过'}</p>
        {result.integrityErrors.map((e, i) => <p className="lab-error" key={i}>{e}</p>)}
        <pre className="lab-source">{showWhitespace ? visible(result.source) : result.source}</pre>
        <details><summary>文档临时术语（{result.documentTerms.length}）</summary><p>根据明确释义和重复短标签提取；它们是规则推断，不是人工确认。术语仅作用于这份原文。</p>
          {result.documentTerms.map(term => <p key={term.text}>{term.text} · {term.count} 次 · {term.evidence === 'definition' ? '定义 / 中英释义' : '重复短标签'} · {term.pieces.join(' / ')}</p>)}</details>
        {!!result.checks.length && <details open><summary>预期检查（{result.checks.filter(c => c.status === 'pass').length}/{result.checks.length} 满足；不代表整体准确率）</summary>
          <ul>{result.checks.map((c, i) => <li key={i}>{c.status === 'pass' ? '满足' : c.status === 'invalid' ? '标注无效' : '不满足'} · {c.expectation.kind} · {c.expectation.text} · {c.detail}</li>)}</ul></details>}
        {result.sentences.map((sentence, index) => <div className="lab-sentence" key={index}>
          <h3>第 {index + 1} 句 <span className="lab-muted">原文起点 {sentence.offset}</span></h3>
          <div className="lab-tokens">{sentence.tokens.map((t, i) => <span className={t.isWhitespace ? 'lab-token lab-space' : 'lab-token'} key={t.id}
            title={`细词 ${i} · [${t.start}, ${t.end}) · ${t.pos} · ${origins[sentence.tokenTrace[i]?.origin] ?? '未知'}`}>
            {showWhitespace ? visible(t.text) : t.text}</span>)}</div>
          <p>词组：{sentence.groups.length ? sentence.groups.map(g => <span className="lab-group" key={g.id}>{g.label} <small>{g.autoSelect === false ? '手动扩选' : '自动整组'}</small></span>) : '未生成候选词组'}</p>
          <details><summary>细词偏移与来源</summary><div className="lab-table custom-scrollbar"><table><thead><tr><th>序号</th><th>文本</th><th>句内偏移</th><th>词性</th><th>来源</th></tr></thead><tbody>
            {sentence.tokens.map((t, i) => <tr key={t.id}><td>{i}</td><td className="lab-preserve">{visible(t.text)}</td><td>[{t.start}, {t.end})</td><td>{t.pos}</td><td>{origins[sentence.tokenTrace[i]?.origin] ?? '未知'}</td></tr>)}
          </tbody></table></div></details>
          <details><summary>词组规则追踪（{sentence.trace.length} 条）</summary><p>记录候选的筛选结果；有效候选按优先级决策。相邻名词组合仅供手动扩选。没有产生候选的规则不会列出。</p>
            <div className="lab-table custom-scrollbar"><table><thead><tr><th>候选</th><th>句内偏移</th><th>规则</th><th>结果</th><th>选择方式</th></tr></thead><tbody>
              {sentence.trace.map((t, i) => <tr key={i}><td>{t.label}</td><td>[{t.start}, {t.end})</td><td>{rules[t.rule] ?? t.rule}</td><td>{outcomes[t.outcome]}</td><td>{t.autoSelect ? '自动' : '手动'}</td></tr>)}
            </tbody></table></div></details>
        </div>)}
        <details><summary>与保存对照的差异</summary>{diff ? <>
          <p>新增 / 消失仅表示输出变化，不自动判定改善或退步。偏移按整篇原文计算。</p>
          {Object.entries({ '消失的细词': diff.removedTokens, '新增的细词': diff.addedTokens, '消失的词组': diff.removedGroups, '新增的词组': diff.addedGroups,
            '原完整性问题': diff.oldIntegrityErrors, '现完整性问题': diff.newIntegrityErrors }).map(([label, rows]) => <div key={label}><h3>{label}</h3><pre>{rows.length ? rows.join('\n') : '无'}</pre></div>)}
        </> : <p>未找到 ID 和原文均相同的对照，暂不比较。</p>}</details>
      </section>;
    })}
  </main>;
}
