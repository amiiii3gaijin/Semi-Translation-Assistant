import { create } from 'zustand';
import localforage from 'localforage';
import { DocumentState, Sentence } from '../types';
import { splitTextIntoSentences } from '../utils/textSplitter';
import { tokenize } from '../utils/tokenizer';
import { v4 as uuidv4 } from 'uuid';

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
    set({ isImporting: true, importProgress: 0 });
    // 让出主线程，允许 React 渲染 Loading 界面
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const rawSentences = splitTextIntoSentences(rawText);
        const documentId = uuidv4();
        
        const sentences: Sentence[] = rawSentences.map((text, index) => {
          return {
            id: uuidv4(),
            index,
            originalText: text,
            tokens: [], // 先用空数组占位，后续分块处理
            translatedText: '',
            status: index === 0 ? 'active' : 'pending',
            activeTokenIndex: 0,
          };
        });

        // 立即存入基础结构
        set({
          documentId,
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
            
            set((state) => {
                if (state.documentId !== documentId) return state; // 如果中途被取消了

                const newSentences = [...state.sentences];
                for (let j = i; j < i + CHUNK_SIZE && j < newSentences.length; j++) {
                    const s = newSentences[j];
                    const rawTokens = tokenize(s.originalText, s.id);
                    const firstValidTokenIndex = Math.max(0, rawTokens.findIndex(t => !t.isPunctuation));
                    
                    newSentences[j] = {
                        ...s,
                        tokens: rawTokens,
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
        set((state) => {
           if (state.documentId) get().saveToIndexedDB();
           return { isImporting: false, importProgress: 100 };
        });
    }
  },

  updateTranslation: (sentenceId: string, text: string) => {
    set((state) => ({
      sentences: state.sentences.map((s) =>
        s.id === sentenceId ? { ...s, translatedText: text } : s
      ),
    }));
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
    set((state) => {
      const sentence = state.sentences.find(s => s.id === sentenceId);
      if (!sentence) return state;
      
      const newText = sentence.translatedText + tokenText;
      return {
        sentences: state.sentences.map((s) =>
          s.id === sentenceId ? { ...s, translatedText: newText } : s
        ),
      };
    });
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
          const completedCount = sentences.filter(s => s.status === 'completed' || s.translatedText.trim() !== '').length;
          return { sentences, completedSentences: completedCount };
      });
  },

  loadFromIndexedDB: async () => {
    try {
      const storedState = await localforage.getItem<DocumentState>('half-translation-state');
      if (storedState && storedState.documentId) {
        set({ ...storedState });
      }
    } catch (e) {
      console.error('Failed to load from DB', e);
    }
  },

  saveToIndexedDB: async () => {
    try {
      const { importDocument, updateTranslation, nextSentence, prevSentence, insertTokenToTranslation, loadFromIndexedDB, saveToIndexedDB, setActiveTokenIndex, markCurrentSentenceCompleted, clearDocument, setOriginalFontSize, setTranslationFontSize, ...stateToSave } = get();
      
      const stateWithTime = { ...stateToSave, lastSavedAt: Date.now() };
      stateWithTime.completedSentences = stateWithTime.sentences.filter(s => s.status === 'completed' || s.translatedText.trim() !== '').length;

      await localforage.setItem('half-translation-state', stateWithTime);
      set({ lastSavedAt: stateWithTime.lastSavedAt, completedSentences: stateWithTime.completedSentences });
    } catch (e) {
      console.error('Failed to save to DB', e);
    }
  },

  clearDocument: async () => {
      try {
          await localforage.clear();
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
