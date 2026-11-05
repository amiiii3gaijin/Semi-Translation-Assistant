import assert from 'node:assert/strict';
import { annotationLayout, annotationWarning } from '../src/utils/annotations';
import { splitTextIntoSentences } from '../src/utils/textSplitter';
import { parseSentence } from '../src/utils/parseSentence';
import { prepareImport, makePrompt, buildAssistedSentences } from '../src/utils/llmImport';
import { selectionCandidates } from '../src/utils/selectionCandidates';
import { phraseMarkers } from '../src/utils/phraseMarkers';
import { nextWord, regionLastWord, moveSelection, moveGroupedSelection, expandSelection, singleSelection, sourceText } from '../src/utils/sourceSelection';
import { isNavigableToken } from '../src/utils/tokenNavigation';
import { frequentPhrases } from '../src/utils/frequentPhrases';
import type { Sentence } from '../src/types';
import { readFileSync } from 'node:fs';
import { analyzeCase } from '../src/lab/engine';

const source = '卫生系统需要筛查。〔注：主语用抗体。不要改写！\n这里保留〔嵌套括号〕、英文 antibody 和广播。〕\n〔注：第二条注释？仍然同页。〕\n卫生系统需要广播。';
const chunks = splitTextIntoSentences(source);
assert.equal(chunks.length, 2, 'note punctuation and newlines never create cards');
assert.equal(chunks.join(''), source);
const sentence: Sentence = { ...parseSentence(chunks[0], 's'), id: 's', index: 0, originalText: chunks[0], translatedText: '', status: 'active', parserVersion: 8, activeTokenIndex: 0 };
assert.equal(sentence.tokens.map(t => t.text).join(''), chunks[0]);
sentence.tokens.forEach(t => assert.equal(chunks[0].slice(t.start, t.end), t.text));
const bodyLast = regionLastWord(sentence)!;
const noteFirst = sentence.tokens.findIndex(t => t.isAnnotation && isNavigableToken(t));
assert.ok(noteFirst > bodyLast);
assert.equal(nextWord(sentence.tokens, bodyLast, 1), null);
assert.equal(nextWord(sentence.tokens, noteFirst, -1), null);
const held = singleSelection(sentence, bodyLast, 'keyboard');
assert.deepEqual(moveSelection(held, sentence.tokens, 1), held);
assert.deepEqual(moveGroupedSelection(held, sentence, 1), held);
const noteSelection = singleSelection(sentence, noteFirst, 'preview');
assert.deepEqual(expandSelection(noteSelection, sentence), noteSelection);
assert.ok([...sentence.groups, ...selectionCandidates(sentence), ...phraseMarkers(sentence, true, true)]
  .every(g => !sentence.tokens.slice(g.startIndex, g.endIndex + 1).some(t => t.isAnnotation)), 'notes have no group or marker of any kind');
sentence.activeTokenIndex = noteFirst;
const noteLast = regionLastWord(sentence)!;
assert.ok(noteLast >= noteFirst);
const copied = sourceText(sentence, noteFirst, noteLast);
assert.ok(copied.includes('主语用抗体。不要改写！\n'));
assert.ok(copied.includes('〔嵌套括号〕'));
assert.ok(!copied.includes('〔注：'));
assert.equal(sourceText(sentence, bodyLast, noteFirst), '', 'cross-region capture rejected');

const prep = await prepareImport(source, '');
assert.ok(!makePrompt(prep).includes('主语用抗体'));
assert.equal(prep.rows.length, 2);
const edited = await prepareImport(source.replace('主语用抗体。不要改写！', '这份注释完全改变。'), '');
assert.equal(prep.key, edited.key, 'annotation edits do not invalidate LLM results');
const result = { version: 3 as const, document: prep.key, complete: true as const, terms: ['卫生系统'], suggestions: [], consistency: ['卫生系统'], exceptions: [] };
const assisted = await buildAssistedSentences(prep, result);
assert.equal(assisted.map(s => s.originalText).join(''), source);
for (const s of assisted) {
  assert.equal(s.tokens.map(t => t.text).join(''), s.originalText);
  for (const g of [...s.groups, ...(s.consistencyTerms ?? [])]) {
    assert.equal(s.originalText.slice(s.tokens[g.startIndex].start, s.tokens[g.endIndex].end), g.label);
    assert.ok(!s.tokens[g.startIndex].isAnnotation);
  }
}
assert.equal(JSON.parse(JSON.stringify(assisted))[0].tokens.filter((t: any) => t.isAnnotation).length,
  assisted[0].tokens.filter(t => t.isAnnotation).length, 'saved document retains annotation tokens');
