import { pairedSpans } from './pairedSpans';
import { codeBlocks } from './textStructure';

/** Partition source while keeping matched quotations/brackets intact. */
export function splitTextIntoSentences(rawText: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  const blocks = codeBlocks(rawText);
  let masked = rawText;
  for (const block of [...blocks].reverse()) masked = masked.slice(0, block.start) + ' '.repeat(block.end - block.start) + masked.slice(block.end);
  const pairs = [...pairedSpans(masked), ...blocks];
  const cuts = new Set<number>(blocks.flatMap(b => [b.start, b.end]));
  for (const match of rawText.matchAll(/[。！？\r\n]+/g)) {
    if (!pairs.some(pair => pair.start < match.index! && pair.end > match.index!)) cuts.add(match.index! + match[0].length);
  }
  for (const end of [...cuts].sort((a, b) => a - b)) {
    if (end <= start) continue;
    const part = rawText.slice(start, end);
    if (!part.trim() && sentences.length) sentences[sentences.length - 1] += part;
    else if (part.trim()) sentences.push(part);
    else continue; // Leading blank lines belong to the next slice.
    start = end;
  }
  const tail = rawText.slice(start);
  if (tail.trim()) sentences.push(tail);
  else if (tail && sentences.length) sentences[sentences.length - 1] += tail;
  else if (tail) sentences.push(tail);
  return sentences;
}

