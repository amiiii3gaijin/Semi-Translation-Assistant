import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { prepareImport, buildAssistedSentences, makePrompt } from '../src/utils/llmImport';

// Replay the user's supplied V2 decisions, not a fresh model run. Only the
// document fingerprint is rebound to the locally saved source fixture.
const source = await readFile('local-only/icai-platform-source.txt', 'utf8');
const prep = await prepareImport(source, '');
const terms = ['长视频会员平台', '会员服务', '提前看新剧集', '会员协议', '4K 投屏', '投屏清晰度', '旧版 App', '撤回按钮', '分组测试', '弹出广告', '开屏广告', '免费用户', '投票权', '互操作', '用户合同', '学术来源'];
const suggestions = ['拆开来卖', '退回旧版', '一键关掉', '一键关闭', '自愿报名的用户', '默认不变', '单方面改'];
const sentences = await buildAssistedSentences(prep, { version: 2, document: prep.key, complete: true, terms, suggestions, exceptions: [] });
assert.equal(sentences.map(s => s.originalText).join(''), source);
assert.equal(sentences.map(s => s.tokens.map(t => t.text).join('')).join(''), source);
const coverage = [...terms, ...suggestions].map(text => {
  let occurrences = 0, available = 0;
  for (const s of sentences) {
    let at = s.originalText.indexOf(text);
    while (at >= 0) {
      occurrences++;
      if (s.tokens.some(t => t.start === at && t.end === at + text.length) || s.groups.some(g => s.tokens[g.startIndex].start === at && s.tokens[g.endIndex].end === at + text.length)) available++;
      at = s.originalText.indexOf(text, at + text.length);
    }
  }
  return { text, occurrences, available };
});
assert.ok(coverage.every(r => r.occurrences > 0 && (r.available === r.occurrences || (r.text === '退回旧版' && r.occurrences - r.available === 1))), JSON.stringify(coverage));
assert.ok(sentences.some(s => s.originalText.includes('退回旧版 App') && s.groups.some(g => g.label === '旧版 App')), 'Known overlapping suggestion yields to default term');
const extra = ['设备配置', '带广告的版本'];
for (const label of extra) assert.ok(sentences.some(s => s.groups.some(g => g.label === label)), label);
const before = JSON.parse(await readFile('local-only/icai-before-v5.json', 'utf8')).results[0];
const after = JSON.parse(await readFile('local-only/icai-after-v5.json', 'utf8')).results[0];
const examples = ['信托', '全部', '互操作', '不断订', '4K', '设备配置', '带广告的版本', '长视频会员平台'];
const rows = examples.map(text => {
  const show = (report: typeof before) => {
    const s = report.sentences.find((s: any) => s.source.includes(text) && (text !== '全部' || s.source.includes('全部投票权')));
    const at = s.source.indexOf(text);
    return s.tokens.filter((t: any) => t.start < at + text.length && t.end > at).map((t: any) => t.text).join(' / ');
  };
  return `| ${text} | ${show(before)} | ${show(after)} |`;
});
const summary = `# 平台文章分词 V5 复测\n\n使用此前保存的同篇中文原文（${source.length} 个 UTF-16 字符）；手动半翻成果只作抓取偏好证据，不包含后加备注的逐字对齐。\n\n| 表达 | 修改前细词 | 修改后细词 |\n|---|---|---|\n${rows.join('\n')}\n\n- 原文、空格与标点完整性：通过。\n- 同文基础测试：${before.integrityErrors.length} → ${after.integrityErrors.length} 项完整性错误。\n- 回放用户提供的 16 个 terms、7 个 suggestions：${coverage.reduce((n, r) => n + r.available, 0)} / ${coverage.reduce((n, r) => n + r.occurrences, 0)} 处可通过单词或词组完整选取。此指标仅证明既有建议落地，不是语义准确率。\n- 一处重叠：“退回旧版 App”中的“退回旧版”候选让位于默认词组“旧版 App”；没有把二者合成更大的整段。\n- 模型未提交的“设备配置”“带广告的版本”：本地候选已补充。\n- 新提示词含 ${prep.boundaryHints?.length ?? 0} 处真实疑难切法，最多 8 处，序列化内容合计不超过 1,200 字符；提示词共 ${makePrompt(prep).length} 个 UTF-16 字符，不等于 tokens。\n- 未调用 Gemini；不能据此证明新提示词的实际输出质量或耗时。\n- 已有 LLM 工作区不自动重切，以免覆盖之前审阅的分词；新导入生效。\n`;
await writeFile('local-only/平台文章-v5复测.md', summary, 'utf8');
await writeFile('local-only/icai-v5-assisted-review.json', JSON.stringify({ coverage, boundaryHints: prep.boundaryHints, sentences }, null, 2), 'utf8');
console.log(summary);
