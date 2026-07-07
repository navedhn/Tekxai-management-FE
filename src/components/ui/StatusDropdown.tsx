import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface StatusOption {
  label: string;
  value: string;
  colorClassName: string; // e.g. 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
}

interface StatusDropdownProps {
  value: string;
  options: StatusOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ value, options, onChange, disabled, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (disabled) {
    return (
      <span className={cn('inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border', selected.colorClassName, className)}>
        {selected.label}
      </span>
    );
  }

  return (
    <div className={cn('relative inline-block', className)} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border cursor-pointer transition-opacity hover:opacity-80',
          selected.colorClassName
        )}
      >
        {selected.label}
        <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 min-w-[160px] bg-white border border-gray-100 rounded-xl shadow-xl z-[90] overflow-hidden">
          <ul className="p-1.5 flex flex-col gap-1">
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => { onChange?.(option.value); setIsOpen(false); }}
                className="px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <span className={cn('inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border w-full', option.colorClassName)}>
                  {option.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StatusDropdown;
