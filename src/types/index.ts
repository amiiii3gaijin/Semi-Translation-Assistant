export interface Token {
  start: number; // UTF-16 offsets into originalText; end is exclusive.
  end: number;
  isWhitespace?: boolean;
  isMarkup?: boolean;
  isVerbatim?: boolean;
  rawPos?: number;
  id: string;        // Unique identifier (sentenceID_tokenIndex)
  text: string;      // Token text
  isPunctuation: boolean; // Whether it is pure punctuation
  isCitation?: boolean; // Whether it is an academic citation block
  pos?: string;       // Part of speech (e.g. 'n' for noun, 'v' for verb)
}

export interface TokenGroup {
  source?: 'local' | 'llm-term' | 'llm-suggestion' | 'llm-local' | 'short-clause';
  id: string;
  startIndex: number;
  endIndex: number;
  label: string;
  kind: 'term' | 'citation' | 'expression' | 'phrase' | 'quoted' | 'bracket';
  autoSelect?: boolean; // Long paired passages require explicit expansion.
}

export interface Sentence {
  excludedGroupRanges?: { start: number; end: number }[];
  groupDecisions?: { text: string; source: string; outcome: string }[];
  segmentationSource?: 'llm'; // Retain reviewed boundaries across local parser upgrades.
  id: string;             // UUID
  index: number;          // Natural index in the full text
  originalText: string;   // Original Chinese sentence
  tokens: Token[];        // Tokenized array
  groups: TokenGroup[];
  candidateGroups?: TokenGroup[]; // Nested alternatives, expanded with 7.
  consistencyTerms?: (TokenGroup & { count: number })[]; // Verified repeated terms; never affect selection.
  pairedGroups?: TokenGroup[]; // Structural ranges, independent of visible term markers.
  parserVersion: number;
  translatedText: string; // Translation typed by user
  status: 'pending' | 'active' | 'completed'; // Sentence status
  activeTokenIndex: number; // For keeping track of the selected token in focus mode
}

export interface DocumentState {
  rawText?: string;
  documentId: string;
  totalSentences: number;
  completedSentences: number;
  sentences: Sentence[];
  currentActiveIndex: number; // Currently focused sentence index
  lastSavedAt: number;        // Timestamp
}
