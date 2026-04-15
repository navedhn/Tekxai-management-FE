import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon: LeftIcon, rightIcon: RightIcon, containerClassName, type, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-gray-700 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {LeftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
              <LeftIcon size={18} />
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-11 w-full rounded-[8px] border border-gray-200 bg-white px-5 py-2 text-[14px] file:border-0 file:bg-transparent file:text-sm file:font-medium text-gray-700 placeholder:text-gray-400 focus-visible:outline-none focus:border-primary-500 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-gray-300 hover:shadow-sm focus:shadow-[0_0_0_4px_rgba(0,92,218,0.15)]',
              LeftIcon && 'pl-11',
              RightIcon && 'pr-11',
              error ? 'border-red-500 focus-visible:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]' : '',
              className
            )}
            ref={ref}
            {...props}
          />
          {RightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
              <RightIcon size={18} />
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 ml-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
