import type { Token, TokenGroup } from '../types';
import { annotationLayout } from './annotations';
import { tokenize } from './tokenizer';

interface ParsedBody { tokens: Token[]; groups: TokenGroup[]; pairedGroups?: TokenGroup[]; candidateGroups?: TokenGroup[]; consistencyTerms?: (TokenGroup & { count: number })[]; excludedGroupRanges?: { start: number; end: number }[] }

/** Retain exact raw source offsets, while notes receive basic tokens only. */
export function attachAnnotationTokens<T extends ParsedBody>(source: string, id: string, parsed: T): T {
  const { spans, pieces } = annotationLayout(source);
  if (!spans.length) return parsed;
  const mapped: { token: Token; bodyIndex?: number }[] = [];
  parsed.tokens.forEach((token, bodyIndex) => {
    for (const piece of pieces) {
      const a = Math.max(token.start, piece.bodyStart), b = Math.min(token.end, piece.bodyStart + piece.length);
      if (a >= b) continue;
      const start = piece.sourceStart + a - piece.bodyStart, end = start + b - a;
      mapped.push({ token: { ...token, start, end, text: source.slice(start, end) }, bodyIndex });
    }
  });
  for (const span of spans) {
    const marker = (start: number, end: number): Token => ({ id: '', start, end, text: source.slice(start, end), isMarkup: true, isPunctuation: true, isAnnotation: true });
    mapped.push({ token: marker(span.start, span.contentStart) });
    for (const token of tokenize(source.slice(span.contentStart, span.contentEnd), id + '_note')) {
      mapped.push({ token: { ...token, isMarkup: false, start: token.start + span.contentStart, end: token.end + span.contentStart, isAnnotation: true } });
    }
    mapped.push({ token: marker(span.contentEnd, span.end) });
  }
  mapped.sort((a, b) => a.token.start - b.token.start);
  const remap = <G extends TokenGroup>(groups: G[] | undefined): G[] | undefined => groups?.map(g => ({ ...g,
    startIndex: mapped.findIndex(t => t.bodyIndex === g.startIndex),
    endIndex: mapped.reduce((last, t, i) => t.bodyIndex === g.endIndex ? i : last, -1),
  }));
  const offset = (n: number, end: boolean) => {
    const p = pieces.find(p => end ? n > p.bodyStart && n <= p.bodyStart + p.length : n >= p.bodyStart && n < p.bodyStart + p.length);
    return p ? p.sourceStart + n - p.bodyStart : n;
  };
  return { ...parsed, tokens: mapped.map(({ token }, i) => ({ ...token, isAnnotation: token.start >= spans[0].start, id: `${id}_${i}` })),
    groups: remap(parsed.groups)!, pairedGroups: remap(parsed.pairedGroups), candidateGroups: remap(parsed.candidateGroups), consistencyTerms: remap(parsed.consistencyTerms),
    excludedGroupRanges: parsed.excludedGroupRanges?.map(r => ({ start: offset(r.start, false), end: offset(r.end, true) })),
  };
}
