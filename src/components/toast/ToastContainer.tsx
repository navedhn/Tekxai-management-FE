import React from 'react';
import Toast from './Toast';
import { classNames } from '@/utils/helpers';
import { AnimatePresence } from 'framer-motion';
import { ToastItem, ToastPosition } from '@/types';

type Props = {
  toasts: ToastItem[];
  onClose: (id: string) => void;
  position?: ToastPosition;
};

const positionClasses: Record<NonNullable<Props['position']>, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
};

const ToastContainer: React.FC<Props> = ({
  toasts,
  onClose,
  position = 'top-right'
}) => {
  return (
    <div
      className={classNames(
        'fixed z-[200] flex flex-col gap-3',
        positionClasses[position]
      )}
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            variant={toast.variant}
            duration={toast.duration}
            onClose={onClose}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;

