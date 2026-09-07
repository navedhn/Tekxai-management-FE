import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { CardSkeleton } from '../skeletons';

interface CardProps {
  className?: string;
  children?: React.ReactNode;
  delay?: number;
  isLoading?: boolean;

  hoverable?: boolean;

  chart?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  delay = 0,
  isLoading = false,
  hoverable = false,
  chart = false,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={cn(
      'bg-(--color-surface) rounded-[12px] border border-(--color-border) p-6 shadow-sm text-(--color-text-primary)',
      chart && 'py-8',
      hoverable && 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
      className
    )}
  >
    {isLoading ? <CardSkeleton className="!p-0 !bg-transparent !border-0 !shadow-none" /> : children}
  </motion.div>
);

export default Card;

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div className={cn('flex items-start justify-between gap-3 mb-4', className)} {...rest}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...rest }) => (
  <h4 className={cn('text-h4 text-(--color-text-primary)', className)} {...rest}>
    {children}
  </h4>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...rest
}) => (
  <p className={cn('text-small text-(--color-text-secondary) mt-1', className)} {...rest}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div className={cn(className)} {...rest}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div className={cn('mt-4 pt-4 border-t border-(--color-border) flex items-center gap-3', className)} {...rest}>
    {children}
  </div>
);
