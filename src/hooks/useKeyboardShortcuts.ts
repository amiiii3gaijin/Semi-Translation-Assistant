import React, { useEffect } from 'react';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { expandSelection, moveSelection, nextWord, shrinkSelection, singleSelection } from '../utils/sourceSelection';
import { insertSourceText, TranslationTarget } from '../utils/insertSourceText';
import { captureText } from '../utils/captureText';
import { createVisualLineNavigator } from '../utils/visualLineNavigation';
import { effectiveSelection, stayFine } from '../utils/automaticSelection';
import { isNavigableToken } from '../utils/tokenNavigation';
import { usePreferencesStore } from '../store/usePreferencesStore';

export function useKeyboardShortcuts(textareaRef: React.RefObject<HTMLTextAreaElement | null>) {
  useEffect(() => {
    let fiveHeld = false;
    let cancelled = false;
    let target: TranslationTarget | undefined;
    const vertical = createVisualLineNavigator();
    const select = useSelectionStore.getState().setSelection;
    const cancel = () => {
      vertical.reset();
      if (fiveHeld) cancelled = true;
      target = undefined;
      select(null);
    };
    const allowed = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return false;
      const element = event.target as HTMLElement | null;
      if (element === textareaRef.current) return true;
      return !element?.closest('input, textarea, select, [contenteditable="true"], .help-panel');
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F9' && e.ctrlKey && e.altKey && e.shiftKey && !e.metaKey) return;
      if ((e.target as HTMLElement | null)?.closest('[data-ribbon-dev]')) return;
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || !allowed(e)) {
        cancel();
        return;
      }
      const store = useDocumentStore.getState();
      const sentence = store.sentences[store.currentActiveIndex];
      if (!sentence || !sentence.tokens.length) return;
      if (e.code === 'Numpad8' || e.code === 'Numpad2') {
        e.preventDefault();
        e.stopPropagation();
        // Standalone only: do not change held, mouse or preview selections.
        const activeSelection = useSelectionStore.getState().selection;
        if (fiveHeld || (activeSelection && !activeSelection.automatic)) return;
        const next = vertical.move(sentence, e.code === 'Numpad8' ? -1 : 1);
        if (next !== null) {
          select(null);
          store.setActiveTokenIndex(sentence.id, next);
        }
        return;
      }
      vertical.reset();
      if (['PageUp', 'PageDown', 'NumpadAdd', 'NumpadEnter'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        cancel();
        if (e.repeat) return;
        if (e.code === 'PageUp' || e.code === 'NumpadAdd') store.prevSentence();
        else {
          if (e.code === 'NumpadEnter') store.markCurrentSentenceCompleted();
          store.nextSentence();
        }
        requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
        return;
      }
      const handled = ['Numpad1', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad9'];
      if (!handled.includes(e.code)) {
        if (fiveHeld || e.code === 'Escape') cancel();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat && e.code !== 'Numpad4' && e.code !== 'Numpad6') return;
      if (e.code === 'Numpad1') {
        const current = effectiveSelection(sentence);
        if (current) stayFine(sentence, current);
        cancel(); return;
      }
      if (e.code === 'Numpad5') {
        if (fiveHeld || e.repeat) return;
        const textarea = textareaRef.current;
        if (!textarea || textarea.dataset.sentenceId !== sentence.id) return;
        fiveHeld = true;
        cancelled = false;
        target = { start: textarea.selectionStart, end: textarea.selectionEnd, value: textarea.value };
        const preview = effectiveSelection(sentence);
        const index = !isNavigableToken(sentence.tokens[sentence.activeTokenIndex])
          ? nextWord(sentence.tokens, -1, 1) : sentence.activeTokenIndex;
        if (index === null || index === undefined) { cancel(); return; }
        select(preview?.sentenceId === sentence.id && preview.mode === 'preview'
          ? { ...preview, mode: 'keyboard' } : singleSelection(sentence, index, 'keyboard'));
        return;
      }
      if (fiveHeld && cancelled) return;
      const current = effectiveSelection(sentence);
      if (e.code === 'Numpad4' || e.code === 'Numpad6') {
        const direction = e.code === 'Numpad4' ? -1 : 1;
        if (fiveHeld && current?.mode === 'keyboard') {
          const next = moveSelection(current, sentence.tokens, direction);
          select(next);
          store.setActiveTokenIndex(sentence.id, next.cursor);
        } else {
          const edge = current ? (direction === 1 ? current.end : current.start) : sentence.activeTokenIndex;
          const next = nextWord(sentence.tokens, edge, direction);
          select(null);
          if (next !== null) store.setActiveTokenIndex(sentence.id, next);
        }
        return;
      }
      const base = current ?? singleSelection(sentence, sentence.activeTokenIndex, 'preview');
      if (base.mode === 'mouse') return;
      if (e.code === 'Numpad9') {
        useSelectionStore.getState().setFineRange(null);
        select(expandSelection(base, sentence));
      } else {
        if (!base.beforeExpansion) return;
        stayFine(sentence, base);
        const next = base.automatic
          ? singleSelection(sentence, base.start, base.mode) : shrinkSelection(base);
        store.setActiveTokenIndex(sentence.id, next.cursor);
        select(fiveHeld ? { ...next, automatic: false } : null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Numpad5' || !fiveHeld) return;
      e.preventDefault();
      const selection = useSelectionStore.getState().selection;
      const store = useDocumentStore.getState();
      const sentence = store.sentences[store.currentActiveIndex];
      const canCommit = !cancelled && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey
        && allowed(e) && selection?.mode === 'keyboard' && sentence?.id === selection.sentenceId;
      fiveHeld = false;
      if (canCommit && selection && sentence) {
        insertSourceText(sentence.id, captureText(sentence, selection.start, selection.end),
          selection.end, textareaRef.current, target);
      }
      target = undefined;
      cancelled = false;
      select(null);
    };
    const onBlur = () => { cancel(); fiveHeld = false; };
    const onVisibility = () => { if (document.hidden) onBlur(); };
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest('[data-ribbon-dev]') && !fiveHeld) return;
      cancel();
    };
    const unsubscribe = useDocumentStore.subscribe((state, previous) => {
      if (state.documentId !== previous.documentId || state.currentActiveIndex !== previous.currentActiveIndex) {
        useSelectionStore.getState().setFineRange(null); cancel();
      }
      const current = state.sentences[state.currentActiveIndex];
      const fine = useSelectionStore.getState().fineRange;
      if (fine && (!current || current.id !== fine.sentenceId || current.activeTokenIndex < fine.start || current.activeTokenIndex > fine.end)) {
        useSelectionStore.getState().setFineRange(null);
      }
    });
    const unsubscribePreferences = usePreferencesStore.subscribe((state, previous) => {
      if (state.autoSelectGroups === previous.autoSelectGroups) return;
      useSelectionStore.getState().setFineRange(null);
      if (!fiveHeld && useSelectionStore.getState().selection?.mode === 'preview') select(null);
    });
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe();
      unsubscribePreferences();
      select(null);
      useSelectionStore.getState().setFineRange(null);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [textareaRef]);
}

