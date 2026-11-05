import { create } from 'zustand';

// Intentionally session-only: returning to the app always starts in typing mode.
export const useCaptureModeStore = create<{
  active: boolean;
  setActive: (active: boolean) => void;
}>(set => ({ active: false, setActive: active => set({ active }) }));
