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
    bg: 'bg-(--color-success-bg)',
    icon: <CheckCircle2 className="text-(--color-success)" size={20} />,
    border: 'border-(--color-success-border)',
  },
  error: {
    bg: 'bg-(--color-danger-bg)',
    icon: <AlertCircle className="text-(--color-danger)" size={20} />,
    border: 'border-(--color-danger-border)',
  },
  info: {
    bg: 'bg-(--color-info-bg)',
    icon: <Info className="text-(--color-info)" size={20} />,
    border: 'border-(--color-info-border)',
  },
  warning: {
    bg: 'bg-(--color-warning-bg)',
    icon: <AlertTriangle className="text-(--color-warning)" size={20} />,
    border: 'border-(--color-warning-border)',
  },
};

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  variant = 'info',
  duration = 3000,
  onClose,
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
      )}
      role="alert"
    >
      <div className="shrink-0">{styles.icon}</div>
      <p className="flex-1 text-sm font-medium text-(--color-text-primary)">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="shrink-0 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Toast;
