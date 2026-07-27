import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { CardSkeleton } from '../skeletons';

// Design System Phase 9: canonical Card foundation. Existing Card usages are
// unaffected (defaults are unchanged); new call sites can opt into the
// CardHeader/CardTitle/CardContent/CardFooter sub-parts and the `hoverable`
// lift treatment below. Chart-heavy cards can pass `chart` for extra breathing
// room instead of inventing one-off padding.

interface CardProps {
  className?: string;
  children?: React.ReactNode;
  delay?: number;
  isLoading?: boolean;
  /** Adds a subtle hover lift + shadow increase, consistent with Button/sidebar hover treatment. */
  hoverable?: boolean;
  /** Extra vertical padding, for cards that wrap a chart. */
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
      'bg-(--color-surface) rounded-[12px] border border-(--color-border) p-6 shadow-sm',
      chart && 'py-8',
      hoverable && 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
      className
    )}
  >
    {isLoading ? <CardSkeleton className="!p-0 !bg-transparent !border-0 !shadow-none" /> : children}
  </motion.div>
);

export default Card;

/** Card header row — title/description on the left, optional actions/icon on the right. */
export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div className={cn('flex items-start justify-between gap-3 mb-4', className)} {...rest}>
    {children}
  </div>
);

/** Card title — uses the Phase 4 --text-h4 token, matching Typography's Heading level={4}. */
export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...rest }) => (
  <h4 className={cn('text-h4 text-(--color-text-primary)', className)} {...rest}>
    {children}
  </h4>
);

/** Optional supporting copy under CardTitle. */
export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...rest
}) => (
  <p className={cn('text-small text-(--color-text-secondary) mt-1', className)} {...rest}>
    {children}
  </p>
);

/** Card body — no default padding of its own since Card already provides p-6. */
export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div className={cn(className)} {...rest}>
    {children}
  </div>
);

/** Card footer — top border, spacing to match Modal footer conventions. */
export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div className={cn('mt-4 pt-4 border-t border-(--color-border) flex items-center gap-3', className)} {...rest}>
    {children}
  </div>
);
