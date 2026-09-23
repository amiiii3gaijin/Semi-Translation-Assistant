import { Token, TokenGroup } from '../types';
import { SORTED_PHRASES } from './phraseLexicon';
import { pairedSpans } from './pairedSpans';

/** One non-overlapping layer. Explicit terms beat short noun-run suggestions. */
export function buildTokenGroups(source: string, tokens: Token[]): TokenGroup[] {
  const groups: TokenGroup[] = [];
  const occupied = new Set<number>();
  const starts = new Map(tokens.map((token, index) => [token.start, index]));
  const ends = new Map(tokens.map((token, index) => [token.end, index]));
  const add = (start: number, end: number, kind: TokenGroup['kind'], autoSelect = true) => {
    const a = starts.get(start);
    const b = ends.get(end);
    if (a === undefined || b === undefined || b <= a) return;
    for (let i = a; i <= b; i++) if (occupied.has(i)) return;
    for (let i = a; i <= b; i++) occupied.add(i);
    groups.push({ id: `group_${start}_${end}`, startIndex: a, endIndex: b,
      label: source.slice(start, end), kind, autoSelect });
  };
  const matches = (pattern: RegExp, kind: TokenGroup['kind']) => {
    for (const match of source.matchAll(pattern)) add(match.index!, match.index! + match[0].length, kind);
  };
  // One visible layer: an enclosing pair owns its contents. Long passages remain
  // fine navigable and only expand when 9 is explicitly pressed.
  const expressionPattern = /(?:Cohen['’]s[ \t]+d|\bt\([ \t]*\d+[ \t]*\)|\b(?:M|SD|d|p))[ \t]*[=<>≤≥][ \t]*-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
  const expressions = [...source.matchAll(expressionPattern)];
  for (const span of pairedSpans(source)) {
    // The parentheses in t(12) belong to the complete statistical expression.
    if (expressions.some(m => m.index! <= span.start && m.index! + m[0].length >= span.end)) continue;
    const content = source.slice(span.start + 1, span.end - 1);
    const count = tokens.filter(t => t.start > span.start && t.end < span.end && !t.isWhitespace && !t.isPunctuation).length;
    const short = content.length <= 40 && count <= 8 && !/[。！？.!?\r\n]/u.test(content);
    add(span.start, span.end, span.kind, short);
  }
  matches(expressionPattern, 'expression');
  matches(/[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*(?:[ \t]+(?:(?:and[ \t]+)?[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*\.?))*[ \t]*\(\d{4}[a-z]?\)/gu, 'citation');
  matches(/(?:Figure|Table)[ \t]+\d+[a-z]?/g, 'expression');
  matches(/配对样本[ \t]*t[ \t]*检验|SDS[ \t]*平均分/gu, 'term');
  for (const parts of SORTED_PHRASES) {
    const phrase = parts.join('');
    let at = source.indexOf(phrase);
    while (at !== -1) {
      add(at, at + phrase.length, 'term');
      at = source.indexOf(phrase, at + phrase.length);
    }
  }
  matches(/[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*(?:[ \t]+[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*)+/gu, 'phrase');
  matches(/[一二三四五六七八九十百两\d]+(?:个)?(?:月|年|周|天)/gu, 'phrase');
  for (let i = 0; i < tokens.length; i++) {
    if (occupied.has(i) || tokens[i].pos !== 'n') continue;
    let end = i;
    while (end + 1 < tokens.length && end - i < 2 && !occupied.has(end + 1)
      && tokens[end + 1].pos === 'n'
      && tokens[end + 1].end - tokens[i].start <= 10) end++;
    if (end > i) add(tokens[i].start, tokens[end].end, 'phrase');
    i = end;
  }
  return groups.sort((a, b) => a.startIndex - b.startIndex);
}
