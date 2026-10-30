import type { Sentence, TokenGroup } from '../types';

/** Exact, token-aligned, cross-card repetitions only. Never modify tokens. */
export function attachConsistencyTerms(sentences: Sentence[], labels: string[]) {
  const occupied = new Map<string, { start: number; end: number }[]>();
  for (const label of [...new Set(labels)].slice(0, 5)) {
    const hits: { sentence: Sentence; group: TokenGroup }[] = [];
    for (const sentence of sentences) {
      let at = sentence.originalText.indexOf(label);
      while (at >= 0) {
        const end = at + label.length;
        const startIndex = sentence.tokens.findIndex(t => t.start === at);
        const endIndex = sentence.tokens.findIndex(t => t.end === end);
        const tokens = sentence.tokens.slice(startIndex, endIndex + 1);
        const latinCut = (/[\p{Script=Latin}\d]/u.test(label[0]) && /[\p{Script=Latin}\d]/u.test(sentence.originalText[at - 1] ?? ''))
          || (/[\p{Script=Latin}\d]/u.test(label.at(-1)!) && /[\p{Script=Latin}\d]/u.test(sentence.originalText[end] ?? ''));
        if (startIndex >= 0 && endIndex >= startIndex && !latinCut && !tokens.some(t => t.isCitation || t.isVerbatim || t.isMarkup)
          && !(occupied.get(sentence.id) ?? []).some(s => s.start < end && s.end > at)) {
          hits.push({ sentence, group: { id: `${sentence.id}_consistent_${at}`, startIndex, endIndex, label, kind: 'term', autoSelect: false } });
        }
        at = sentence.originalText.indexOf(label, end);
      }
    }
    if (new Set(hits.map(h => h.sentence.id)).size < 2) continue;
    for (const { sentence, group } of hits) {
      (sentence.consistencyTerms ??= []).push({ ...group, count: hits.length });
      const spans = occupied.get(sentence.id) ?? [];
      spans.push({ start: sentence.tokens[group.startIndex].start, end: sentence.tokens[group.endIndex].end });
      occupied.set(sentence.id, spans);
    }
  }
}
