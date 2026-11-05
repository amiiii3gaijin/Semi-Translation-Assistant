import { create } from 'zustand';
import { SourceSelection } from '../utils/sourceSelection';

// Ephemeral: never save an unfinished key hold or mouse drag to IndexedDB.
export const useSelectionStore = create<{
  selection: SourceSelection | null;
  entry: { sentenceId: string; index: number } | null;
  setEntry: (entry: { sentenceId: string; index: number } | null) => void;
  fineRange: { sentenceId: string; start: number; end: number } | null;
  setFineRange: (range: { sentenceId: string; start: number; end: number } | null) => void;
  setSelection: (selection: SourceSelection | null) => void;
}>((set) => ({ selection: null, entry: null, setEntry: entry => set({ entry }), fineRange: null, setFineRange: fineRange => set({ fineRange }),
  setSelection: (selection) => set({ selection }) }));
