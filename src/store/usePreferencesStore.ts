import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Preferences {
  spaceCapturedWords: boolean;
  showPhraseMarkers: boolean;
  autoSelectGroups: boolean;
  setAutoSelectGroups: (value: boolean) => void;
  setSpaceCapturedWords: (value: boolean) => void;
  setShowPhraseMarkers: (value: boolean) => void;
}

export const usePreferencesStore = create<Preferences>()(persist(set => ({
  spaceCapturedWords: false,
  showPhraseMarkers: true,
  autoSelectGroups: true,
  setAutoSelectGroups: (value: boolean) => set({ autoSelectGroups: value }),
  setSpaceCapturedWords: (value: boolean) => set({ spaceCapturedWords: value }),
  setShowPhraseMarkers: (value: boolean) => set({ showPhraseMarkers: value }),
}), { name: 'half-translation-preferences' }));
