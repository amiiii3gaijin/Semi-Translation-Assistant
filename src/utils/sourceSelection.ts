import { Sentence, Token } from '../types';
import { isNavigableToken } from './tokenNavigation';

export type Direction = -1 | 1;
export interface SelectionShape {
  start: number;
  end: number;
  cursor: number;
  direction: Direction;
  blockStart: number;
  blockEnd: number;
}
export interface SourceSelection extends SelectionShape {
  sentenceId: string;
  origin: number;
  mode: 'preview' | 'keyboard' | 'mouse';
  beforeExpansion?: SourceSelection;
  anchorStart?: number;
  anchorEnd?: number;
  automatic?: boolean;
}

export function singleSelection(sentence: Sentence, index: number, mode: SourceSelection['mode']): SourceSelection {
  return { sentenceId: sentence.id, origin: index, start: index, end: index,
    cursor: index, direction: 1, blockStart: index, blockEnd: index, mode };
}

export function nextWord(tokens: Token[], index: number, direction: Direction): number | null {
  for (let i = index + direction; i >= 0 && i < tokens.length; i += direction) {
    if (isNavigableToken(tokens[i])) return i;
  }
  return null;
}

export function moveSelection(selection: SourceSelection, tokens: Token[], direction: Direction): SourceSelection {
  const edge = selection.direction === 1 ? selection.end : selection.start;
  const fixed = selection.direction === 1 ? selection.start : selection.end;
  const next = nextWord(tokens, edge, direction);
  if (next === null) return selection;
  return { ...selection, start: Math.min(fixed, next), end: Math.max(fixed, next),
    cursor: next, direction: next === fixed ? selection.direction : next < fixed ? -1 : 1,
    blockStart: next, blockEnd: next, beforeExpansion: undefined, automatic: false };
}

export function expandSelection(selection: SourceSelection, sentence: Sentence): SourceSelection {
  const pair = sentence.pairedGroups?.find(g => g.startIndex === selection.cursor || g.endIndex === selection.cursor);
  const group = [pair, ...sentence.groups, ...(sentence.candidateGroups ?? [])]
    .filter((g): g is NonNullable<typeof g> => !!g && g.startIndex <= selection.blockStart && g.endIndex >= selection.blockEnd
      && (g.startIndex < selection.blockStart || g.endIndex > selection.blockEnd))
    .sort((a, b) => (a.endIndex - a.startIndex) - (b.endIndex - b.startIndex))[0];
  if (!group) return selection;
  const { start, end } = selection;
  // Already covered: do not manufacture an expansion/undo state or visual change.
  if (group.startIndex >= start && group.endIndex <= end) return selection;
  return { ...selection, start: Math.min(start, group.startIndex), end: Math.max(end, group.endIndex),
    blockStart: group.startIndex, blockEnd: group.endIndex,
    automatic: false, beforeExpansion: selection };
}

export function shrinkSelection(selection: SourceSelection): SourceSelection {
  if (!selection.beforeExpansion) return selection;
  return selection.beforeExpansion;
}

// Move the active end by whole units, retaining the initial anchor block.
export function moveGroupedSelection(selection: SourceSelection, sentence: Sentence, direction: Direction,
  fine?: { start: number; end: number } | null): SourceSelection {
  const anchorStart = selection.anchorStart ?? selection.start;
  const anchorEnd = selection.anchorEnd ?? selection.end;
  const next = nextWord(sentence.tokens, direction === 1 ? selection.blockEnd : selection.blockStart, direction);
  if (next === null) return selection;
  const group = fine && next >= fine.start && next <= fine.end ? undefined
    : sentence.groups.find(g => g.autoSelect !== false && g.startIndex <= next && g.endIndex >= next);
  const a = group?.startIndex ?? next, b = group?.endIndex ?? next;
  // Entering a group is an expansion too. Keep the fine landing (and the
  // existing anchor) so 7 undoes only this automatic enlargement.
  const landing: SourceSelection = { ...selection, anchorStart, anchorEnd,
    start: Math.min(anchorStart, next), end: Math.max(anchorEnd, next),
    cursor: next, direction, blockStart: next, blockEnd: next,
    beforeExpansion: undefined, automatic: false };
  const start = Math.min(anchorStart, a), end = Math.max(anchorEnd, b);
  if (group && a === anchorStart && b === anchorEnd) {
    // Returning to the anchor group leaves no earlier range to preserve.
    // It must still be possible to collapse that group and continue finely.
    landing.start = landing.end = landing.anchorStart = landing.anchorEnd = next;
  }
  return { ...selection, anchorStart, anchorEnd,
    start, end,
    cursor: direction === 1 ? b : a, direction,
    blockStart: a, blockEnd: b,
    beforeExpansion: start !== landing.start || end !== landing.end ? landing : undefined,
    automatic: false };
}

export function sourceText(sentence: Sentence, start: number, end: number): string {
  const a = sentence.tokens[Math.min(start, end)];
  const b = sentence.tokens[Math.max(start, end)];
  return a && b ? sentence.originalText.slice(a.start, b.end) : '';
}
