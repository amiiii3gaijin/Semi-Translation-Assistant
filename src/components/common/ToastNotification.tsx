import { useUIStore } from '../../store/useUIStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function ToastNotification() {
  const { isToastVisible, toastMessage } = useUIStore();

  return (
    <div
      className={twMerge(
        clsx(
          "fixed bottom-6 right-6 px-4 py-3 bg-gray-800 text-white text-sm rounded-lg shadow-xl transition-all duration-300 transform pointer-events-none z-50",
          isToastVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )
      )}
    >
      {toastMessage}
    </div>
  );
}
