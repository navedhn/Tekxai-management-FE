import React from 'react';

type RadioOption = {
  label: string;
  value: string;
};

type Props = {
  label?: string;
  name: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  error?: string;
  className?: string;
  options: RadioOption[];
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange' | 'onBlur' | 'type'>;

const FormRadio: React.FC<Props> = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  className,
  options,
  ...props
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block mb-2 text-sm font-medium">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              onBlur={onBlur}
              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${error ? 'border-red-500' : ''
                }`}
              {...props}
            />
            <label
              htmlFor={`${name}-${option.value}`}
              className="ml-2 block text-sm text-gray-900"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
    </div>
  );
};

export default FormRadio;
