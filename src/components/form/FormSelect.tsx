import React from 'react';
import Select, { StylesConfig, SingleValue } from 'react-select';
import { SelectOption } from '@/types';
import { cn } from '@/utils/cn';

type Props = {
    label?: string;
    name: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLSelectElement> | ((value: string) => void);
    onBlur?: React.FocusEventHandler<HTMLSelectElement> | (() => void);
    error?: string;
    className?: string;
    options: SelectOption[];
    placeholder?: string;
    isMulti?: boolean;
    isDisabled?: boolean;
    isClearable?: boolean;
    isSearchable?: boolean;
};

const FormSelect: React.FC<Props> = ({
    label,
    name,
    value,
    onChange,
    onBlur,
    error,
    className,
    options,
    placeholder = 'Select an option...',
    isMulti = false,
    isDisabled = false,
    isClearable = false,
    isSearchable = true,
}) => {
    // Convert string value to react-select option object
    const selectedOption = value
        ? options.find((option) => option.value === value) || null
        : null;

    // Handle change from react-select - converts to Formik-compatible event
    const handleChange = (selected: SingleValue<SelectOption> | readonly SelectOption[]) => {
        if (!onChange) return;

        const singleValue = selected as SingleValue<SelectOption>;
        const newValue = singleValue?.value || '';

        // Create a synthetic event that mimics HTML select behavior for Formik compatibility
        const syntheticEvent = {
            target: {
                name,
                value: newValue,
            },
            currentTarget: {
                name,
                value: newValue,
            },
        } as React.ChangeEvent<HTMLSelectElement>;

        // Call onChange with the synthetic event (works with Formik's handleChange)
        (onChange as React.ChangeEventHandler<HTMLSelectElement>)(syntheticEvent);
    };

    // Handle blur for Formik compatibility
    const handleBlur = () => {
        if (!onBlur) return;

        // Create a synthetic blur event for Formik compatibility
        const syntheticEvent = {
            target: { name },
            currentTarget: { name },
        } as React.FocusEvent<HTMLSelectElement>;

        (onBlur as React.FocusEventHandler<HTMLSelectElement>)(syntheticEvent);
    };

    // Custom styles for react-select
    const customStyles: StylesConfig<SelectOption, false> = {
        control: (base, state) => ({
            ...base,
            borderColor: error
                ? '#ef4444'
                : state.isFocused
                    ? '#3b82f6'
                    : '#d1d5db',
            boxShadow: state.isFocused
                ? error
                    ? '0 0 0 1px #ef4444'
                    : '0 0 0 1px #3b82f6'
                : 'none',
            '&:hover': {
                borderColor: error ? '#ef4444' : '#9ca3af',
            },
            minHeight: '38px',
        }),
        placeholder: (base) => ({
            ...base,
            color: '#9ca3af',
        }),
        singleValue: (base) => ({
            ...base,
            color: '#111827',
        }),
        menu: (base) => ({
            ...base,
            zIndex: 9999,
        }),
    };

    return (
        <div className={className}>
            {label ? (
                <label className="block mb-1 text-sm font-medium" htmlFor={name}>
                    {label}
                </label>
            ) : null}
            <Select<SelectOption, false>
                name={name}
                value={selectedOption}
                onChange={handleChange}
                onBlur={handleBlur}
                options={options}
                placeholder={placeholder}
                isMulti={isMulti as false}
                isDisabled={isDisabled}
                isClearable={isClearable}
                isSearchable={isSearchable}
                styles={customStyles}
                className={cn('react-select-container', error && 'react-select-error')}
                classNamePrefix="react-select"
            />
            {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
        </div>
    );
};

export default FormSelect;
