import { Token } from '../types';

/** Navigation skips pauses, not every symbol. Range copying never drops any text. */
export function isNavigableToken(token: Token | undefined): boolean {
  return !!token && !token.isWhitespace && !token.isMarkup && !/^[\s，,。.!！?？;；:：、…]+$/u.test(token.text);
}
