export interface Token {
  id: string;        // Unique identifier (sentenceID_tokenIndex)
  text: string;      // Token text
  isPunctuation: boolean; // Whether it is pure punctuation
  isCitation?: boolean; // Whether it is an academic citation block
  pos?: string;       // Part of speech (e.g. 'n' for noun, 'v' for verb)
}

export interface Sentence {
  id: string;             // UUID
  index: number;          // Natural index in the full text
  originalText: string;   // Original Chinese sentence
  tokens: Token[];        // Tokenized array
  translatedText: string; // Translation typed by user
  status: 'pending' | 'active' | 'completed'; // Sentence status
  activeTokenIndex: number; // For keeping track of the selected token in focus mode
}

export interface DocumentState {
  documentId: string;
  totalSentences: number;
  completedSentences: number;
  sentences: Sentence[];
  currentActiveIndex: number; // Currently focused sentence index
  lastSavedAt: number;        // Timestamp
}
