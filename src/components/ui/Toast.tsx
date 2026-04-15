import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { X, AlertCircle, Send } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-4 w-[380px] max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: (
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#E5FDF4] text-[#00A36C]">
        <AlertCircle size={18} strokeWidth={2.5} />
      </div>
    ),
    error: (
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#FFF0F0] text-[#E03131]">
        <AlertCircle size={18} strokeWidth={2.5} />
      </div>
    ),
    warning: (
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#FFF4E5] text-[#F79009]">
        <AlertCircle size={18} strokeWidth={2.5} />
      </div>
    ),
    info: (
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#E5F2FF] text-[#005CDA]">
        <AlertCircle size={18} strokeWidth={2.5} />
      </div>
    ),
  };

  const leftBorderColors: Record<ToastType, string> = {
    success: 'border-l-[#00A36C]',
    error: 'border-l-[#E03131]',
    info: 'border-l-[#005CDA]',
    warning: 'border-l-[#F79009]',
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-5 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] animate-slide-in transition-all bg-[#FCFDFE] border border-gray-100 border-l-[6px]',
        leftBorderColors[toast.type]
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#005CDA]">
          <Send size={18} strokeWidth={2} />
          <span className="font-extrabold text-[15px] tracking-tight">Task Management</span>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-gray-900 transition-colors p-1 hover:bg-gray-100 rounded-md"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Body Row */}
      <div className="flex items-center gap-3">
        {icons[toast.type]}
        <p className="flex-1 text-[14.5px] font-medium text-gray-600 tracking-tight leading-snug">{toast.message}</p>
      </div>
    </div>
  );
};
