import { Segment, useDefault } from 'segmentit';
import { Token } from '../types';

let segmentitInstance: any = null;

function getSegmentit() {
  if (!segmentitInstance) {
    segmentitInstance = useDefault(new Segment());
  }
  return segmentitInstance;
}

// Regex matches citations like (Hendriks et al., 2019) or （Veenman，1984）
// Supports English and Chinese parentheses, and numbers/et al.
const CITATION_REGEX = /([（(][^）)]*(?:et al\.|et al|[\d]{4})[^）)]*[）)])/g;

export function tokenize(sentence: string, sentenceId: string): Token[] {
  const segmentit = getSegmentit();
  const parts = sentence.split(CITATION_REGEX);
  let tokens: Token[] = [];
  let tokenIndex = 0;

  for (const part of parts) {
    if (!part) continue;
    
    if (CITATION_REGEX.test(part)) {
       tokens.push({
         id: `${sentenceId}_${tokenIndex++}`,
         text: part,
         isPunctuation: false,
         isCitation: true,
       });
    } else {
       const result = segmentit.doSegment(part);
       result.forEach((item: any) => {
         let posStr = 'unk';
         
         // Extract core speech types using bitwise masks based on segmentit dictionary specs
         if (item.p !== undefined) {
             const p = item.p;
             if (p & 1048824) posStr = 'n';        // Noun family
             else if (p & 4096) posStr = 'v';      // Verb
             else if (p & 1073741824) posStr = 'a';// Adjective
             else if (p & 65536) posStr = 'r';     // Pronoun
         }

         tokens.push({
           id: `${sentenceId}_${tokenIndex++}`,
           text: item.w,
           isPunctuation: /^[\p{P}\p{S}\s\n]+$/u.test(item.w),
           pos: posStr
         });
       });
    }
  }

  return tokens;
}
