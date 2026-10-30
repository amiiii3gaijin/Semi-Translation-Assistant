import type { Sentence, TokenGroup } from '../types';

/** Narrow suppression of generic noun tails; keep meaningful actions/conditions. */
export function usefulCandidate(sentence: Sentence, candidate: TokenGroup): boolean {
  return !sentence.groups.some(core => core.autoSelect !== false && core.startIndex === candidate.startIndex
    && core.endIndex < candidate.endIndex
    && /^(?:的地方|的东西|的事情)$/.test(sentence.tokens.slice(core.endIndex + 1, candidate.endIndex + 1).map(t => t.text).join('').trim()));
}

/** Fit complete equal dashes to a normalized SVG path length, with no clipped final dash. */
export function fittedDashes(length: number, fontSize: number): string | undefined {
  if (!(length > 0)) return undefined;
  const targetDash = fontSize * 0.42, targetGap = fontSize * 0.22;
  const count = Math.max(1, Math.round((length + targetGap) / (targetDash + targetGap)));
  const scale = length / (count * targetDash + (count - 1) * targetGap);
  return `${targetDash * scale} ${targetGap * scale}`;
}
