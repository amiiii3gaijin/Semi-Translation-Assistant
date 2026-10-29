import { tokenize, type TokenTrace } from './tokenizer';
import { buildTokenGroups, type GroupTrace } from './tokenGroups';
import { createParserContext, type ParserContext } from './documentTerms';
import type { Token, TokenGroup } from '../types';

/** The workbench and lab use exactly the same parsing pipeline. */
export function parseSentence(source: string, id: string, observe?: (trace: GroupTrace) => void, observeToken?: (trace: TokenTrace) => void, context: ParserContext = createParserContext(source), sourceOffset = 0) {
  if (context.blocks.some(b => b.start < sourceOffset + source.length && b.end > sourceOffset) || /[┌┐└┘├┤┬┴┼│─]/u.test(source)) {
    const tokens: Token[] = source ? [{ id: `${id}_0`, start: 0, end: source.length, text: source, pos: 'unk', isPunctuation: false, isVerbatim: true }] : [];
    if (source) observeToken?.({ start: 0, end: source.length, origin: 'protected-run' });
    return { tokens, groups: [] as TokenGroup[], pairedGroups: [] as TokenGroup[] };
  }
  const tokens = tokenize(source, id, observeToken, context);
  const pairedGroups: TokenGroup[] = [];
  return { tokens, groups: buildTokenGroups(source, tokens, observe, context, pairedGroups), pairedGroups };
}
