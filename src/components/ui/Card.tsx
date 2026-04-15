import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

const Card: React.FC<{ className?: string, children?: React.ReactNode, delay?: number }> = ({ children, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn('bg-white rounded-[12px]  border border-[#2525250D] p-6 ', className)}
  >
    {children}
  </motion.div>
);

export default Card;

