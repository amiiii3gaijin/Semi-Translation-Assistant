import assert from 'node:assert/strict';
import { prepareImport, makePrompt, validateReply, buildAssistedSentences } from '../src/utils/llmImport';
import { tokenize } from '../src/utils/tokenizer';
import { phraseMarkers } from '../src/utils/phraseMarkers';
import { singleSelection, expandSelection, shrinkSelection } from '../src/utils/sourceSelection';

assert.deepEqual(tokenize('感染防控', 'fine').map(t => t.text), ['感染', '防控']);
const source = '卫生系统缺少通用能力。\n通用能力让卫生系统应对危害。\n进化生态学说明，下一个种无法预知。\n心理学说明，控制取决于信任。\n传播只在影响控制时讨论。\n没有获批的疫苗和药物。\n（WHO, 2026）。\n（WHO, 2026）。';
const prep = await prepareImport(source, '');
assert.ok(!prep.frequent.some(f => f.text === '学说明' || f.text.includes('WHO')));
assert.ok(prep.frequent.some(f => f.text === '通用能力'));
const reply = { version: 3 as const, document: prep.key, complete: true as const,
  terms: ['卫生系统', '通用能力', '控制', '影响控制', '没有获批', '疫苗和药物'],
  suggestions: ['缺少通用能力', '影响控制时', '获批的', '没有获批的疫苗和药物'],
  consistency: ['卫生系统', '通用能力', '进化生态学', 'WHO, 2026'], exceptions: [] };
const parsed = validateReply('```json\n' + JSON.stringify(reply) + '\n```', prep);
assert.equal(parsed.version, 3);
assert.ok(makePrompt(prep).includes('"version":3'));
assert.ok(makePrompt(prep).includes('代码块外不写任何内容'));
const sentences = await buildAssistedSentences(prep, parsed);
assert.equal(sentences.map(s => s.tokens.map(t => t.text).join('')).join(''), source);
const highlighted = sentences.flatMap(s => s.consistencyTerms ?? []);
assert.deepEqual([...new Set(highlighted.map(g => g.label))].sort(), ['卫生系统', '通用能力'].sort());
assert.ok(highlighted.every(g => g.count === 2));
const control = sentences.find(s => s.originalText.includes('影响控制'))!;
assert.ok(control.groups.some(g => g.label === '影响控制' && g.autoSelect), 'atomic 控制 must not block 影响控制');
const vaccine = sentences.find(s => s.originalText.includes('没有获批'))!;
assert.ok(![...vaccine.groups, ...(vaccine.candidateGroups ?? [])].some(g => g.label === '获批的'), 'crossing suggestion is not advertised as expansion');
const group = control.groups.find(g => g.label === '影响控制')!;
const current = expandSelection(singleSelection(control, group.startIndex, 'preview'), control);
const next = expandSelection(current, control);
const markers = phraseMarkers(control, true, false);
assert.ok(markers.some(m => !m.dashed && m.startIndex === group.startIndex && m.endIndex === group.endIndex));
assert.ok(markers.some(m => m.dashed && m.endIndex === next.blockEnd));
assert.ok(!markers.some(m => m.consistent));
const marked = phraseMarkers(sentences[0], true, true);
assert.ok(marked.some(m => m.consistent));
for (const sentence of sentences) {
  const lines = phraseMarkers(sentence, true, true);
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++)
    assert.ok(lines[i].endIndex < lines[j].startIndex || lines[j].endIndex < lines[i].startIndex, 'no overlapping marker layers');
}
const first = sentences[0];
const stable = phraseMarkers(first, true, false);
const lack = first.tokens.findIndex(t => t.text === '缺少');
const core = first.groups.find(g => g.label === '通用能力')!;
assert.ok(stable.some(m => m.dashed && m.startIndex <= lack && m.endIndex >= lack));
assert.ok(stable.some(m => !m.dashed && m.startIndex === core.startIndex && m.endIndex === core.endIndex));
for (let index = 0; index < first.tokens.length; index++) {
  const landing = singleSelection(first, index, 'preview');
  const expanded = expandSelection(landing, first);
  const outer = expandSelection(expanded, first);
  for (const state of [landing, expanded, outer, shrinkSelection(outer), shrinkSelection(expanded), { ...landing, mode: 'mouse' as const }]) {
    const moved = { ...first, activeTokenIndex: state.cursor };
    assert.deepEqual(phraseMarkers(moved, true, false), stable, 'cursor and expansion history must not alter annotations');
  }
}
const coverage = (highlight: boolean) => {
  const cells = Array(first.tokens.length).fill('none');
  for (const m of phraseMarkers(first, true, highlight)) for (let i = m.startIndex; i <= m.endIndex; i++) cells[i] = m.dashed ? 'dashed' : 'solid';
  return cells;
};
assert.deepEqual(coverage(true), coverage(false), 'term coloring cannot add lines or alter solid/dashed coverage');
assert.deepEqual(phraseMarkers({ ...first, groups: [], candidateGroups: [], excludedGroupRanges: [{start:0,end:first.originalText.length}] }, true, true), [], 'term-only annotations cannot manufacture lines');
const old = await buildAssistedSentences(prep, { ...reply, version: 2, consistency: undefined });
assert.ok(old.every(s => !s.consistencyTerms?.length));
assert.throws(() => validateReply(JSON.stringify({ ...reply, document: 'wrong' }), prep));
assert.throws(() => validateReply(JSON.stringify({ ...reply, consistency: ['不存在'] }), prep));
console.log('V3/V2, exact source, boundaries, term exclusions, fixed single-layer lines, selection invariance and color-only highlighting passed.');
