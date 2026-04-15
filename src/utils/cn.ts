import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { type VariantProps, cva } from 'class-variance-authority';

/**
 * cn - Class Name utility
 * 
 * Combines clsx and tailwind-merge to intelligently merge Tailwind CSS classes.
 * Handles conditional classes, conflicts, and ensures proper class merging.
 * 
 * @example
 * cn('px-2 py-1', isActive && 'bg-blue-500', 'text-white')
 * cn('px-2', 'px-4') // Results in 'px-4' (last one wins for conflicting classes)
 */
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * cls - Class utility (alias for clsx)
 * 
 * Simple class name utility for conditional classes without Tailwind merging.
 * Use this when you don't need Tailwind class conflict resolution.
 * 
 * @example
 * cls('base-class', condition && 'active-class')
 */
export const cls = (...inputs: ClassValue[]) => {
  return clsx(inputs);
};

/**
 * classVariants - Class Variance Authority
 * 
 * Creates a function that returns class names based on variants.
 * Perfect for component variants (size, color, variant, etc.)
 * 
 * @example
 * const buttonVariants = classVariants({
 *   base: 'px-4 py-2 rounded',
 *   variants: {
 *     variant: {
 *       primary: 'bg-blue-500 text-white',
 *       secondary: 'bg-gray-200 text-gray-900'
 *     },
 *     size: {
 *       sm: 'text-sm',
 *       md: 'text-base',
 *       lg: 'text-lg'
 *     }
 *   },
 *   defaultVariants: {
 *     variant: 'primary',
 *     size: 'md'
 *   }
 * });
 * 
 * // Usage:
 * buttonVariants({ variant: 'primary', size: 'lg' })
 * buttonVariants({ variant: 'secondary' }) // uses default size: 'md'
 */
export const classVariants = cva;

/**
 * Export VariantProps type for TypeScript
 */
export type { VariantProps };

