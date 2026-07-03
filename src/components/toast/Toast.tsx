import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { classNames } from '@/utils/helpers';
import { ToastVariant, ToastPosition } from '@/types';

type ToastProps = {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose: (id: string) => void;
  position?: ToastPosition;
  darkMode?: boolean;
};

const variantStyles: Record<ToastVariant, { bg: string; icon: React.ReactNode; border: string }> = {
  success: {
    bg: 'bg-green-100 ',
    icon: <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />,
    border: 'border-green-200 ',
  },
  error: {
    bg: 'bg-red-100 ',
    icon: <AlertCircle className="text-red-600 dark:text-red-400" size={20} />,
    border: 'border-red-200 ',
  },
  info: {
    bg: 'bg-blue-50 ',
    icon: <Info className="text-blue-600 dark:text-blue-400" size={20} />,
    border: 'border-blue-200 ',
  },
  warning: {
    bg: 'bg-yellow-50 ',
    icon: <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />,
    border: 'border-yellow-200 ',
  }
};

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  variant = 'info',
  duration = 3000,
  onClose,
  position = 'top-right',
  darkMode = false
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const styles = variantStyles[variant];

  return (
    <div
      className={classNames(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-sm animate-slide-in',
        styles.bg,
        styles.border,
        darkMode && 'dark'
      )}
      role="alert"
    >
      <div className="shrink-0">{styles.icon}</div>
      <p className="flex-1 text-sm font-medium text-gray-700">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Toast;

