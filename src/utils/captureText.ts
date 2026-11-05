import { Sentence } from '../types';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { sourceText } from './sourceSelection';

// Only separate word-to-word boundaries. Existing whitespace and punctuation
// remain verbatim, including apostrophes, decimals and protected citations.
export function needsWordSpace(left: string, right: string): boolean {
  return /[\p{L}\p{M}\p{N}]$/u.test(left) && /^[\p{L}\p{M}\p{N}]/u.test(right);
}

// One space after every capture keeps the next typed word apart, unless the gap
// is already there or closing punctuation follows, which takes no space before it.
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
