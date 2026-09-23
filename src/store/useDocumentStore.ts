import { create } from 'zustand';
import localforage from 'localforage';
import { DocumentState, Sentence } from '../types';
import { splitTextIntoSentences } from '../utils/textSplitter';
import { PARSER_VERSION, tokenize } from '../utils/tokenizer';
import { buildTokenGroups } from '../utils/tokenGroups';
import { v4 as uuidv4 } from 'uuid';
import { isNavigableToken } from '../utils/tokenNavigation';

export interface DocumentStore extends DocumentState {
  isImporting: boolean;
  importProgress: number;
  originalFontSize: number;
  translationFontSize: number;
  setOriginalFontSize: (size: number) => void;
  setTranslationFontSize: (size: number) => void;
  importDocument: (rawText: string) => Promise<void>;
  updateTranslation: (sentenceId: string, text: string) => void;
  nextSentence: () => void;
  prevSentence: () => void;
  insertTokenToTranslation: (sentenceId: string, tokenText: string) => void;
  loadFromIndexedDB: () => Promise<void>;
  saveToIndexedDB: () => Promise<void>;
  setActiveTokenIndex: (sentenceId: string, tokenIndex: number) => void;
  markCurrentSentenceCompleted: () => void;
  clearDocument: () => Promise<void>;
}

