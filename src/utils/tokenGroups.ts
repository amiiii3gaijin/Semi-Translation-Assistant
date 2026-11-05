import { Token, TokenGroup } from '../types';
import { SORTED_PHRASES } from './phraseLexicon';
import { pairedSpans } from './pairedSpans';
import type { ParserContext } from './documentTerms';

export interface GroupTrace {
  rule: string;
  start: number;
  end: number;
  label: string;
  kind: TokenGroup['kind'];
  autoSelect: boolean;
  outcome: 'accepted' | 'unaligned' | 'single-token' | 'overlap' | 'low-confidence';
}

/** One non-overlapping layer. Explicit terms beat short noun-run suggestions. */
export function buildTokenGroups(source: string, tokens: Token[], observe?: (trace: GroupTrace) => void, context?: ParserContext, pairedOutput?: TokenGroup[]): TokenGroup[] {
  const groups: TokenGroup[] = [];
  const candidates: { group: TokenGroup; trace: GroupTrace; score: number }[] = [];
  let rule = 'paired-span';
  const occupied = new Set<number>();
  const starts = new Map(tokens.map((token, index) => [token.start, index]));
  const ends = new Map(tokens.map((token, index) => [token.end, index]));
  const add = (start: number, end: number, kind: TokenGroup['kind'], autoSelect = true) => {
    const a = starts.get(start);
    const b = ends.get(end);
    const report = (outcome: GroupTrace['outcome']) => observe?.({
      rule, start, end, label: source.slice(start, end), kind, autoSelect, outcome,
    });
    if (a === undefined || b === undefined) { report('unaligned'); return; }
    if (b <= a) { report('single-token'); return; }
    const group = { id: `group_${start}_${end}`, startIndex: a, endIndex: b,
      label: source.slice(start, end), kind, autoSelect };
    if (rule === 'paired-span') pairedOutput?.push(group);
    const scores: Record<string, number> = { 'statistical-expression': 120, 'author-year': 120,
      'document-term': 100, 'phrase-lexicon': 95, 'mixed-language-term': 100, 'figure-table': 110,
      'latin-word-run': 40, duration: 40, 'adjacent-nouns': 10 };
    // Short quoted concepts keep their delimiters. Long passages cannot suppress inner terms.
    const score = rule === 'paired-span' ? (autoSelect ? 110 : 20) : rule === 'document-term'
      ? 100 + Math.min(5, context?.terms.find(t => t.text === group.label)?.count ?? 0) : scores[rule] ?? 10;
    candidates.push({ group, score, trace: { rule, start, end, label: group.label, kind, autoSelect, outcome: 'accepted' } });
  };
  const matches = (pattern: RegExp, kind: TokenGroup['kind']) => {
    for (const match of source.matchAll(pattern)) add(match.index!, match.index! + match[0].length, kind);
  };
  // Structural ranges remain available independently of the single visible layer.
  const expressionPattern = /(?:Cohen['’]s[ \t]+d|\bt\([ \t]*\d+[ \t]*\)|\b(?:M|SD|d|p))[ \t]*[=<>≤≥][ \t]*-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
  const expressions = [...source.matchAll(expressionPattern)];
  for (const span of pairedSpans(source)) {
    // The parentheses in t(12) belong to the complete statistical expression.
    if (expressions.some(m => m.index! <= span.start && m.index! + m[0].length >= span.end)) continue;
    const content = source.slice(span.start + 1, span.end - 1);
    const count = tokens.filter(t => t.start > span.start && t.end < span.end && !t.isWhitespace && !t.isPunctuation).length;
    const short = content.length <= 40 && count <= 8 && !/[。！？.!?\r\n；;，,]/u.test(content)
      && !/^(?:包括|尤其|除|例如|部分|如)/u.test(content);
    add(span.start, span.end, span.kind, short);
  }
  rule = 'statistical-expression';
  matches(expressionPattern, 'expression');
  rule = 'author-year';
  matches(/[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*(?:[ \t]+(?:(?:and[ \t]+)?[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*\.?))*[ \t]*\(\d{4}[a-z]?\)/gu, 'citation');
  rule = 'figure-table';
  matches(/(?:Figure|Table)[ \t]+\d+[a-z]?/g, 'expression');
  rule = 'mixed-language-term';
  matches(/配对样本[ \t]*t[ \t]*检验|SDS[ \t]*平均分/gu, 'term');
  rule = 'document-term';
  for (const term of context?.terms ?? []) {
    let at = source.indexOf(term.text);
    while (at !== -1) { add(at, at + term.text.length, 'term'); at = source.indexOf(term.text, at + term.text.length); }
  }
  rule = 'phrase-lexicon';
  for (const parts of SORTED_PHRASES) {
    const phrase = parts.join('');
    let at = source.indexOf(phrase);
    while (at !== -1) {
      add(at, at + phrase.length, 'term');
      at = source.indexOf(phrase, at + phrase.length);
    }
  }
  rule = 'latin-word-run';
  matches(/[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*(?:[ \t]+[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*)+/gu, 'phrase');
  rule = 'duration';
  matches(/[一二三四五六七八九十百两\d]+(?:个)?(?:月|年|周|天)/gu, 'phrase');
  rule = 'adjacent-nouns';
  const weakBoundary = /^(?:不是|没有|并非|发现|报告|指出|显示|认为|组织|依据|评价|高度|部分|上述|所有|全部|全球|人类|总体|多维|水平|主题|领域|指标|全面|大幅|稳步|创造性|习惯|根据|情况|研究者|也就是)$/u;
  const noun = (index: number) => tokens[index]?.pos === 'n' && tokens[index].text.length >= 2 && !weakBoundary.test(tokens[index].text);
  for (let i = 0; i < tokens.length; i++) {
    if (!noun(i)) continue;
    // Enumerate candidates instead of committing to arbitrary blocks of three.
    for (let end = i + 1; end <= i + 2 && noun(end) && tokens[end].end - tokens[i].start <= 10; end++) {
      add(tokens[i].start, tokens[end].end, 'phrase', false);
    }
  }
  candidates.sort((a, b) => b.score - a.score ||
    (a.score === 10 ? (a.group.endIndex - a.group.startIndex) - (b.group.endIndex - b.group.startIndex) : b.trace.label.length - a.trace.label.length) ||
    a.group.startIndex - b.group.startIndex);
  for (const candidate of candidates) {
    const { group, trace } = candidate;
    if (tokens.slice(group.startIndex, group.endIndex + 1).some(t => t.isMarkup)) {
      observe?.({ ...trace, outcome: 'low-confidence' }); continue;
    }
    if (tokens.slice(group.startIndex, group.endIndex + 1).some((_, n) => occupied.has(group.startIndex + n))) {
      observe?.({ ...trace, outcome: 'overlap' }); continue;
    }
    for (let i = group.startIndex; i <= group.endIndex; i++) occupied.add(i);
    groups.push(group); observe?.(trace);
  }
  return groups.sort((a, b) => a.startIndex - b.startIndex);
}
