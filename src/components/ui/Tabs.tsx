import React from 'react';
import { cn } from '@/utils/cn';

export interface TabOption {
  label: string;
  value: string;
  count?: number;
}

interface TabsProps {
  options: TabOption[] | string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  tabClassName?: string;
  variant?: 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
}

const Tabs: React.FC<TabsProps> = ({
  options,
  value,
  onChange,
  className,
  tabClassName,
  variant = 'pills',
  size = 'md',
}) => {
  const normalizedOptions: TabOption[] = options.map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const containerStyles = {
    pills: 'bg-white p-1 rounded-2xl border border-gray-100/50 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-max',
    underline: 'flex items-center gap-8 border-b border-gray-200 overflow-x-auto no-scrollbar max-w-full',
  };

  const buttonStyles = {
    pills: (isActive: boolean) =>
      cn(
        'whitespace-nowrap rounded-xl transition-all duration-300 flex items-center gap-2 font-black tracking-tight',
        size === 'sm' ? 'px-4 py-1.5 text-xs' : 'px-6 py-2.5 text-sm',
        isActive
          ? 'bg-gradient-to-b from-[#005CDA] to-[#001F4A] text-white shadow-lg shadow-primary-200 scale-[1.02]'
          : 'text-gray-400 hover:text-blue-900 hover:bg-blue-50'
      ),
    underline: (isActive: boolean) =>
      cn(
        'whitespace-nowrap pb-4 border-b-2 transition-all duration-300 font-black relative top-[1px]',
        size === 'sm' ? 'text-xs' : 'text-sm',
        isActive
          ? 'border-primary-500 text-primary-500'
          : 'border-transparent text-gray-400 hover:text-gray-600'
      ),
  };

  return (
    <div className={cn(containerStyles[variant], className)}>
      {normalizedOptions.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(buttonStyles[variant](isActive), tabClassName)}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md font-bold',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
