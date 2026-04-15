import React from 'react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from './ToastContainer';

type Props = {
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  darkMode?: boolean;
};

export const ToastContext = React.createContext<ReturnType<typeof useToast> | null>(null);

export const ToastProvider: React.FC<Props> = ({
  children,
  position = 'top-right',

}) => {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer
        toasts={toast.toasts}
        onClose={toast.removeToast}
        position={position}

      />
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
};

