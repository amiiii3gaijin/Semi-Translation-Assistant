import { codeBlocks } from './textStructure';

export interface AnnotationSpan { start: number; end: number; contentStart: number; contentEnd: number }

/** Only explicit trailing notes are metadata. Other brackets remain source text. */
export function annotationSpans(source: string): AnnotationSpan[] {
  const spans: AnnotationSpan[] = [];
  const blocks = codeBlocks(source);
  const opener = /〔注：/g;
  for (let match = opener.exec(source); match; match = opener.exec(source)) {
    const start = match.index;
    if (blocks.some(b => b.start <= start && b.end > start && !spans.some(s => b.start >= s.start && b.start < s.end))) continue;
    const prefix = source.slice(0, start);
    const previous = spans.at(-1);
    const attached = previous && !source.slice(previous.end, start).trim();
    if (!attached && (!prefix.trim() || !(/[。！？.!?]\s*$/.test(prefix) || /\S[^\r\n]*[\r\n]\s*$/.test(prefix)))) continue;
    // Nested 〔…〕 are content. Only the matching outer closing bracket ends a note.
    let depth = 1, end = start + match[0].length;
    for (; end < source.length; end++) {
      if (source[end] === '〔') depth++;
      if (source[end] === '〕' && --depth === 0) break;
    }
    if (depth) continue;
    spans.push({ start, end: end + 1, contentStart: start + match[0].length, contentEnd: end });
    opener.lastIndex = end + 1;
  }
  return spans;
}

export function annotationLayout(source: string) {
  const spans = annotationSpans(source);
  const pieces: { sourceStart: number; bodyStart: number; length: number }[] = [];
  let cursor = 0, body = '';
  for (const span of [...spans, { start: source.length, end: source.length }]) {
    if (span.start > cursor) {
      pieces.push({ sourceStart: cursor, bodyStart: body.length, length: span.start - cursor });
      body += source.slice(cursor, span.start);
    }
    cursor = span.end;
  }
  return { spans, pieces, body };
}

export function annotationWarning(source: string): string {
  const spans = annotationSpans(source);
  return [...source.matchAll(/〔注：/g)].some(m => !spans.some(s => m.index! >= s.start && m.index! < s.end))
    ? '有注释未闭合或未接在句尾，已按普通原文保留。' : '';
}
