import type { Sentence, TokenGroup } from '../types';

/** Low-priority short clauses; reviewed boundaries and explicit exclusions win. */
export function selectionCandidates(sentence: Sentence): TokenGroup[] {
  const existing = sentence.candidateGroups ?? [];
  // Older saved LLM documents did not retain exclusions; don't guess what was rejected.
  if (sentence.segmentationSource === 'llm' && sentence.excludedGroupRanges === undefined) return existing;
  const all = [...sentence.groups, ...existing, ...(sentence.pairedGroups ?? [])];
  const extra: TokenGroup[] = [];
  let start = 0;
  const flush = (end: number) => {
    while (start <= end && sentence.tokens[start].isWhitespace) start++;
    while (end >= start && sentence.tokens[end].isWhitespace) end--;
    const tokens = sentence.tokens.slice(start, end + 1);
    const words = tokens.filter(t => !t.isWhitespace);
    if (words.length < 2 || words.length > 4 || words.some(t => t.isCitation || t.isVerbatim || t.isMarkup || t.isPunctuation)) return;
    const text = sentence.originalText.slice(tokens[0].start, tokens.at(-1)!.end);
    if (text.replace(/\s/g, '').length > 14 || !/\p{Script=Han}/u.test(text)) return;
    if (all.some(g => g.startIndex === start && g.endIndex === end)) return;
    if (all.some(g => g.startIndex <= end && g.endIndex >= start && !(start <= g.startIndex && end >= g.endIndex))) return;
    if (sentence.excludedGroupRanges?.some(r => r.start < tokens.at(-1)!.end && r.end > tokens[0].start)) return;
    extra.push({ id: `${sentence.id}_clause_${start}_${end}`, startIndex: start, endIndex: end, label: text, kind: 'phrase', autoSelect: false, source: 'short-clause' });
  };
  for (let i = 0; i <= sentence.tokens.length; i++) {
    if (i === sentence.tokens.length || /^[，,。！？!?；;\r\n]+$/.test(sentence.tokens[i].text)) { flush(i - 1); start = i + 1; }
  }
  return [...existing, ...extra];
}
