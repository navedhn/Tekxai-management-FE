import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { CardSkeleton } from '../skeletons';

interface CardProps {
  className?: string;
  children?: React.ReactNode;
  delay?: number;
  isLoading?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className, delay = 0, isLoading = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={cn('bg-white rounded-[12px] border border-[#2525250D] p-6 shadow-sm', className)}
  >
    {isLoading ? <CardSkeleton className="!p-0 !bg-transparent !border-0 !shadow-none" /> : children}
  </motion.div>
);

export default Card;
