import React, { useEffect, useRef } from 'react';
import { Sentence } from '../../types';
import { TokenItem } from './TokenItem';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { singleSelection } from '../../utils/sourceSelection';
import { insertSourceText, TranslationTarget } from '../../utils/insertSourceText';
import { SelectionSurface } from './SelectionSurface';
import { SELECTION_LIFT, SELECTION_SCALE } from '../../design/motion';
import { captureText } from '../../utils/captureText';
import { automaticSelection } from '../../utils/automaticSelection';
import { usePreferencesStore } from '../../store/usePreferencesStore';

interface TokenListProps {
  sentence: Sentence;
  isActive?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function TokenList({ sentence, textareaRef, isActive = true }: TokenListProps) {
  const { selection } = useSelectionStore(); // Also rerender when temporary fine-selection changes.
  const autoGroups = usePreferencesStore(state => state.autoSelectGroups);
  const local = selection?.sentenceId === sentence.id ? selection : autoGroups ? automaticSelection(sentence) : null;
  const drag = useRef<{ pointerId: number; target?: TranslationTarget } | null>(null);
  const sourceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const cancel = () => {
      if (!drag.current) return;
      drag.current = null;
      if (useSelectionStore.getState().selection?.mode === 'mouse') {
        useSelectionStore.getState().setSelection(null);
      }
    };
    const up = (event: PointerEvent) => {
      if (!drag.current || drag.current.pointerId !== event.pointerId) return;
      const target = drag.current.target;
      drag.current = null;
      const selected = useSelectionStore.getState().selection;
      const state = useDocumentStore.getState();
      const current = state.sentences[state.currentActiveIndex];
      if (selected?.mode === 'mouse' && selected.sentenceId === sentence.id && current?.id === sentence.id) {
        insertSourceText(current.id, captureText(current, selected.start, selected.end),
          selected.end, textareaRef?.current ?? null, target);
      }
      useSelectionStore.getState().setSelection(null);
    };
    const key = (event: KeyboardEvent) => { if (event.code === 'Escape') cancel(); };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancel();
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [sentence.id, textareaRef, isActive]);

  const down = (event: React.PointerEvent, index: number) => {
    if (!isActive || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); // Preserve the insertion caret/selection in the textarea.
    const textarea = textareaRef?.current;
    drag.current = { pointerId: event.pointerId, target: textarea
      ? { start: textarea.selectionStart, end: textarea.selectionEnd, value: textarea.value } : undefined };
    useDocumentStore.getState().setActiveTokenIndex(sentence.id, index);
    useSelectionStore.getState().setSelection(singleSelection(sentence, index, 'mouse'));
  };
  const enter = (event: React.PointerEvent, index: number) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    if (event.pointerType === 'mouse' && !(event.buttons & 1)) {
      drag.current = null;
      useSelectionStore.getState().setSelection(null);
      return;
    }
    const current = useSelectionStore.getState().selection;
    if (!current || current.mode !== 'mouse' || current.sentenceId !== sentence.id) return;
    useSelectionStore.getState().setSelection({ ...current,
      start: Math.min(current.origin, index), end: Math.max(current.origin, index),
      cursor: index, blockStart: index, blockEnd: index });
  };
  const selectedRange = local ?? { start: sentence.activeTokenIndex, end: sentence.activeTokenIndex };
  const renderToken = (index: number) => {
    const token = sentence.tokens[index];
    const selected = isActive && (local ? index >= local.start && index <= local.end : index === sentence.activeTokenIndex);
    return <TokenItem key={token.id} token={token} index={index} selected={selected}
      onPointerDown={event => down(event, index)} onPointerEnter={event => enter(event, index)} />;
  };

  return <div className="w-full min-w-0">
    <div ref={sourceRef} data-source-text data-source-sentence={sentence.id} className="source-flow" aria-label="原文选词区"
      style={{ '--selection-scale': SELECTION_SCALE, '--selection-lift': `-${SELECTION_LIFT}px` } as React.CSSProperties}>
      <SelectionSurface container={sourceRef} sentence={sentence} selected={isActive ? selectedRange : { start: -1, end: -1 }} isActive={isActive} />
      {sentence.tokens.map((_, index) => renderToken(index))}
    </div>
  </div>;
}

