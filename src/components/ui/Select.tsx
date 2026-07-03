import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  containerClassName?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  containerClassName,
  value,
  onChange,
  placeholder = 'Select an option',
  className,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Controlled vs Uncontrolled fallback
  const [internalValue, setInternalValue] = useState<string | number | undefined>(options[0]?.value);
  
  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find(opt => opt.value === currentValue);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string | number) => {
    setInternalValue(val);
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={cn('flex flex-col gap-1.5 w-full relative', containerClassName)} ref={wrapperRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700 ml-1">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all',
          disabled ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-100' : 'cursor-pointer',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon}
          <span className={!selectedOption ? 'text-gray-400' : 'text-gray-900 font-bold'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <div className={cn("text-gray-400 transition-transform duration-300", isOpen && "text-primary-500")}>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-[90] overflow-hidden animate-in fade-in duration-200">
          <ul className="max-h-60 overflow-auto p-2 flex flex-col gap-1 no-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === currentValue;
              return (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 font-bold text-sm select-none',
                    isSelected 
                      ? 'bg-gradient-to-b from-[#005CDA] to-[#001F4A] text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {option.icon && (
                       <span className={cn(isSelected ? 'text-white' : 'text-gray-400')}>
                         {option.icon}
                       </span>
                    )}
                    <span>{option.label}</span>
                  </div>
                  {isSelected && <Check size={16} strokeWidth={3} className="text-white" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 ml-1">{error}</p>
      )}
    </div>
  );
};

export default Select;
