import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'outline' | 'ghost' | 'link' | 'transparent' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
export type ButtonAnimation = 'sweep' | 'sweep-black' | 'none';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {

  variant?: ButtonVariant;

  size?: ButtonSize;

  animation?: ButtonAnimation;

  loading?: boolean;

  leftIcon?: LucideIcon;

  rightIcon?: LucideIcon;

  fullWidth?: boolean;

  rounded?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-sweep text-white',
  secondary: 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 font-medium',
  dark: 'btn-sweep-black text-white',
  outline: 'bg-transparent text-gray-600 border border-gray-200 hover:bg-gray-50 font-medium',
  ghost: 'bg-transparent text-gray-500 hover:bg-gray-100 font-medium',
  link: 'bg-transparent text-primary-500 hover:text-primary-600 underline-offset-4 hover:underline',
  transparent: 'bg-transparent text-primary-600 font-medium !p-0',
  danger: 'bg-(--color-danger) hover:bg-(--color-danger)/90 text-white',
  success: 'bg-(--color-success) hover:bg-(--color-success)/90 text-white'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-2 text-lg',
  xl: 'px-10 py-2 text-xl'
};

const animationClasses: Record<ButtonAnimation, string> = {
  sweep: 'btn-sweep',
  'sweep-black': 'btn-sweep-black',
  none: ''
};

export const pageActionButtonClass =
  'rounded-xl h-10 min-h-10 px-4 text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 border-0 shadow-none !shadow-none hover:!shadow-none hover:translate-y-0 active:scale-100 w-full sm:w-auto whitespace-nowrap shrink-0 transition-colors';

export const pageOutlineButtonClass =
  'rounded-xl h-10 min-h-10 px-4 text-sm font-semibold border-gray-200 shadow-none !shadow-none hover:!shadow-none hover:translate-y-0 active:scale-100 w-full sm:w-auto whitespace-nowrap shrink-0 transition-colors';

export const PageActionButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant' | 'animation' | 'rounded'>>(
  ({ size = 'sm', className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="primary"
      size={size}
      animation="none"
      rounded={false}
      className={cn(pageActionButtonClass, className)}
      {...props}
    />
  )
);

PageActionButton.displayName = 'PageActionButton';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      animation = 'sweep',
      loading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      fullWidth = false,
      rounded = true,
      className,
      disabled,
      ...props
    },
    ref
  ) => {

    const getVariantClasses = () => {

      if (animation === 'sweep' && variant === 'primary') {
        return 'btn-sweep text-white';
      }
      if (animation === 'sweep-black' || (animation === 'sweep' && variant === 'dark')) {
        return 'btn-sweep-black text-white';
      }
      if (animation === 'none') {
        if (variant === 'primary') return 'bg-primary-600 hover:bg-primary-700 text-white';
        if (variant === 'dark') return 'bg-gray-900 hover:bg-gray-800 text-white';
        const baseVariant = variantClasses[variant]
          .replace('btn-sweep', '')
          .replace('btn-sweep-black', '')
          .trim();
        return baseVariant || variantClasses[variant];
      }
      return variantClasses[variant];
    };

    const baseClasses =
      'font-semibold text-sm font-heading transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98] hover:-translate-y-[1px] hover:shadow-lg shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2';
    const roundedClass = rounded ? 'rounded-full' : 'rounded-lg';
    const widthClass = fullWidth ? 'w-full' : '';

    const classes = cn(
      baseClasses,
      sizeClasses[size],
      getVariantClasses(),
      roundedClass,
      widthClass,
      className
    );

    return (
      <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {children}
          </>
        ) : (
          <>
            {LeftIcon && (
              <LeftIcon size={size === 'sm' ? 16 : size === 'lg' || size === 'xl' ? 24 : 20} />
            )}
            {children}
            {RightIcon && (
              <RightIcon
                size={size === 'sm' ? 16 : size === 'lg' || size === 'xl' ? 24 : 20}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: ButtonVariant;
  size?: ButtonSize;
  'aria-label': string;
}

const iconButtonSizeClasses: Record<ButtonSize, { box: string; icon: number }> = {
  sm: { box: 'h-8 w-8', icon: 16 },
  md: { box: 'h-9 w-9', icon: 18 },
  lg: { box: 'h-11 w-11', icon: 20 },
  xl: { box: 'h-12 w-12', icon: 22 },
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, variant = 'ghost', size = 'md', className, disabled, ...props }, ref) => {
    const { box, icon } = iconButtonSizeClasses[size];
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2',
          box,
          variantClasses[variant].replace('btn-sweep', '').replace('btn-sweep-black', '').trim(),
          className,
        )}
        {...props}
      >
        <Icon size={icon} />
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
