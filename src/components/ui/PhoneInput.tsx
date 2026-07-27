import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

/**
 * Phase 7 (Inputs): simple phone number field — a fixed/selectable
 * country-code prefix plus a plain digits field. Intentionally does
 * not depend on a phone-validation library; this is structure/styling
 * parity with Input.tsx, not full E.164 validation.
 */
export interface PhoneCountryOption {
  code: string; // dial code, e.g. "+1"
  label: string; // display label, e.g. "US +1"
}

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  containerClassName?: string;
  /** Available dial-code options. Defaults to a small common set. */
  countryOptions?: PhoneCountryOption[];
  /** Currently selected dial code, e.g. "+1". */
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  /** National number digits (without the dial code). */
  value?: string;
  onChange?: (value: string) => void;
}

const DEFAULT_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+91', label: 'IN +91' },
  { code: '+971', label: 'UAE +971' },
  { code: '+92', label: 'PK +92' },
];

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      label,
      error,
      containerClassName,
      countryOptions = DEFAULT_COUNTRY_OPTIONS,
      countryCode = DEFAULT_COUNTRY_OPTIONS[0].code,
      onCountryCodeChange,
      value,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>
        )}
        <div
          className={cn(
            'flex h-11 w-full items-stretch rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-gray-300 hover:shadow-sm focus-within:border-primary-500 focus-within:shadow-[0_0_0_4px_rgba(0,92,218,0.15)]',
            error && 'border-(--color-danger) focus-within:border-(--color-danger) focus-within:shadow-[0_0_0_4px_rgba(192,16,72,0.15)]',
            disabled && 'opacity-50 cursor-not-allowed bg-(--color-disabled-bg)'
          )}
        >
          <select
            aria-label="Country code"
            disabled={disabled}
            value={countryCode}
            onChange={(e) => onCountryCodeChange?.(e.target.value)}
            className="shrink-0 bg-transparent border-r border-gray-200 px-3 text-[14px] text-gray-600 focus-visible:outline-none disabled:cursor-not-allowed"
          >
            {countryOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.code}
              </option>
            ))}
          </select>
          <input
            ref={ref}
            type="tel"
            inputMode="tel"
            disabled={disabled}
            value={value}
            onChange={(e) => onChange?.(e.target.value.replace(/[^\d\s-]/g, ''))}
            className={cn(
              'flex-1 min-w-0 bg-transparent px-4 py-2 text-[14px] text-gray-700 placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed',
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

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
