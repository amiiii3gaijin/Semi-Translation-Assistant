import assert from 'node:assert/strict';
import { prepareImport, makePrompt, validateReply, buildAssistedSentences } from '../src/utils/llmImport';
const source = '卫生系统需要通用能力。\n卫生系统和通用能力也很重要。\n保留 A  B 与 Cohen (1988)，M = 2.17。';
const prep = await prepareImport(source, '保留细词。');
const response = { version: 2 as const, document: prep.key, complete: true as const,
  terms: ['卫生系统', '通用能力'], suggestions: [], exceptions: [
    { id: 's1', groups: [], exclude: [], splits: [{ text: '卫生系统', occurrence: 1, parts: ['卫生', '系统'] }] },
    { id: 's2', groups: [], splits: [], exclude: [{ text: '卫生系统', occurrence: 1 }] },
  ] };
const reply = validateReply('```json\n' + JSON.stringify(response) + '\n```', prep);
const sentences = await buildAssistedSentences(prep, reply);
assert.equal(sentences.map(s => s.originalText).join(''), source);
assert.equal(sentences.map(s => s.tokens.map(t => t.text).join('')).join(''), source);
assert.ok(sentences.every(s => s.segmentationSource === 'llm'));
assert.ok(sentences[0].groups.some(g => g.label === '卫生系统'));
assert.ok(!sentences[1].groups.some(g => g.label === '卫生系统'));
assert.ok(sentences[0].tokens.some(t => t.text === '卫生'));
assert.ok(sentences.at(-1)!.tokens.some(t => t.isCitation));
assert.ok(sentences.at(-1)!.groups.some(g => g.label === 'M = 2.17'));
assert.ok(makePrompt(prep).includes(prep.key));
assert.ok(!makePrompt(prep).includes('"batch"'));
for (const invalid of [
  { ...response, document: 'old' }, { ...response, version: 1 }, { ...response, complete: false },
  { ...response, terms: ['不存在的词'] },
  { ...response, exceptions: [{ id: 's999' }] },
  { ...response, exceptions: [{ id: 's1' }, { id: 's1' }] },
  { ...response, exceptions: [{ id: 's1', groups: [{ text: '卫生系统', occurrence: 99 }] }] },
  { ...response, exceptions: [{ id: 's1', groups: [{ text: '卫生系统', occurrence: 1 }, { text: '系统', occurrence: 1 }] }] },
  { ...response, exceptions: [{ id: 's1', splits: [{ text: '卫生系统', occurrence: 1, parts: ['卫生', ' 系统'] }] }] },
]) assert.throws(() => validateReply(JSON.stringify(invalid), prep));
assert.throws(() => validateReply('{"document":', prep));
assert.throws(() => validateReply(JSON.stringify(response) + JSON.stringify(response), prep));
const long = await prepareImport('卫生系统需要通用能力。\n'.repeat(500), '');
assert.ok(long.source.length > 5000);
assert.equal(long.rows.map(r => r.text).join(''), long.source);
assert.ok(!('batches' in long));
assert.notEqual((await prepareImport(source + ' ', prep.requirements)).key, prep.key);
const optional = await prepareImport('他们把症状讲清楚。', '');
const optionalResult = await buildAssistedSentences(optional, { version: 2, document: optional.key, complete: true, terms: [], suggestions: ['把症状讲清楚'], exceptions: [] });
assert.ok(optionalResult[0].groups.some(g => g.label === '把症状讲清楚' && g.autoSelect === false));
const protectedPrep = await prepareImport('Cohen (1988) 表示。', '');
await assert.rejects(() => buildAssistedSentences(protectedPrep, { version: 2, document: protectedPrep.key, complete: true, terms: [], suggestions: [], exceptions: [{ id: 's1', groups: [], exclude: [], splits: [{ text: 'Cohen (1988)', occurrence: 1, parts: ['Cohen', ' (1988)'] }] }] }));
console.log('LLM v2: single task, sparse response, source preservation, local expression retention, exclusions, optional groups and invalid replies passed.');

// A legacy/group edge must never split a reviewed fine word again.
const repairPrep = await prepareImport('设备配置需要检查。', '');
const repaired = await buildAssistedSentences(repairPrep, { version: 2, document: repairPrep.key, complete: true,
  terms: ['设备'], suggestions: [], exceptions: [{ id: 's1', groups: [], exclude: [], splits: [{ text: '设备配置', occurrence: 1, parts: ['设备配置'] }] }] });
assert.ok(repaired[0].tokens.some(t => t.text === '设备配置'));
assert.ok(!repaired[0].tokens.some(t => t.text === '设备'));
assert.ok(makePrompt(repairPrep).includes('出现一次也可以入选'));
const hintPrep = await prepareImport('我也懒得退回旧版。每个用户自己决定。', '');
assert.ok(hintPrep.boundaryHints!.length <= 8);
for (const hint of hintPrep.boundaryHints!) {
  assert.equal(hint.parts.join(''), hint.text);
  assert.ok(hintPrep.rows.find(r => r.id === hint.id)?.text.includes(hint.text));
}
console.log('Reviewed boundaries survive group merging; prompt hints preserve actual source.');
