import { cn, cls } from './cn';

/**
 * @deprecated Use `cn` from '@/utils/cn' instead for better Tailwind class merging
 * This function is kept for backward compatibility
 */
export const classNames = (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(' ');

// Re-export cn and cls for convenience
export { cn, cls };

