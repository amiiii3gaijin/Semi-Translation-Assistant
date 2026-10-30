import { commandCode, ALT_PAD } from '../utils/keyboardCommands';
import React, { useEffect } from 'react';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { expandSelection, moveSelection, moveGroupedSelection, nextWord, shrinkSelection, singleSelection } from '../utils/sourceSelection';
import { insertSourceText, TranslationTarget } from '../utils/insertSourceText';
import { captureText } from '../utils/captureText';
import { createVisualLineNavigator } from '../utils/visualLineNavigation';
import { effectiveSelection, stayFine } from '../utils/automaticSelection';
import { isNavigableToken } from '../utils/tokenNavigation';
import { usePreferencesStore } from '../store/usePreferencesStore';

export function useKeyboardShortcuts(textareaRef: React.RefObject<HTMLTextAreaElement | null>) {
  useEffect(() => {
    let fiveHeld = false;
    let rightAlt = false;
    let captureKey: string | null = null;
    let pageTimer: ReturnType<typeof setInterval> | undefined;
    let pageDelay: ReturnType<typeof setTimeout> | undefined;
    const stopPaging = () => { clearInterval(pageTimer); clearTimeout(pageDelay); pageTimer = undefined; pageDelay = undefined; };
    let cancelled = false;
    let lastPageStep = 0;
    let target: TranslationTarget | undefined;
    const vertical = createVisualLineNavigator();
    const select = useSelectionStore.getState().setSelection;
    const cancel = () => {
      vertical.reset();
      if (fiveHeld) cancelled = true;
      target = undefined;
      select(null);
    };
    const allowed = (event: Pick<KeyboardEvent, 'target'>) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return false;
      const element = event.target as HTMLElement | null;
      if (element === textareaRef.current) return true;
      return !element?.closest('input, textarea, select, [contenteditable="true"], .help-panel');
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = commandCode(e.code, rightAlt);
      if (code === 'F9' && e.ctrlKey && e.altKey && e.shiftKey && !e.metaKey) return;
      if ((e.target as HTMLElement | null)?.closest('[data-ribbon-dev]')) return;
      if (!allowed(e)) { rightAlt = false; stopPaging(); cancel(); return; }
      if (e.code === 'AltRight' && !e.isComposing && allowed(e)) {
        rightAlt = true; e.preventDefault(); e.stopPropagation(); return;
      }
      const layerCommand = rightAlt && !!ALT_PAD[e.code];
      if (layerCommand && e.code !== 'ControlRight' && e.code !== 'ShiftRight') stopPaging();
      if (e.isComposing || e.metaKey || (!layerCommand && (e.ctrlKey || e.altKey || e.shiftKey)) || !allowed(e)) {
        if (e.isComposing) rightAlt = false; stopPaging();
        cancel();
        return;
      }
      const store = useDocumentStore.getState();
      const sentence = store.sentences[store.currentActiveIndex];
      if (!sentence || !sentence.tokens.length) return;
      if (code === 'Numpad8' || code === 'Numpad2') {
        e.preventDefault();
        e.stopPropagation();
        // Standalone only: do not change held, mouse or preview selections.
        const activeSelection = useSelectionStore.getState().selection;
        if (fiveHeld || (activeSelection && !activeSelection.automatic)) return;
        const next = vertical.move(sentence, code === 'Numpad8' ? -1 : 1);
        if (next !== null) {
          select(null);
          useSelectionStore.getState().setEntry({ sentenceId: sentence.id, index: next });
          store.setActiveTokenIndex(sentence.id, next);
        }
        return;
      }
      vertical.reset();
      if (rightAlt && (e.code === 'ControlRight' || e.code === 'ShiftRight')) {
        e.preventDefault(); e.stopPropagation();
        if (e.repeat || pageTimer || pageDelay) return;
        cancel();
        const step = () => {
          if (!rightAlt || !allowed({target: document.activeElement})) { stopPaging(); return; }
          if (code === 'PageUp') useDocumentStore.getState().prevSentence();
          else useDocumentStore.getState().nextSentence();
          requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
        };
        step();
        pageDelay = setTimeout(() => { pageDelay = undefined; if (!rightAlt || !allowed({target: document.activeElement})) return; step(); pageTimer = setInterval(step, 130); }, 350);
        return;
      }
      if (['PageUp', 'PageDown', 'NumpadAdd', 'NumpadEnter'].includes(code)) {
        e.preventDefault();
        e.stopPropagation();
        cancel();
        const pageKey = code === 'PageUp' || code === 'PageDown';
        if (e.repeat && !pageKey) return;
        // Use native key repeat: releasing the key stops immediately, with no
        // timer or queued page changes. Bound the rate on fast-repeat keyboards.
        if (pageKey) {
          const now = performance.now();
          if (e.repeat && now - lastPageStep < 100) return;
          lastPageStep = now;
        }
        if (code === 'PageUp' || code === 'NumpadAdd') store.prevSentence();
        else {
          if (code === 'NumpadEnter') store.markCurrentSentenceCompleted();
          store.nextSentence();
        }
        requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
        return;
      }
      const handled = ['Numpad1', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad9'];
      if (!handled.includes(code)) {
        if (fiveHeld || code === 'Escape') cancel();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat && code !== 'Numpad4' && code !== 'Numpad6') return;
      if (code === 'Numpad3') {
        cancel();
        const last = nextWord(sentence.tokens, sentence.tokens.length, -1);
        if (last !== null) {
          useSelectionStore.getState().setEntry({ sentenceId: sentence.id, index: last });
          useSelectionStore.getState().setFineRange({ sentenceId: sentence.id, start: last, end: last });
          store.setActiveTokenIndex(sentence.id, last);
        }
        return;
      }
      if (code === 'Numpad1') {
        const current = effectiveSelection(sentence);
        if (current) stayFine(sentence, current);
        cancel(); return;
      }
      if (code === 'Numpad5') {
        if (fiveHeld || e.repeat) return;
        const textarea = textareaRef.current;
        if (!textarea || textarea.dataset.sentenceId !== sentence.id) return;
        fiveHeld = true; captureKey = e.code;
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
      if (code === 'Numpad4' || code === 'Numpad6') {
        const direction = code === 'Numpad4' ? -1 : 1;
        if (fiveHeld && current?.mode === 'keyboard') {
          const next = usePreferencesStore.getState().captureUnit === 'group'
            ? moveGroupedSelection(current, sentence, direction, useSelectionStore.getState().fineRange)
            : moveSelection(current, sentence.tokens, direction);
          select(next);
          store.setActiveTokenIndex(sentence.id, next.cursor);
        } else {
          const edge = current ? (direction === 1 ? current.end : current.start) : sentence.activeTokenIndex;
          const next = nextWord(sentence.tokens, edge, direction);
          select(null);
          if (next !== null) {
            useSelectionStore.getState().setEntry({ sentenceId: sentence.id, index: next });
            store.setActiveTokenIndex(sentence.id, next);
          }
        }
        return;
      }
      const base = current ?? singleSelection(sentence, sentence.activeTokenIndex, 'preview');
      if (base.mode === 'mouse') return;
      if (code === 'Numpad7') {
        useSelectionStore.getState().setFineRange(null);
        select(expandSelection(base, sentence));
      } else {
        if (!base.beforeExpansion) return;
        stayFine(sentence, base);
        const next = shrinkSelection(base);
        store.setActiveTokenIndex(sentence.id, next.cursor);
        select(fiveHeld ? { ...next, mode: 'keyboard', automatic: false }
          : next.beforeExpansion ? next : null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ControlRight' || e.code === 'ShiftRight') stopPaging();
      if (e.code === 'AltRight') {
        const wasLayer = rightAlt; rightAlt = false; stopPaging();
        if (wasLayer) {
          e.preventDefault();
          if (fiveHeld) cancel();
          fiveHeld = false; captureKey = null;
        }
        return;
      }
      if (e.code !== captureKey || !fiveHeld) return;
      e.preventDefault();
      const selection = useSelectionStore.getState().selection;
      const store = useDocumentStore.getState();
      const sentence = store.sentences[store.currentActiveIndex];
      const canCommit = !cancelled && !e.isComposing && !e.metaKey && (rightAlt && captureKey === 'KeyS' || !e.ctrlKey && !e.altKey && !e.shiftKey)
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
    const onBlur = () => { rightAlt = false; stopPaging(); cancel(); fiveHeld = false; captureKey = null; };
    const onVisibility = () => { if (document.hidden) onBlur(); };
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest('[data-ribbon-dev]') && !fiveHeld) return;
      stopPaging(); cancel();
    };
    const unsubscribe = useDocumentStore.subscribe((state, previous) => {
      if (state.documentId !== previous.documentId) { rightAlt = false; stopPaging(); }
      if (state.documentId !== previous.documentId || state.currentActiveIndex !== previous.currentActiveIndex) {
        useSelectionStore.getState().setEntry(null);
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
    window.addEventListener('compositionstart', onBlur, true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopPaging();
      unsubscribe();
      unsubscribePreferences();
      select(null);
      useSelectionStore.getState().setFineRange(null);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('compositionstart', onBlur, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [textareaRef]);
}