const initialState: DocumentState = {
  rawText: '',
  documentId: '',
  totalSentences: 0,
  completedSentences: 0,
  sentences: [],
  currentActiveIndex: 0,
  lastSavedAt: 0,
};

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  ...initialState,
  isImporting: false,
  importProgress: 0,
  originalFontSize: 25,
  translationFontSize: 25,

  setOriginalFontSize: (size: number) => set({ originalFontSize: Math.max(12, Math.min(60, size)) }),
  setTranslationFontSize: (size: number) => set({ translationFontSize: Math.max(12, Math.min(60, size)) }),

  importDocument: async (rawText: string) => {
    const documentId = uuidv4();
    set({ isImporting: true, importProgress: 0 });
    // 让出主线程，允许 React 渲染 Loading 界面
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const rawSentences = splitTextIntoSentences(rawText);
        
        const sentences: Sentence[] = rawSentences.map((text, index) => {
          return {
            id: uuidv4(),
            index,
            originalText: text,
            tokens: [], // 先用空数组占位，后续分块处理
            groups: [],
            parserVersion: PARSER_VERSION,
            translatedText: '',
            status: index === 0 ? 'active' : 'pending',
            activeTokenIndex: 0,
          };
        });

        // 立即存入基础结构
        set({
          documentId,
          rawText,
          sentences,
          totalSentences: sentences.length,
          completedSentences: 0,
          currentActiveIndex: 0,
          lastSavedAt: Date.now(),
        });

        // 分块异步处理分词，防止庞大文本卡死主线程
        const CHUNK_SIZE = 15;
        for (let i = 0; i < sentences.length; i += CHUNK_SIZE) {
            await new Promise(r => setTimeout(r, 0));
            if (get().documentId !== documentId) return;
            
            set((state) => {
                if (state.documentId !== documentId) return state; // 如果中途被取消了

                const newSentences = [...state.sentences];
                for (let j = i; j < i + CHUNK_SIZE && j < newSentences.length; j++) {
                    const s = newSentences[j];
                    const rawTokens = tokenize(s.originalText, s.id);
                    const firstValidTokenIndex = Math.max(0, rawTokens.findIndex(isNavigableToken));
                    
                    newSentences[j] = {
                        ...s,
                        tokens: rawTokens,
                        groups: buildTokenGroups(s.originalText, rawTokens),
                        activeTokenIndex: firstValidTokenIndex,
                    };
                }
                const progress = Math.floor((Math.min(i + CHUNK_SIZE, sentences.length) / sentences.length) * 100);
                return { sentences: newSentences, importProgress: progress };
            });
        }
    } catch (e) {
        console.error("Import processing error", e);
    } finally {
        if (get().documentId === documentId) {
          set({ isImporting: false, importProgress: 100 });
          await get().saveToIndexedDB();
        }
    }
  },

  updateTranslation: (sentenceId: string, text: string) => {
    set((state) => {
      const previous = state.sentences.find(s => s.id === sentenceId);
      if (!previous || previous.translatedText === text) return state;
      const delta = Number(!!text.trim()) - Number(!!previous.translatedText.trim());
      return {
        sentences: state.sentences.map((s, i) => s.id === sentenceId
          ? { ...s, translatedText: text, status: i === state.currentActiveIndex ? 'active' as const : text.trim() ? 'completed' as const : 'pending' as const } : s),
        completedSentences: state.completedSentences + delta,
      };
    });
  },

  setActiveTokenIndex: (sentenceId: string, tokenIndex: number) => {
    set((state) => ({
      sentences: state.sentences.map((s) => {
        if (s.id === sentenceId) {
          return { ...s, activeTokenIndex: tokenIndex };
        }
        return s;
      }),
    }));
  },

  insertTokenToTranslation: (sentenceId: string, tokenText: string) => {
    const sentence = get().sentences.find(s => s.id === sentenceId);
    if (sentence) get().updateTranslation(sentenceId, sentence.translatedText + tokenText);
  },

  nextSentence: () => {
    set((state) => {
      const nextIndex = Math.min(state.currentActiveIndex + 1, state.sentences.length - 1);
      if (nextIndex === state.currentActiveIndex) return state;
      
      return {
        currentActiveIndex: nextIndex,
        sentences: state.sentences.map((s, i) => ({
          ...s,
          status: i === nextIndex ? 'active' : (s.translatedText.trim() ? 'completed' : 'pending')
        }))
      };
    });
    get().saveToIndexedDB(); 
  },

  prevSentence: () => {
    set((state) => {
      const prevIndex = Math.max(state.currentActiveIndex - 1, 0);
      if (prevIndex === state.currentActiveIndex) return state;
      
      return {
        currentActiveIndex: prevIndex,
        sentences: state.sentences.map((s, i) => ({
          ...s,
          status: i === prevIndex ? 'active' : s.status
        }))
      };
    });
    get().saveToIndexedDB();
  },
  
  markCurrentSentenceCompleted: () => {
      set((state) => {
          const sentences = [...state.sentences];
          const curr = sentences[state.currentActiveIndex];
          if(curr && curr.translatedText.trim()){
              sentences[state.currentActiveIndex] = {...curr, status: 'completed'};
          }
          const completedCount = sentences.filter(s => s.translatedText.trim() !== '').length;
          return { sentences, completedSentences: completedCount };
      });
  },

  loadFromIndexedDB: async () => {
    try {
      const storedState = await localforage.getItem<DocumentState>('half-translation-state');
      if (storedState && storedState.documentId) {
        const needsMigration = storedState.sentences.some(s => s.parserVersion !== PARSER_VERSION || !s.groups || !s.tokens.length);
        if (needsMigration) {
          // Keep the old document intact before rebuilding source-only metadata.
          const backupKey = `half-translation-before-parser-v${PARSER_VERSION}-${storedState.documentId}`;
          if (!(await localforage.getItem(backupKey))) await localforage.setItem(backupKey, storedState);
        }
        const restored = [] as Sentence[];
        for (let i = 0; i < storedState.sentences.length; i++) {
          const s = storedState.sentences[i];
          if (s.parserVersion === PARSER_VERSION && s.groups && s.tokens.length) { restored.push(s); continue; }
          const oldToken = s.tokens[s.activeTokenIndex];
          const oldOffset = oldToken?.start ?? s.tokens.slice(0, s.activeTokenIndex).reduce((n, t) => n + t.text.length, 0);
          const tokens = tokenize(s.originalText, s.id);
          const at = tokens.findIndex(t => isNavigableToken(t) && t.end > oldOffset);
          restored.push({ ...s, tokens, groups: buildTokenGroups(s.originalText, tokens),
            parserVersion: PARSER_VERSION, activeTokenIndex: Math.max(0, at) });
          if (i % 15 === 14) await new Promise(resolve => setTimeout(resolve, 0));
        }
        set({ ...storedState, sentences: restored,
          completedSentences: restored.filter(s => s.translatedText.trim() !== '').length,
          rawText: storedState.rawText ?? restored.map(s => s.originalText).join(''),
          isImporting: false, importProgress: 100 });
      }
    } catch (e) {
      console.error('Failed to load from DB', e);
    }
  },

  saveToIndexedDB: async () => {
    try {
      const { importDocument, updateTranslation, nextSentence, prevSentence, insertTokenToTranslation, loadFromIndexedDB, saveToIndexedDB, setActiveTokenIndex, markCurrentSentenceCompleted, clearDocument, setOriginalFontSize, setTranslationFontSize, ...stateToSave } = get();
      
      const stateWithTime = { ...stateToSave, lastSavedAt: Date.now() };
      stateWithTime.completedSentences = stateWithTime.sentences.filter(s => s.translatedText.trim() !== '').length;

      await localforage.setItem('half-translation-state', stateWithTime);
      if (get().documentId === stateWithTime.documentId) set({ lastSavedAt: stateWithTime.lastSavedAt });
    } catch (e) {
      console.error('Failed to save to DB', e);
    }
  },

  clearDocument: async () => {
      try {
          await localforage.removeItem('half-translation-state');
      } catch (err) {
          console.error("Failed to clear local DB", err);
      }
      set({
          ...initialState, 
          isImporting: false, 
          importProgress: 0,
      });
  }
}));
