import React from 'react';
import { cn } from '@/utils/cn';

// No on/off switch primitive existed anywhere in this app before this —
// every prior "toggle" was either a native checkbox or a Yes/No pill button
// (see the Access Control page's old ToggleYesNo). Built once, here, so any
// future feature needing a real switch reuses this instead of re-inventing
// a fourth toggle idiom.
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled, size = 'md', label, className }) => {
  const dims = size === 'sm' ? { track: 'w-8 h-4.5', thumb: 'w-3.5 h-3.5', translate: 'translate-x-[14px]' }
    : { track: 'w-10 h-5.5', thumb: 'w-4.5 h-4.5', translate: 'translate-x-[18px]' };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors shrink-0',
        dims.track,
        checked ? 'bg-primary-500' : 'bg-gray-200',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-transform',
          dims.thumb,
          checked ? dims.translate : 'translate-x-0',
        )}
      />
    </button>
  );
};

export default Switch;