assert.equal(annotationWarning(source), '');
for (const invalid of ['原文。〔注：没有闭合。下一句。', '〔注：没有所属句子。〕', '普通正文〔注：不是句尾〕继续。']) {
  assert.ok(annotationWarning(invalid));
  assert.equal(annotationLayout(invalid).body, invalid, 'invalid annotations are never dropped');
}
assert.equal(annotationLayout('普通〔括号。〕原文。').body, '普通〔括号。〕原文。');
assert.deepEqual(splitTextIntoSentences('English.〔注：保留。〕下一句。'), ['English.〔注：保留。〕', '下一句。']);
assert.equal(annotationLayout('```\n正文。〔注：这是代码〕\n```').spans.length, 0);
const arbitrary = '正文。〔注：引号“圆括号（未配对；\n```\n# 标题 **加粗**。〕\n下一句。〔注：后续注释。〕';
assert.equal(splitTextIntoSentences(arbitrary).length, 2, 'unmatched prose/code symbols inside notes are opaque to sentence splitting');
const arbitraryChunk = splitTextIntoSentences(arbitrary)[0];
const arbitraryParsed = parseSentence(arbitraryChunk, 'opaque');
assert.ok(arbitraryParsed.tokens.some(t => t.isAnnotation && t.text === '*' && !t.isMarkup), 'only annotation delimiters are hidden');
for (const text of ['有广播和手机网络。', '出入境筛查。', '进不去一些地区。']) {
  const parsed = parseSentence(text, 'test');
  const expected = text.includes('广播') ? '广播' : text.includes('筛查') ? '筛查' : '进不去';
  assert.ok(parsed.tokens.some(t => t.text === expected));
}
const repeats = '安全下葬失败的几率明显升高。安全下葬失败的几率更高。地区的要求还让作者需要其他条件。地区的要求还让作者需要其他条件。';
const frequent = await frequentPhrases(repeats, splitTextIntoSentences(repeats).map((text,i) => ({id:String(i),text})));
assert.ok(frequent.every(t => !/[的地得了着]$/.test(t.text) && !['还让','需要','其他','作者'].includes(t.text)));
const latestSource = readFileSync(new URL('./fixtures/annotation-and-capture-20261101.txt', import.meta.url), 'utf8');
const latest = analyzeCase({ id: '20261101', title: '最新23句', source: latestSource, review: 'unannotated', expectations: [
  {kind:'token',text:'广播'}, {kind:'token',text:'筛查'}, {kind:'token',text:'进不去'}, {kind:'token',text:'体内'},
] });
assert.equal(latest.sentences.length, 23);
assert.deepEqual(latest.integrityErrors, []);
assert.ok(latest.checks.every(c => c.status === 'pass'));
assert.ok(!latest.sentences[0].tokens.some(t => t.text === '内能'));
assert.ok(parseSentence('系统的内能增加。', 'physics').tokens.some(t => t.text === '内能'));
const latestPrep = await prepareImport(latestSource, '');
const latestResult = await buildAssistedSentences(latestPrep, { version: 3, document: latestPrep.key, complete: true,
  terms: ['卫生系统','回避卫生系统','安全下葬','控制措施','跨境协调','出入境筛查','不安全局势','接触者','得到追踪','卫生区','医疗点','就医恐惧','产前检查','大量中断','通用检测','溢出前监测','本地信任','冲突地区'],
  suggestions: ['安全下葬失败几率','安全下葬失败的几率','设计控制措施','接触者得到追踪','进入冲突地区的能力'], consistency: ['卫生系统','安全下葬','控制措施'], exceptions: [],
});
assert.equal(latestResult.map(s => s.originalText).join(''), latestSource);
assert.ok(latestResult.every(s => s.tokens.map(t => t.text).join('') === s.originalText));
console.log('Annotation parsing, lossless offsets, LLM isolation, persistence, region boundaries and new token repairs passed.');
