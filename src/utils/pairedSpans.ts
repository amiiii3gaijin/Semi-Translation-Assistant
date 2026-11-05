export interface PairedSpan { start: number; end: number; kind: 'quoted' | 'bracket' }
const pairs: Record<string, string> = { '(': ')', '（': '）', '[': ']', '【': '】', '{': '}', '“': '”', '‘': '’', '「': '」', '『': '』', '《': '》', '"': '"', "'": "'" };
const word = (value: string) => /[\p{L}\p{M}\p{N}]/u.test(value);

/** Matched spans only. Apostrophes inside words never open or close quotations. */
export function pairedSpans(source: string): PairedSpan[] {
  const stack: { start: number; close: string; kind: PairedSpan['kind'] }[] = [];
  const found: PairedSpan[] = [];
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if ((char === "'" || char === '’') && word(source[i - 1] || '') && word(source[i + 1] || '')) continue;
    if ((char === '"' || char === "'") && source[i - 1] === '\\') continue;
    const top = stack[stack.length - 1];
    if (top?.close === char) {
      stack.pop(); found.push({ start: top.start, end: i + 1, kind: top.kind });
    } else if (pairs[char]) {
      // A trailing apostrophe without an open single quote is not a new quotation.
      if (char === "'" && word(source[i - 1] || '')) continue;
      stack.push({ start: i, close: pairs[char], kind: /[“‘「『《"']/u.test(char) ? 'quoted' : 'bracket' });
    }
  }
  return found.sort((a, b) => a.start - b.start || b.end - a.end);
}
