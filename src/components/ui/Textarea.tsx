import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-gray-700 ml-1 uppercase tracking-widest text-[10px] font-black">
            {label}
          </label>
        )}
        <div className="relative group">
          <textarea
            className={cn(
              'min-h-[100px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] font-medium text-gray-700 placeholder:text-gray-400 focus-visible:outline-none focus:border-primary-500 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-gray-300 hover:shadow-sm focus:shadow-[0_0_0_4px_rgba(0,92,218,0.15)] resize-none',
              error ? 'border-red-500 focus-visible:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]' : '',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 ml-1">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
