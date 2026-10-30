import * as Segmentit from 'segmentit';
import { Token } from '../types';
import { SORTED_PHRASES } from './phraseLexicon';
import type { ParserContext } from './documentTerms';
import { markdownMarkers } from './textStructure';

// Vite resolves ESM; Node resolves the package's CommonJS entry.
const { Segment, useDefault } = (Reflect.get(Segmentit, 'default') ?? Segmentit) as typeof Segmentit;

export const PARSER_VERSION = 7;
let segmentitInstance: ReturnType<typeof useDefault> | null = null;
const getSegmentit = () => segmentitInstance ?? (segmentitInstance = useDefault(new Segment()));

function partOfSpeech(p?: number): string {
  if (p === undefined) return 'unk';
  if (p & 1048824) return 'n';
  if (p & 4096) return 'v';
  if (p & 1073741824) return 'a';
  if (p & 65536) return 'r';
  return 'unk';
}

export interface TokenTrace { start: number; end: number; origin: 'segmentit' | 'lexicon' | 'source-gap' | 'protected-run' | 'document-term' | 'boundary-repair' }

// Basic word boundaries, separate from semantic phrase suggestions.
const WORD_BOUNDARIES = ['量身定制', '标志物', '语言', '文化', '报告', '水平', '成长', '学生', '心理学', '信托', '托付', '全部', '互操作', '长视频', '断订', '防控', '已有', '带毒'];

export function tokenize(sentence: string, sentenceId: string, observe?: (trace: TokenTrace) => void, context?: ParserContext): Token[] {
  const tokens: Token[] = [];
  const append = (start: number, end: number, pos = 'unk', citation = false, origin: TokenTrace['origin'] = 'source-gap', rawPos?: number) => {
    if (start === end) return;
    const text = sentence.slice(start, end);
    tokens.push({
      id: `${sentenceId}_${tokens.length}`, start, end, text, pos, rawPos,
      isWhitespace: /^\s+$/u.test(text),
      isPunctuation: !citation && /^[\p{P}\p{S}\s]+$/u.test(text),
      isCitation: citation,
    });
    observe?.({ start, end, origin });
  };
  const segmentHan = (text: string, offset: number) => {
    const words = getSegmentit().doSegment(text) as { w: string; p?: number }[];
    let cursor = 0;
    for (const word of words) {
      if (!word.w) continue;
      const at = text.indexOf(word.w, cursor);
      if (at < 0) continue;
      append(offset + cursor, offset + at);
      append(offset + at, offset + at + word.w.length, partOfSpeech(word.p), false, 'segmentit', word.p);
      cursor = at + word.w.length;
    }
    append(offset + cursor, offset + text.length);
  };
  const entries = [
    { text: '不断订', parts: ['不', '断订'], origin: 'boundary-repair' as const },
    ...(context?.terms.map(t => ({ text: t.text, parts: t.pieces, origin: 'document-term' as const })) ?? []),
    ...SORTED_PHRASES.map(parts => ({ text: parts.join(''), parts, origin: 'lexicon' as const })),
    ...WORD_BOUNDARIES.map(text => ({ text, parts: [text], origin: 'boundary-repair' as const })),
  ].sort((a, b) => b.text.length - a.text.length);
  const fineHan = (text: string, offset: number) => {
    let cursor = 0;
    let plainStart = 0;
    while (cursor < text.length) {
      const quantity = /^(?:几|数|[一二三四五六七八九十两]+)(?:周|天|年|个月)/u.exec(text.slice(cursor));
      if (quantity && !/^[级龄]/u.test(text.slice(cursor + quantity[0].length))) {
        if (cursor > plainStart) segmentHan(text.slice(plainStart, cursor), offset + plainStart);
        append(offset + cursor, offset + cursor + quantity[0].length, 'unk', false, 'boundary-repair');
        cursor += quantity[0].length; plainStart = cursor; continue;
      }
      if (cursor === 0 && /\d/u.test(sentence[offset - 1] ?? '') && /^[年月周天]的/u.test(text)) {
        append(offset, offset + 1, 'unk', false, 'boundary-repair'); cursor = 1; plainStart = 1; continue;
      }
      const phrase = entries.find(entry => text.startsWith(entry.text, cursor)
        // Avoid repairing across a different word: 信/托付, 不断/订正.
        && !(entry.text === '信托' && text.slice(cursor + 2, cursor + 4) === '付给' && /[把将]/u.test(text[cursor - 1] ?? ''))
        && !(['断订', '不断订'].includes(entry.text) && /^[正购阅货单票立制做]/u.test(text.slice(cursor + entry.text.length))));
      if (!phrase) { cursor++; continue; }
      if (cursor > plainStart) segmentHan(text.slice(plainStart, cursor), offset + plainStart);
      for (const piece of phrase.parts) {
        const analysis = getSegmentit().doSegment(piece) as { w: string; p?: number }[];
        append(offset + cursor, offset + cursor + piece.length,
          analysis.length === 1 ? partOfSpeech(analysis[0].p) : 'unk', false, phrase.origin, analysis.length === 1 ? analysis[0].p : undefined);
        cursor += piece.length;
      }
      plainStart = cursor;
    }
    if (plainStart < text.length) segmentHan(text.slice(plainStart), offset + plainStart);
  };

  // Source spans cover every character. Whitespace and accented Latin names never
  // pass through the Chinese segmenter; citations remain indivisible basic tokens.
  const runs = /[（(][^（）()\r\n]*(?:et al\.?|\d{4})[^（）()\r\n]*[）)]|\s+|[\p{Script=Han}]+|\d+(?:[KkPpDd])(?![A-Za-z0-9_])|[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*|(?:\d+(?:[.,]\d+)*|\.\d+)|[\s\S]/gu;
  for (const match of sentence.matchAll(runs)) {
    const text = match[0];
    const start = match.index!;
    if (/^[\p{Script=Han}]+$/u.test(text)) fineHan(text, start);
    else append(start, start + text.length, 'unk', /^[（(]/.test(text) && text.length > 1, 'protected-run');
  }
  const markup = markdownMarkers(sentence);
  for (const token of tokens) token.isMarkup = markup.some(span => token.start >= span.start && token.end <= span.end);
  return tokens;
}

