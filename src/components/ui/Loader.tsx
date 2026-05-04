import React from 'react';
import { cn } from '@/utils/cn';
import { texailogo } from '@/assets/icons';
import { motion } from 'framer-motion';

interface LoaderProps {
  size?: number;
  className?: string;
  containerClassName?: string;
  fullPage?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
  size = 64,
  className,
  containerClassName,
  fullPage = true
}) => {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-6', containerClassName)}>
      <div className="relative flex items-center justify-center">
        {/* Animated Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute border-4 border-transparent border-t-[#005CDA] border-r-[#001F4A] rounded-full"
          style={{ width: size + 20, height: size + 20 }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute border-2 border-transparent border-b-[#005CDA] border-l-[#001F4A] rounded-full opacity-40"
          style={{ width: size + 40, height: size + 40 }}
        />

        {/* Logo Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex items-center justify-center bg-white rounded-full p-2 shadow-xl"
        >
          <img src={texailogo} alt="logo" className="w-16 h-16 object-contain" />
        </motion.div>
      </div>


    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent" />
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;

