import { Sentence } from '../types';
import { isNavigableToken } from './tokenNavigation';

/** Reading-order units, independent of wrapping and citation character length. */
export function regionUnits(sentence: Sentence, annotation: boolean, autoGroups: boolean): number[][] {
  const units: number[][] = [];
  for (let i = 0; i < sentence.tokens.length; i++) {
    if (!!sentence.tokens[i].isAnnotation !== annotation || !isNavigableToken(sentence.tokens[i])) continue;
    const group = !annotation && autoGroups && sentence.groups.find(g => g.autoSelect !== false && g.startIndex <= i && g.endIndex >= i);
    const end = group ? group.endIndex : i;
    const indices: number[] = [];
    for (; i <= end; i++) if (isNavigableToken(sentence.tokens[i])) indices.push(i);
    i--;
    if (indices.length) units.push(indices);
  }
  return units;
}

export function proportionalRegionTarget(sentence: Sentence, targetAnnotation: boolean, autoGroups: boolean): number | null {
  const from = regionUnits(sentence, !targetAnnotation, autoGroups);
  const to = regionUnits(sentence, targetAnnotation, autoGroups);
  if (!to.length) return null;
  const index = Math.max(0, from.findIndex(unit => unit.includes(sentence.activeTokenIndex)));
  const ratio = from.length > 1 ? index / (from.length - 1) : 0;
  return to[Math.round(ratio * (to.length - 1))][0];
}
