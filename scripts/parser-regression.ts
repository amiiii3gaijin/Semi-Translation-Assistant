import assert from 'node:assert/strict';
import { analyzeCase } from '../src/lab/engine';
import { CASES } from '../src/lab/cases';
import { parseSentence } from '../src/utils/parseSentence';
import { createParserContext } from '../src/utils/documentTerms';
import { splitTextIntoSentences } from '../src/utils/textSplitter';
import { expandSelection, shrinkSelection, singleSelection, sourceText } from '../src/utils/sourceSelection';
import { isNavigableToken } from '../src/utils/tokenNavigation';
import { PARSER_VERSION } from '../src/utils/tokenizer';
import type { Sentence } from '../src/types';

let count = 0;
function check(source: string) {
  const result = analyzeCase({ id: 'check', title: 'check', source, review: 'unannotated', expectations: [] });
  assert.deepEqual(result.integrityErrors, []); count++;
  return result;
}
for (const sample of CASES) {
  const result = analyzeCase(sample);
  assert.deepEqual(result.integrityErrors, [], sample.id);
  assert.ok(result.checks.every(c => c.status === 'pass'), sample.id); count++;
}
// New terminology and contexts, not the Ryff vocabulary.
const source = '1. **认知灵活性（cognitive flexibility）：** 描述调整策略的能力。\n认知灵活性影响学习。学生的认知灵活性有所改善。';
const doc = check(source);
assert.ok(doc.documentTerms.some(t => t.text === '认知灵活性'));
assert.equal(doc.sentences.flatMap(s => s.groups).filter(g => g.label === '认知灵活性').length, 3);
const other = check('学生的认知灵活性有所改善。');
assert.equal(other.documentTerms.length, 0, 'No term leakage between documents');
assert.equal(check('**能够积极面对生活并努力创造价值**。能够积极面对生活并努力创造价值。').documentTerms.length, 0);
assert.ok(!check('研究均能独立预测代谢综合征（metabolic syndrome）。').documentTerms.some(t => t.text.startsWith('均能')));

const fence = '前文。\n```text\n甲（\n│ English (name)\n乙）\n```\n正文介绍工作记忆（working memory）。\n工作记忆可以测量。';
const fenced = check(fence);
assert.ok(fenced.sentences.some(s => s.tokens.some(t => t.isVerbatim) && s.groups.length === 0));
assert.ok(fenced.sentences.some(s => s.source.includes('正文') && !s.tokens.some(t => t.isVerbatim)));
assert.ok(!fenced.sentences.flatMap(s => s.groups).some(g => g.label.includes('│')));
check('前文。\n~~~\n未闭合的图示（\n下一行');
check('  \r\n🙂 e\u0301  \t甲。\r\n');
assert.ok(!parseSentence('# 标题\n**词**', 'markup').tokens.filter(t => t.isMarkup).some(isNavigableToken));

const nestedSource = '1. **认知灵活性（cognitive flexibility）：** 调整能力。\n（尤其是认知灵活性、学习策略和其他因素）';
const context = createParserContext(nestedSource);
const nestedText = splitTextIntoSentences(nestedSource).at(-1)!;
const parsed = parseSentence(nestedText, 'nested', undefined, undefined, context, nestedSource.lastIndexOf(nestedText));
assert.ok(parsed.groups.some(g => g.label === '认知灵活性'));
const sentence: Sentence = { id: 'nested', index: 0, originalText: nestedText, ...parsed, parserVersion: PARSER_VERSION,
  translatedText: '', status: 'active', activeTokenIndex: 0 };
const pair = parsed.pairedGroups.find(g => g.label.startsWith('（尤其'))!;
assert.ok(pair);
const fine = singleSelection(sentence, pair.startIndex, 'keyboard');
const expanded = expandSelection(fine, sentence);
assert.equal(sourceText(sentence, expanded.start, expanded.end), pair.label);
const shrunk = shrinkSelection(expanded);
assert.equal(shrunk.start, fine.start); assert.equal(shrunk.end, fine.end);
const manualOnly = check('学生讨论研究结果，教师报告变化。');
assert.ok(manualOnly.sentences.flatMap(s => s.trace).filter(t => t.rule === 'adjacent-nouns' && t.outcome === 'accepted').every(t => !t.autoSelect));
console.log(`Parser regression passed: ${count} source fixtures plus document isolation, structural range and selection assertions.`);

const words = (s: string) => parseSentence(s, 'boundary').tokens.map(t => t.text);
for (const word of ['信托', '全部', '互操作', '长视频', '4K', '480P', '1080p', '3D'])
  assert.ok(words(`这里讨论${word}。`).includes(word), word);
assert.ok(words('老会员只要不断订。').includes('断订'));
assert.ok(words('老会员只要不断订。').includes('只要'));
assert.ok(words('老会员只要不断订。').includes('不'));
assert.ok(!words('他不断订正稿件。').includes('断订'));
assert.ok(!words('他不断订购设备。').includes('断订'));
assert.ok(!words('把信托付给朋友。').includes('信托'));
assert.ok(words('信托付款完成。').includes('信托'));
assert.ok(!words('4KB 文件').includes('4K'));
assert.ok(!parseSentence('Zhihu 不是学术来源。', 'negative').groups.some(g => g.label === '不是学术'));
for (const text of ['设备配置', '撤回按钮', '投屏清晰度', '长视频会员平台', '带广告的版本', '自愿报名的用户', '一键关掉']) {
  const parsed = parseSentence(`请检查${text}。`, 'phrase');
  assert.ok(parsed.groups.some(g => g.label === text && g.autoSelect), text);
}
console.log('Platform fine boundaries, phrase units and contrasting contexts passed.');
