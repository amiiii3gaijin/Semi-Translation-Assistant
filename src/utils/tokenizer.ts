import { Segment, useDefault } from 'segmentit';
import { Token } from '../types';
import { SORTED_PHRASES } from './phraseLexicon';

export const PARSER_VERSION = 3;
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

export function tokenize(sentence: string, sentenceId: string): Token[] {
  const tokens: Token[] = [];
  const append = (start: number, end: number, pos = 'unk', citation = false) => {
    if (start === end) return;
    const text = sentence.slice(start, end);
    tokens.push({
      id: `${sentenceId}_${tokens.length}`, start, end, text, pos,
      isWhitespace: /^\s+$/u.test(text),
      isPunctuation: !citation && /^[\p{P}\p{S}\s]+$/u.test(text),
      isCitation: citation,
    });
  };
  const segmentHan = (text: string, offset: number) => {
    const words = getSegmentit().doSegment(text) as { w: string; p?: number }[];
    let cursor = 0;
    for (const word of words) {
      if (!word.w) continue;
      const at = text.indexOf(word.w, cursor);
      if (at < 0) continue;
      append(offset + cursor, offset + at);
      append(offset + at, offset + at + word.w.length, partOfSpeech(word.p));
      cursor = at + word.w.length;
    }
    append(offset + cursor, offset + text.length);
  };
  const fineHan = (text: string, offset: number) => {
    let cursor = 0;
    let plainStart = 0;
    while (cursor < text.length) {
      const phrase = SORTED_PHRASES.find(parts => text.startsWith(parts.join(''), cursor));
      if (!phrase) { cursor++; continue; }
      if (cursor > plainStart) segmentHan(text.slice(plainStart, cursor), offset + plainStart);
      for (const piece of phrase) {
        const analysis = getSegmentit().doSegment(piece) as { w: string; p?: number }[];
        append(offset + cursor, offset + cursor + piece.length,
          analysis.length === 1 ? partOfSpeech(analysis[0].p) : 'unk');
        cursor += piece.length;
      }
      plainStart = cursor;
    }
    if (plainStart < text.length) segmentHan(text.slice(plainStart), offset + plainStart);
  };

  // Source spans cover every character. Whitespace and accented Latin names never
  // pass through the Chinese segmenter; citations remain indivisible basic tokens.
  const runs = /[（(][^（）()\r\n]*(?:et al\.?|\d{4})[^（）()\r\n]*[）)]|\s+|[\p{Script=Han}]+|[\p{Script=Latin}\p{M}]+(?:['’\-][\p{Script=Latin}\p{M}]+)*|(?:\d+(?:[.,]\d+)*|\.\d+)|[\s\S]/gu;
  for (const match of sentence.matchAll(runs)) {
    const text = match[0];
    const start = match.index!;
    if (/^[\p{Script=Han}]+$/u.test(text)) fineHan(text, start);
    else append(start, start + text.length, 'unk', /^[（(]/.test(text) && text.length > 1);
  }
  return tokens;
}

