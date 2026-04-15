import React from 'react';

type Props = {
    label?: string;
    name: string;
    checked?: boolean;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    error?: string;
    className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'checked' | 'onChange' | 'onBlur' | 'type'>;

const FormCheckbox: React.FC<Props> = ({
    label,
    name,
    checked,
    onChange,
    onBlur,
    error,
    className,
    ...props
}) => {
    return (
        <div className={className}>
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id={name}
                    name={name}
                    checked={checked}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${error ? 'border-red-500' : ''
                        }`}
                    {...props}
                />
                {label && (
                    <label htmlFor={name} className="ml-2 block text-sm text-gray-900">
                        {label}
                    </label>
                )}
            </div>
            {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
        </div>
    );
};

export default FormCheckbox;

