import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { ToastVariant, ToastPosition } from '@/types';

type ToastProps = {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose: (id: string) => void;
  position?: ToastPosition;
};

const variantConfig: Record<ToastVariant, { 
    bg: string; 
    icon: React.ReactNode; 
    accent: string; 
    textColor: string;
    iconColor: string;
    progressBg: string;
}> = {
  success: {
    bg: 'bg-white/80 backdrop-blur-md',
    accent: 'bg-emerald-500',
    icon: <CheckCircle2 size={18} />,
    iconColor: 'text-emerald-500',
    textColor: 'text-gray-900',
    progressBg: 'bg-emerald-500/30'
  },
  error: {
    bg: 'bg-white/80 backdrop-blur-md',
    accent: 'bg-red-500',
    icon: <AlertCircle size={18} />,
    iconColor: 'text-red-500',
    textColor: 'text-gray-900',
    progressBg: 'bg-red-500/30'
  },
  info: {
    bg: 'bg-white/80 backdrop-blur-md',
    accent: 'bg-[#005CDA]',
    icon: <Info size={18} />,
    iconColor: 'text-[#005CDA]',
    textColor: 'text-gray-900',
    progressBg: 'bg-[#005CDA]/30'
  },
  warning: {
    bg: 'bg-white/80 backdrop-blur-md',
    accent: 'bg-amber-500',
    icon: <AlertTriangle size={18} />,
    iconColor: 'text-amber-500',
    textColor: 'text-gray-900',
    progressBg: 'bg-amber-500/30'
  }
};

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  variant = 'info',
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const config = variantConfig[variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      className={cn(
        "group relative flex items-center gap-4 p-4 pr-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/40 overflow-hidden min-w-[320px] max-w-md",
        config.bg
      )}
    >
      {/* Left Accent Bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", config.accent)} />

      {/* Icon Wrapper */}
      <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50/50 shrink-0", config.iconColor)}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5">
        <p className={cn("text-[14px] font-bold tracking-tight leading-tight", config.textColor)}>
          {variant.charAt(0).toUpperCase() + variant.slice(1)}
        </p>
        <p className="text-[13px] font-medium text-gray-500 leading-normal">
          {message}
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={() => onClose(id)}
        className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
      >
        <X size={16} strokeWidth={2.5} />
      </button>

      {/* Progress Bar Container */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden bg-gray-50/30">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            className={cn("h-full", config.accent)}
          />
        </div>
      )}
    </motion.div>
  );
};

export default Toast;
