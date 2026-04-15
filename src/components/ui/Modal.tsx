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
};

const Modal: React.FC<Props> = ({ title, isOpen, onClose, children, footer, size = 'md', customClass }) => {
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
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
            className={classNames('relative bg-white w-full max-h-[90vh] overflow-y-auto rounded-[1.5rem] shadow-2xl z-10', sizes[size], customClass)}
          >
            {title ? (
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                <X onClick={onClose} className='w-8 h-8 border cursor-pointer border-gray-200 rounded-md p-1 hover:bg-gray-50' />
              </div>
            ) : null}
            <div className="p-6">{children}</div>
            {footer ? <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-[1.5rem]">{footer}</div> : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;


