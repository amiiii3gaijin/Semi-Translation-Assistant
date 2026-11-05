import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Preferences {
  returnToTypingAfterCapture: boolean;
  setReturnToTypingAfterCapture: (value: boolean) => void;
  highlightConsistency: boolean;
  setHighlightConsistency: (value: boolean) => void;
  captureUnit: 'word' | 'group';
  progressMode: 'filled' | 'position';
  setCaptureUnit: (value: 'word' | 'group') => void;
  setProgressMode: (value: 'filled' | 'position') => void;
  spaceCapturedWords: boolean;
  spaceAfterCapture: boolean;
  setSpaceAfterCapture: (value: boolean) => void;
  showPhraseMarkers: boolean;
  autoSelectGroups: boolean;
  autoAdvanceAfterCapture: boolean;
  setAutoAdvanceAfterCapture: (value: boolean) => void;
  setAutoSelectGroups: (value: boolean) => void;
  setSpaceCapturedWords: (value: boolean) => void;
  setShowPhraseMarkers: (value: boolean) => void;
}

export const usePreferencesStore = create<Preferences>()(persist(set => ({
  returnToTypingAfterCapture: true,
  setReturnToTypingAfterCapture: returnToTypingAfterCapture => set({ returnToTypingAfterCapture }),
  highlightConsistency: false,
  setHighlightConsistency: highlightConsistency => set({ highlightConsistency }),
  captureUnit: 'group',
  progressMode: 'filled',
  setCaptureUnit: captureUnit => set({ captureUnit }),
  setProgressMode: progressMode => set({ progressMode }),
  spaceCapturedWords: false,
  spaceAfterCapture: true,
  setSpaceAfterCapture: (value: boolean) => set({ spaceAfterCapture: value }),
  showPhraseMarkers: true,
  autoSelectGroups: true,
  autoAdvanceAfterCapture: true,
  setAutoAdvanceAfterCapture: (value: boolean) => set({ autoAdvanceAfterCapture: value }),
  setAutoSelectGroups: (value: boolean) => set({ autoSelectGroups: value }),
  setSpaceCapturedWords: (value: boolean) => set({ spaceCapturedWords: value }),
  setShowPhraseMarkers: (value: boolean) => set({ showPhraseMarkers: value }),
}), { name: 'half-translation-preferences' }));
