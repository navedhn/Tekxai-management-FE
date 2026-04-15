import { useState, useCallback } from 'react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
};

type ToastOptions = {
  variant?: ToastVariant;
  duration?: number;
};

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastItem = {
      id,
      message,
      variant: options.variant || 'info',
      duration: options.duration ?? 3000
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast(message, { variant: 'success', duration });
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast(message, { variant: 'error', duration });
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast(message, { variant: 'info', duration });
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, { variant: 'warning', duration });
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    success,
    error,
    info,
    warning,
    removeToast
  };
};
