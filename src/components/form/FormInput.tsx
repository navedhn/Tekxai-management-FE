import React, { useState } from 'react';
import { Eye, EyeOff } from '@/assets/icons';
import { cn } from '@/utils/cn';

type Props = {
    label?: string;
    labelClassName?: string;
    name: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    error?: string;
    className?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange' | 'onBlur' | 'type'>;

const FormInput: React.FC<Props> = ({
    label,
    labelClassName,
    name,
    value,
    onChange,
    onBlur,
    error,
    className,
    leftIcon,
    rightIcon,
    type = 'text',
    ...props
}) => {
    const [show, setShow] = useState(false);
    const isPassword = type === 'password';
    const actualType = isPassword ? (show ? 'text' : 'password') : type;

    return (
        <div className={cn("flex flex-col gap-1.5 w-full", className)}>
            {label ? (
                <label className={cn("text-sm font-black text-gray-900 ml-1", labelClassName)} htmlFor={name}>
                    {label}
                </label>
            ) : null}
            <div className="relative group">
                {leftIcon ? (
                    <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 group-focus-within:text-primary-500 transition-colors">
                        {leftIcon}
                    </span>
                ) : null}
                <input
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    type={actualType}
                    className={cn(
                        "flex h-12 w-full rounded-2xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-700 placeholder:text-gray-400 focus-visible:outline-none focus:border-primary-500 focus:shadow-[0_0_0_4px_rgba(0,92,218,0.1)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50",
                        leftIcon && "pl-11",
                        (isPassword || rightIcon) && "pr-11",
                        error ? "border-red-500 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.1)]" : "focus:border-primary-500"
                    )}
                    {...props}
                />
                {isPassword ? (
                    <button
                        type="button"
                        aria-label={show ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => setShow((s) => !s)}
                    >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                ) : rightIcon ? (
                    <span className="absolute inset-y-0 right-4 flex items-center text-gray-400">
                        {rightIcon}
                    </span>
                ) : null}
            </div>
            {error ? <p className="text-xs text-red-500 ml-1 font-bold">{error}</p> : null}
        </div>
    );
};

export default FormInput;

