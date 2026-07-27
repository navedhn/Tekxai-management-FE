import React, { forwardRef, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';

/**
 * Phase 7 (Inputs): currency-style text input — prefixed symbol +
 * thousands-separator formatting on top of a plain numeric value.
 * Shares the same height/radius/border/focus/error/disabled tokens as
 * Input.tsx. The underlying value handed to `onValueChange` is always
 * a plain number (or empty string while the field is being edited),
 * never the formatted display string.
 */
export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  containerClassName?: string;
  /** Currency symbol or code shown as a fixed prefix, e.g. "$" or "USD". */
  currencySymbol?: string;
  /** Raw numeric value (unformatted). */
  value?: number | string;
  /** Fired with the parsed numeric value (or '' when cleared). */
  onValueChange?: (value: number | '') => void;
}

const formatWithCommas = (digits: string) => {
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      label,
      error,
      containerClassName,
      currencySymbol = '$',
      value,
      onValueChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const displayValue = useMemo(() => {
      if (value === undefined || value === null || value === '') return '';
      const [intPart, decimalPart] = String(value).split('.');
      const formattedInt = formatWithCommas(intPart.replace(/[^\d]/g, ''));
      return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
    }, [value]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^\d.]/g, '');
        if (!onValueChange) return;
        if (raw === '') {
          onValueChange('');
          return;
        }
        const parsed = Number(raw);
        onValueChange(Number.isNaN(parsed) ? '' : parsed);
      },
      [onValueChange]
    );

    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>
        )}
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors text-[14px] font-medium">
            {currencySymbol}
          </span>
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={displayValue}
            onChange={handleChange}
            className={cn(
              'flex h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-5 py-2 text-[14px] text-gray-700 placeholder:text-gray-400 focus-visible:outline-none focus:border-primary-500 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-(--color-disabled-bg) transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-gray-300 hover:shadow-sm focus:shadow-[0_0_0_4px_rgba(0,92,218,0.15)]',
              error ? 'border-(--color-danger) focus-visible:border-(--color-danger) focus:shadow-[0_0_0_4px_rgba(192,16,72,0.15)]' : '',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-(--color-danger) ml-1">{error}</p>}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
