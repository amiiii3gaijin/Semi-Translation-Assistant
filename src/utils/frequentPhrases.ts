import type { SourceRow } from './llmImport';
import { parseSentence } from './parseSentence';
import { createParserContext } from './documentTerms';

/** Token boundaries prevent fragments such as 学说明 from entering the prompt. */
export async function frequentPhrases(source: string, rows: SourceRow[]) {
  const context = createParserContext(source);
  const entries = new Map<string, { count: number; rows: Set<string> }>();
  let offset = 0;
  let processed = 0;
  const protectedRows: { row: SourceRow; ranges: {start: number; end: number}[] }[] = [];
  for (const row of rows) {
    const { tokens } = parseSentence(row.text, row.id, undefined, undefined, context, offset);
    protectedRows.push({ row, ranges: tokens.filter(t => t.isCitation || t.isVerbatim || t.isMarkup).map(t => ({start:t.start,end:t.end})) });
    offset += row.text.length;
    for (let start = 0; start < tokens.length; start++) {
      const first = tokens[start];
      if (first.isWhitespace || first.isPunctuation || first.isCitation || first.isVerbatim || first.isMarkup) continue;
      let words = 0;
      for (let end = start; end < tokens.length && words < 4; end++) {
        const token = tokens[end];
        if (token.isPunctuation || token.isCitation || token.isVerbatim || token.isMarkup) break;
        if (token.isWhitespace) { if (/[\r\n]/.test(token.text)) break; continue; }
        words++;
        const text = row.text.slice(first.start, token.end);
        if (text.length > 48) break;
        if (text.length < 2 || /^(?:本文|说明|能力|问题|认为|这个|这些|目前|因此|所以|一个|可能|显示|解释|已经|这些工具|它们|我们)$/.test(text)) continue;
        const entry = entries.get(text) ?? { count: 0, rows: new Set<string>() };
        entry.count++; entry.rows.add(row.id); entries.set(text, entry);
      }
    }
    if (++processed % 15 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  const ranked = [...entries].filter(([, e]) => e.rows.size >= 2)
    .sort((a, b) => b[1].rows.size - a[1].rows.size || b[0].length - a[0].length).slice(0, 200);
  // Recount literal occurrences independently of inconsistent fine splits; omit protected text.
  for (const [text, entry] of ranked) {
    entry.count = 0; entry.rows.clear();
    for (const {row, ranges} of protectedRows) {
      let at = row.text.indexOf(text);
      while (at >= 0) {
        const end = at + text.length;
        const latinCut = /[A-Za-z0-9]/.test(text[0]) && /[A-Za-z0-9]/.test(row.text[at-1] ?? '')
          || /[A-Za-z0-9]/.test(text.at(-1)!) && /[A-Za-z0-9]/.test(row.text[end] ?? '');
        if (!latinCut && !ranges.some(r => r.start < end && r.end > at)) { entry.count++; entry.rows.add(row.id); }
        at = row.text.indexOf(text, end);
      }
    }
    if (++processed % 15 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  ranked.sort((a,b) => b[1].rows.size-a[1].rows.size || b[0].length-a[0].length);
  return ranked.filter(([text, e]) => !ranked.some(([other, n]) => other !== text && other.includes(text) && n.count >= e.count * 0.85))
    .slice(0, 24).map(([text, e]) => ({ text, count: e.count }));
}
