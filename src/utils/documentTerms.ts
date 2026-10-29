import { tokenize } from './tokenizer';
import { codeBlocks } from './textStructure';

export interface DocumentTerm { text: string; pieces: string[]; evidence: 'definition' | 'repeated-label'; count: number }
export interface ParserContext { terms: DocumentTerm[]; blocks: ReturnType<typeof codeBlocks> }

/** Conservative document glossary: definitions first, never every repeated n-gram. */
export function createParserContext(source: string): ParserContext {
  const blocks = codeBlocks(source);
  let masked = source;
  for (const block of [...blocks].reverse()) masked = masked.slice(0, block.start) + ' '.repeat(block.end - block.start) + masked.slice(block.end);
  const candidates = new Map<string, DocumentTerm['evidence']>();
  const add = (text: string, evidence: DocumentTerm['evidence'], explicitLabel = false) => {
    text = text.trim();
    if (!/^[\p{Script=Han}]{2,14}$/u.test(text) || /[的了着]|(?:因此|能够|我们|他们|通过|使得|表明|指出|包括|预测|发生|罹患|展现|采取|针对|一项|冥想组|局限)/u.test(text) || /^(?:其|在|向|中对|同时|但|而|均能)/u.test(text)) return;
    if (!explicitLabel && masked.split(text).length - 1 < 2) return;
    if (!candidates.has(text) || evidence === 'definition') candidates.set(text, evidence);
  };
  // A bounded Han run before an English gloss. Do not take the tail of a long clause.
  for (const m of masked.matchAll(/([\p{Script=Han}]+)[（(]([A-Za-z][A-Za-z ’'\-–]{1,80})[）)]/gu)) {
    const parts = m[1].split(/(?:以及|及其|即|的|与|和|或|称为|称之为)/u);
    const text = parts[parts.length - 1];
    const before = masked.slice(Math.max(0, m.index! - 40), m.index!);
    const explicit = before.endsWith('**') || /(?:^|\n)[ \t]*(?:\d+[.)]|[-*])[ \t]*$/u.test(before);
    if (text.length <= 14) add(text, 'definition', explicit);
  }
  // Explicit labelled items and short bold labels; prose-sized bold claims are excluded.
  for (const m of masked.matchAll(/\*\*([\p{Script=Han}]{2,12})\*\*/gu)) add(m[1], 'repeated-label');
  for (const m of masked.matchAll(/^[ \t]*(?:\d+[.)]|[-*])[ \t]+(?:\*\*)?([\p{Script=Han}]{2,12})[：:]/gmu)) add(m[1], 'definition', true);
  // Repeated noun modifiers of an already defined concept, e.g. 心理 + 幸福感.
  for (const base of [...candidates.keys()]) {
    if (base.length < 3) continue;
    let at = masked.indexOf(base);
    while (at >= 0) {
      const prefix = masked.slice(Math.max(0, at - 2), at);
      if (/^[\p{Script=Han}]{2}$/u.test(prefix)) {
        const part = tokenize(prefix, 'prefix');
        const text = prefix + base;
        if (part.length === 1 && part[0].pos === 'n' && !/^(?:人类|全球|总体|部分|多维|水平|发现|报告|上述)$/u.test(prefix) && masked.split(text).length - 1 >= 3) add(text, 'repeated-label');
      }
      at = masked.indexOf(base, at + base.length);
    }
  }
  const terms: DocumentTerm[] = [];
  for (const [text, evidence] of candidates) {
    const count = masked.split(text).length - 1;
    if (evidence === 'repeated-label' && count < 2) continue;
    const pieces = tokenize(text, 'term').map(t => t.text);
    if (pieces.join('') === text) terms.push({ text, pieces, evidence, count });
  }
  return { terms: terms.sort((a, b) => b.text.length - a.text.length).slice(0, 256), blocks };
}
