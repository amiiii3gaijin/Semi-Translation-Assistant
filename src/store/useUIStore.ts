import { create } from 'zustand';

interface UIStore {
  isToastVisible: boolean;
  toastMessage: string;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isToastVisible: false,
  toastMessage: '',
  showToast: (message: string) => {
    set({ isToastVisible: true, toastMessage: message });
    setTimeout(() => {
      set({ isToastVisible: false, toastMessage: '' });
    }, 5000);
  },
  hideToast: () => set({ isToastVisible: false, toastMessage: '' }),
}));
