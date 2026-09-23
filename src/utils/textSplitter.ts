import { pairedSpans } from './pairedSpans';

/** Partition source while keeping matched quotations/brackets intact. */
export function splitTextIntoSentences(rawText: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  const pairs = pairedSpans(rawText);
  for (const match of rawText.matchAll(/[。！？\r\n]+/g)) {
    if (pairs.some(pair => pair.start < match.index! && pair.end > match.index!)) continue;
    const end = match.index! + match[0].length;
    const part = rawText.slice(start, end);
    if (!part.trim() && sentences.length) sentences[sentences.length - 1] += part;
    else if (part.trim()) sentences.push(part);
    else continue; // Leading blank lines belong to the next slice.
    start = end;
  }
  const tail = rawText.slice(start);
  if (tail.trim()) sentences.push(tail);
  else if (tail && sentences.length) sentences[sentences.length - 1] += tail;
  return sentences;
}

