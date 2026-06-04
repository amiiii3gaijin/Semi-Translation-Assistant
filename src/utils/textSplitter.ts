export function splitTextIntoSentences(rawText: string): string[] {
  // Split using regex matching Chinese sentence-ending punctuations and newlines, preserving the punctuation.
  const parts = rawText.split(/([。！？\n]+)/g);
  const sentences: string[] = [];
  
  let currentSentence = '';
  for (const part of parts) {
    if (/[。！？\n]+/.test(part)) {
      currentSentence += part;
      const trimmed = currentSentence.trim();
      if (trimmed) {
        sentences.push(trimmed);
      }
      currentSentence = '';
    } else {
      currentSentence += part;
    }
  }
  
  if (currentSentence.trim()) {
    sentences.push(currentSentence.trim());
  }
  
  return sentences;
}
