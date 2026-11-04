import { pairedSpans } from './pairedSpans';
import { codeBlocks } from './textStructure';
import { annotationSpans } from './annotations';

/** Partition source while keeping matched quotations/brackets intact. */
export function splitTextIntoSentences(rawText: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  const notes = annotationSpans(rawText);
  let masked = rawText;
  for (const note of [...notes].reverse()) masked = masked.slice(0, note.start) + ' '.repeat(note.end - note.start) + masked.slice(note.end);
  const blocks = codeBlocks(masked);
  for (const block of [...blocks].reverse()) masked = masked.slice(0, block.start) + ' '.repeat(block.end - block.start) + masked.slice(block.end);
  const pairs = [...pairedSpans(masked), ...blocks, ...notes];
  const cuts = new Set<number>(blocks.flatMap(b => [b.start, b.end]));
  // Even an English-period sentence ends its card after a trailing note.
  for (const note of notes) cuts.add(note.end);
  for (const match of rawText.matchAll(/[。！？\r\n]+/g)) {
    if (!pairs.some(pair => pair.start < match.index! && pair.end > match.index!)) cuts.add(match.index! + match[0].length);
  }
  // A trailing annotation belongs to the preceding sentence, including its own punctuation.
  const attachedCuts = [...cuts].map(cut => {
    for (const note of notes) if (note.start >= cut && !rawText.slice(cut, note.start).trim()) cut = note.end;
    return cut;
  });
  for (const end of [...new Set(attachedCuts)].sort((a, b) => a - b)) {
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

