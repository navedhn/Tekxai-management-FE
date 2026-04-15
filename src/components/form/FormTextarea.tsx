import React from 'react';

type Props = {
    label?: string;
    name: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
    onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
    error?: string;
    className?: string;
    rows?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'value' | 'onChange' | 'onBlur'>;

const FormTextarea: React.FC<Props> = ({
    label,
    name,
    value,
    onChange,
    onBlur,
    error,
    className,
    rows = 4,
    ...props
}) => {
    return (
        <div className={className}>
            {label ? (
                <label className="block mb-1 text-sm font-medium" htmlFor={name}>
                    {label}
                </label>
            ) : null}
            <textarea
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                rows={rows}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200 ${error ? 'border-red-500' : 'border-gray-300'
                    }`}
                {...props}
            />
            {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
        </div>
    );
};

export default FormTextarea;

