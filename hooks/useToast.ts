import { useState, useCallback } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastId, setToastId] = useState(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = toastId + 1;
    setToastId(id);
    setToast({ message, type, id });

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 5000);
  }, [toastId]);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}