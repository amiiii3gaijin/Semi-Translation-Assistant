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
  beforeExpansion?: SelectionShape;
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
  if (selection.beforeExpansion) return selection;
  const group = sentence.groups.find(g => g.startIndex <= selection.cursor && g.endIndex >= selection.cursor);
  if (!group) return selection;
  const { start, end, cursor, direction, blockStart, blockEnd } = selection;
  // Already covered: do not manufacture an expansion/undo state or visual change.
  if (group.startIndex >= start && group.endIndex <= end) return selection;
  return { ...selection, start: Math.min(start, group.startIndex), end: Math.max(end, group.endIndex),
    blockStart: group.startIndex, blockEnd: group.endIndex,
    beforeExpansion: { start, end, cursor, direction, blockStart, blockEnd } };
}

export function shrinkSelection(selection: SourceSelection): SourceSelection {
  if (!selection.beforeExpansion) return selection;
  return { ...selection, ...selection.beforeExpansion, beforeExpansion: undefined };
}

export function sourceText(sentence: Sentence, start: number, end: number): string {
  const a = sentence.tokens[Math.min(start, end)];
  const b = sentence.tokens[Math.max(start, end)];
  return a && b ? sentence.originalText.slice(a.start, b.end) : '';
}
