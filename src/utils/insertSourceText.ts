import { useDocumentStore } from '../store/useDocumentStore';
import { nextWord } from './sourceSelection';
import { needsWordSpace } from './captureText';
import { usePreferencesStore } from '../store/usePreferencesStore';

export interface TranslationTarget { start: number; end: number; value: string }

/** Shared by mouse and keyboard; preserve the source and the target caret. */
export function insertSourceText(sentenceId: string, text: string, sourceEnd: number,
  textarea: HTMLTextAreaElement | null, target?: TranslationTarget): boolean {
  const store = useDocumentStore.getState();
  const sentence = store.sentences[store.currentActiveIndex];
  if (!text || sentence?.id !== sentenceId || !textarea || textarea.dataset.sentenceId !== sentenceId) return false;
  if (target && textarea.value !== target.value) return false;
  const start = target?.start ?? textarea.selectionStart;
  const end = target?.end ?? textarea.selectionEnd;
  if (usePreferencesStore.getState().spaceCapturedWords) {
    if (needsWordSpace(textarea.value.slice(0, start), text)) text = ' ' + text;
    if (needsWordSpace(text, textarea.value.slice(end))) text += ' ';
  }
  const expected = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(start, end);
  // Preserve browser undo history when insertText is supported.
  try { document.execCommand('insertText', false, text); } catch { /* controlled fallback below */ }
  if (textarea.value !== expected) {
    // A failed or partial browser edit must not be applied a second time.
    textarea.value = expected;
    textarea.setSelectionRange(start + text.length, start + text.length);
  }
  store.updateTranslation(sentenceId, expected);
  const caret = start + text.length;
  requestAnimationFrame(() => {
    if (textarea.isConnected && textarea.dataset.sentenceId === sentenceId && textarea.value === expected) {
      textarea.setSelectionRange(caret, caret);
    }
  });
  if (usePreferencesStore.getState().autoAdvanceAfterCapture) {
    store.setActiveTokenIndex(sentenceId, nextWord(sentence.tokens, sourceEnd, 1)
      ?? nextWord(sentence.tokens, sourceEnd + 1, -1) ?? 0);
  }
  return true;
}
