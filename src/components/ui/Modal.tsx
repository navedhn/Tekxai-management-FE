import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { classNames } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const sizes: Record<string, string> = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

type Props = {
  title?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  customClass?: string;
  bodyClassName?: string;
};

const Modal: React.FC<Props> = ({
  title,
  isOpen,
  onClose,
  children,
  footer,
  size = 'md',
  customClass,
  bodyClassName,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={classNames(
              'relative bg-white w-full max-h-[min(90vh,900px)] flex flex-col overflow-hidden rounded-[1.5rem] shadow-2xl z-10',
              sizes[size],
              customClass
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {title ? (
              <div className="shrink-0 p-5 border-b border-gray-100 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">{title}</div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 w-8 h-8 flex items-center justify-center border cursor-pointer border-gray-200 rounded-md hover:bg-gray-50 text-gray-500"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            ) : null}
            <div
              className={classNames(
                'flex-1 min-h-0 overflow-y-auto overscroll-contain p-6',
                bodyClassName
              )}
            >
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 p-5 border-t border-gray-100 bg-gray-50 rounded-b-[1.5rem]">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
