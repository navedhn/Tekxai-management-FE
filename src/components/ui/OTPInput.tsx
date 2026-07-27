import React, { useCallback, useMemo, useRef } from 'react';
import { cn } from '@/utils/cn';

/**
 * Phase 7 (Inputs): fixed-length one-time-passcode input rendered as
 * individual single-digit boxes with auto-advance/auto-backspace
 * between them. Shares the shared border/radius/focus/error/disabled
 * tokens used across Input.tsx and Select.tsx.
 */
export interface OTPInputProps {
  /** Number of digit boxes. @default 6 */
  length?: number;
  /** Current value as a string of digits (may be shorter than `length`). */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  containerClassName?: string;
  className?: string;
  /** Mask entered digits, e.g. for OTP-as-password flows. @default false */
  masked?: boolean;
  autoFocus?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  label,
  error,
  disabled,
  containerClassName,
  className,
  masked = false,
  autoFocus = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = useMemo(() => {
    const arr = value.split('').slice(0, length);
    while (arr.length < length) arr.push('');
    return arr;
  }, [value, length]);

  const setDigit = useCallback(
    (index: number, digit: string) => {
      const next = [...digits];
      next[index] = digit;
      onChange(next.join('').slice(0, length));
    },
    [digits, onChange, length]
  );

  const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigit(index, '');
      return;
    }
    // Take the last typed character (handles overwrite of an existing digit).
    const char = raw[raw.length - 1];
    setDigit(index, char);
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setDigit(index - 1, '');
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted.padEnd(length, ' ').slice(0, length).trimEnd());
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      {label && <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>}
      <div className="flex items-center gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type={masked ? 'password' : 'text'}
            inputMode="numeric"
            maxLength={1}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
            value={digit}
            onChange={handleChange(index)}
            onKeyDown={handleKeyDown(index)}
            onPaste={handlePaste}
            className={cn(
              'h-11 w-11 rounded-xl border border-gray-200 bg-white text-center text-[16px] font-semibold text-gray-700 focus-visible:outline-none focus:border-primary-500 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-(--color-disabled-bg) transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-gray-300 focus:shadow-[0_0_0_4px_rgba(0,92,218,0.15)]',
              error ? 'border-(--color-danger) focus-visible:border-(--color-danger) focus:shadow-[0_0_0_4px_rgba(192,16,72,0.15)]' : '',
              className
            )}
          />
        ))}
      </div>
      {error && <p className="text-xs text-(--color-danger) ml-1">{error}</p>}
    </div>
  );
};

export default OTPInput;
