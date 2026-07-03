import React from 'react';
import { cn, classVariants, type VariantProps } from '@/utils/cn';

const badgeVariants = classVariants(
  'inline-flex items-center font-bold rounded-[4px] border-none',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800',
        warning: 'bg-yellow-100 text-yellow-800',
        info: 'bg-blue-100 text-blue-800'
      },
      size: {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-1.5 py-0.5 text-xs',
        lg: 'px-1.5 py-0.5 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
);


type BadgeProps = {
  children: React.ReactNode;
  className?: string;
} & VariantProps<typeof badgeVariants>;

const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  size,
  className
}) => {
  return (
    <h4 className={cn(badgeVariants({ variant, size }), className)}>
      {children}
    </h4>
  );
};

export default Badge;

