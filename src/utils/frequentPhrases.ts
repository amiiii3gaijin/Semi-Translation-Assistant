import type { SourceRow } from './llmImport';
import { parseSentence } from './parseSentence';
import { createParserContext } from './documentTerms';

/** Token boundaries prevent fragments such as 学说明 from entering the prompt. */
export async function frequentPhrases(source: string, rows: SourceRow[]) {
  const context = createParserContext(source);
  const entries = new Map<string, { count: number; rows: Set<string> }>();
  let offset = 0;
  let processed = 0;
  for (const row of rows) {
    const { tokens } = parseSentence(row.text, row.id, undefined, undefined, context, offset);
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
        if (text.length < 2 || /^(?:本文|说明|能力|问题|认为|这个|这些|目前|因此)$/.test(text)) continue;
        const entry = entries.get(text) ?? { count: 0, rows: new Set<string>() };
        entry.count++; entry.rows.add(row.id); entries.set(text, entry);
      }
    }
    if (++processed % 15 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  const ranked = [...entries].filter(([, e]) => e.rows.size >= 2)
    .sort((a, b) => b[1].rows.size - a[1].rows.size || b[0].length - a[0].length).slice(0, 200);
  return ranked.filter(([text, e]) => !ranked.some(([other, n]) => other !== text && other.includes(text) && n.count === e.count))
    .slice(0, 24).map(([text, e]) => ({ text, count: e.count }));
}
