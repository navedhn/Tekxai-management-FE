import React from 'react';
import { formatDate } from '@/utils/dateUtils';

type Props = {
    label?: string;
    name: string;
    value?: string | Date;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    error?: string;
    className?: string;
    format?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange' | 'onBlur' | 'type'>;

const FormDatePicker: React.FC<Props> = ({
    label,
    name,
    value,
    onChange,
    onBlur,
    error,
    className,
    format = 'yyyy-mm-dd',
    ...props
}) => {
    return (
        <div className={className}>
            {label ? (
                <label className="block mb-1 text-sm font-medium" htmlFor={name}>
                    {label}
                </label>
            ) : null}
            <input
                type="date"
                id={name}
                name={name}
                value={value ? formatDate(value, format) : ''}
                onChange={onChange}
                onBlur={onBlur}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200 ${error ? 'border-red-500' : 'border-gray-300'
                    }`}
                {...props}
            />
            {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
        </div>
    );
};

export default FormDatePicker;

