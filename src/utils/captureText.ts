import { Sentence } from '../types';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { sourceText } from './sourceSelection';

// Only separate word-to-word boundaries. Existing whitespace and punctuation
// remain verbatim, including apostrophes, decimals and protected citations.
export function needsWordSpace(left: string, right: string): boolean {
  return /[\p{L}\p{M}\p{N}]$/u.test(left) && /^[\p{L}\p{M}\p{N}]/u.test(right);
}

// Every capture stands apart from its neighbours with one space on each side,
// unless the gap is already there, the line starts or ends, or punctuation hugs it:
// opening marks take no space after them, closing marks none before them.
export function needsLeadingSpace(left: string, text: string): boolean {
  if (!left || /\s$/u.test(left) || /^\s/u.test(text)) return false;
  if (/[(\[{“‘（《「『]$/u.test(left)) return false;
  // A straight quote after a space or at the start opens a quotation.
  return !/(?:^|\s)['"]$/u.test(left);
}

export function needsTrailingSpace(text: string, right: string): boolean {
  return !/\s$/u.test(text) && !/^[\s,.;:!?)\]}'"”’，。；：！？、）》」』]/u.test(right);
}

export function captureText(sentence: Sentence, start: number, end: number): string {
  if (!!sentence.tokens[start]?.isAnnotation !== !!sentence.tokens[end]?.isAnnotation) return '';
  if (!usePreferencesStore.getState().spaceCapturedWords) return sourceText(sentence, start, end);
  const tokens = sentence.tokens.slice(Math.min(start, end), Math.max(start, end) + 1);
  let result = '';
  for (const token of tokens) {
    if (token.isAnnotation && token.isMarkup) continue;
    if (needsWordSpace(result, token.text)) result += ' ';
    result += token.text;
  }
  return result;
}
