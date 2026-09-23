import { Sentence } from '../types';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { singleSelection, SourceSelection } from './sourceSelection';

export function automaticSelection(sentence: Sentence): SourceSelection | null {
  if (!usePreferencesStore.getState().autoSelectGroups) return null;
  const index = sentence.activeTokenIndex;
  const fine = useSelectionStore.getState().fineRange;
  if (fine?.sentenceId === sentence.id && index >= fine.start && index <= fine.end) return null;
  const group = sentence.groups.find(g => g.autoSelect !== false && g.startIndex <= index && g.endIndex >= index);
  if (!group) return null;
  const first = singleSelection(sentence, group.startIndex, 'preview');
  return { ...first, start: group.startIndex, end: group.endIndex, cursor: index,
    blockEnd: group.endIndex, automatic: true, beforeExpansion: first };
}

export function effectiveSelection(sentence: Sentence): SourceSelection | null {
  const explicit = useSelectionStore.getState().selection;
  return explicit?.sentenceId === sentence.id ? explicit : automaticSelection(sentence);
}

export function stayFine(sentence: Sentence, selection: SourceSelection) {
  const group = sentence.groups.find(g => g.startIndex <= selection.cursor && g.endIndex >= selection.cursor);
  useSelectionStore.getState().setFineRange({ sentenceId: sentence.id,
    start: group?.startIndex ?? selection.start, end: group?.endIndex ?? selection.end });
}
