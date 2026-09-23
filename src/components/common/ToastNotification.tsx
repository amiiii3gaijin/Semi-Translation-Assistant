import { useUIStore } from '../../store/useUIStore';
import { clsx } from 'clsx';

export function ToastNotification() {
  const { isToastVisible, toastMessage } = useUIStore();
  return <div className={clsx('ui-toast', { 'ui-toast--visible': isToastVisible })}
    role="status" aria-live="polite" aria-atomic="true" aria-hidden={!isToastVisible}>
    {toastMessage}
  </div>;
}

