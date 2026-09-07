import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { type VariantProps, cva } from 'class-variance-authority';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const cls = (...inputs: ClassValue[]) => {
  return clsx(inputs);
};

export const classVariants = cva;

export type { VariantProps };
