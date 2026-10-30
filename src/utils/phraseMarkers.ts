import type { Sentence, TokenGroup } from '../types';
import { usefulCandidate } from './markerPolicy';

export interface PhraseMarker extends TokenGroup { dashed: boolean; consistent: boolean; connection?: string }

/** Static, single-layer annotations. Cursor/selection state is deliberately not an input. */
export function phraseMarkers(sentence: Sentence, automatic: boolean, highlight: boolean): PhraseMarker[] {
  const defaults = sentence.groups.filter(g => g.autoSelect !== false);
  const candidates = [...sentence.groups.filter(g => g.autoSelect === false), ...(sentence.candidateGroups ?? [])]
    .filter(g => usefulCandidate(sentence, g))
    .filter((g, index, all) => all.findIndex(other => other.startIndex === g.startIndex && other.endIndex === g.endIndex) === index)
    // Advertise the nearest candidate layer; deeper ranges remain keyboard-accessible.
    .filter((g, _, all) => !all.some(other => other !== g && other.startIndex >= g.startIndex && other.endIndex <= g.endIndex
      && (other.startIndex > g.startIndex || other.endIndex < g.endIndex)))
    .sort((a, b) => (a.endIndex - a.startIndex) - (b.endIndex - b.startIndex) || a.startIndex - b.startIndex);
  const cells: ({ group: TokenGroup; dashed: boolean; consistent: boolean } | undefined)[] = Array(sentence.tokens.length);
  // Defaults win overlaps: dashed extensions plus solid cores, never stacked lines.
  for (const group of [...defaults, ...candidates]) {
    const dashed = !automatic || group.autoSelect === false || !defaults.includes(group);
    for (let i = Math.max(0, group.startIndex); i <= group.endIndex && i < cells.length; i++) {
      if (!cells[i]) cells[i] = { group, dashed, consistent: false };
    }
  }
  // Tint existing annotations only; consistency must never create a line.
  if (highlight) for (const term of sentence.consistencyTerms ?? []) {
    for (let i = Math.max(0, term.startIndex); i <= term.endIndex && i < cells.length; i++) {
      if (cells[i]) cells[i]!.consistent = true;
    }
  }
  const result: PhraseMarker[] = [];
  for (let i = 0; i < cells.length;) {
    const cell = cells[i];
    if (!cell) { i++; continue; }
    const start = i++;
    while (i < cells.length && cells[i]?.group === cell.group && cells[i]?.dashed === cell.dashed && cells[i]?.consistent === cell.consistent) i++;
    const owner = candidates.find(g => g.startIndex <= start && g.endIndex >= i - 1);
    result.push({ ...cell.group, id: `marker_${start}_${i - 1}`, startIndex: start, endIndex: i - 1,
      connection: owner ? `candidate_${owner.startIndex}_${owner.endIndex}` : `group_${cell.group.startIndex}_${cell.group.endIndex}`,
      dashed: cell.dashed, consistent: cell.consistent });
  }
  return result;
}
