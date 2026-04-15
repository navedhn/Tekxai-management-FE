/**
 * EXAMPLES: How to use cn, cls, and classVariants
 * 
 * This file demonstrates the usage patterns for the class utilities.
 * You can reference this file but don't import from it.
 */

import { cn, cls, classVariants, type VariantProps } from './cn';

// ============================================================================
// Example 1: Using `cn` for conditional classes with Tailwind merging
// ============================================================================

export const Example1 = () => {
  const isActive = true;
  const isDisabled = false;

  // cn intelligently merges Tailwind classes and handles conflicts
  const className = cn(
    'px-4 py-2',           // Base classes
    isActive && 'bg-blue-500',  // Conditional class
    isDisabled && 'opacity-50', // Won't be applied
    'text-white',          // Always applied
    'px-6'                 // This will override 'px-4' (last one wins)
  );
  // Result: 'py-2 bg-blue-500 text-white px-6'

  return <div className={className}>Example 1</div>;
};

// ============================================================================
// Example 2: Using `cls` for simple conditional classes (no Tailwind merging)
// ============================================================================

export const Example2 = () => {
  const isLoading = true;
  const hasError = false;

  // cls is simpler - just combines classes without conflict resolution
  const className = cls(
    'button',
    isLoading && 'loading',
    hasError && 'error'
  );
  // Result: 'button loading'

  return <div className={className}>Example 2</div>;
};

// ============================================================================
// Example 3: Using `classVariants` for component variants
// ============================================================================

// Define button variants using classVariants
const buttonVariants = classVariants({
  base: 'font-semibold rounded-md transition-colors focus:outline-none focus:ring-2',
  variants: {
    variant: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
    },
    size: {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg'
    },
    fullWidth: {
      true: 'w-full',
      false: 'w-auto'
    }
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    fullWidth: false
  },
  compoundVariants: [
    {
      variant: 'outline',
      size: 'lg',
      className: 'border-4' // Special styling when outline + lg
    }
  ]
});

// Extract the props type for TypeScript
type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export const Example3 = () => {
  // Use the variants
  const primaryButton = buttonVariants({ variant: 'primary', size: 'md' });
  const secondaryButton = buttonVariants({ variant: 'secondary', size: 'lg' });
  const dangerButton = buttonVariants({ variant: 'danger' }); // Uses default size: 'md'
  const outlineButton = buttonVariants({ variant: 'outline', size: 'sm', fullWidth: true });

  return (
    <div>
      <button className={primaryButton}>Primary</button>
      <button className={secondaryButton}>Secondary</button>
      <button className={dangerButton}>Danger</button>
      <button className={outlineButton}>Outline Full Width</button>
    </div>
  );
};

// ============================================================================
// Example 4: Using classVariants in a component
// ============================================================================

const cardVariants = classVariants({
  base: 'rounded-lg shadow p-4',
  variants: {
    variant: {
      default: 'bg-white',
      elevated: 'bg-white shadow-lg',
      outlined: 'bg-transparent border-2 border-gray-200'
    },
    padding: {
      none: 'p-0',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6'
    }
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md'
  }
});

type CardProps = {
  children: React.ReactNode;
  className?: string;
} & VariantProps<typeof cardVariants>;

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant, 
  padding, 
  className 
}) => {
  return (
    <div className={cn(cardVariants({ variant, padding }), className)}>
      {children}
    </div>
  );
};

// Usage:
// <Card variant="elevated" padding="lg">Content</Card>
// <Card variant="outlined" padding="none" className="custom-class">Content</Card>

// ============================================================================
// Example 5: Combining cn with classVariants
// ============================================================================

export const Example5 = () => {
  const isActive = true;
  const isLoading = false;

  // Combine variants with additional conditional classes
  const className = cn(
    buttonVariants({ variant: 'primary', size: 'md' }),
    isActive && 'ring-2 ring-blue-300',
    isLoading && 'opacity-50 cursor-not-allowed',
    'custom-class' // Additional custom classes
  );

  return <button className={className}>Combined</button>;
};

// ============================================================================
// Example 6: Badge component with variants
// ============================================================================

const badgeVariants = classVariants({
  base: 'inline-flex items-center font-medium rounded-full',
  variants: {
    variant: {
      default: 'bg-gray-100 text-gray-800',
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800'
    },
    size: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'md'
  }
});

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
} & VariantProps<typeof badgeVariants>;

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant, 
  size, 
  className 
}) => {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)}>
      {children}
    </span>
  );
};

// Usage:
// <Badge variant="success" size="sm">New</Badge>
// <Badge variant="error">Error</Badge> // Uses default size: 'md'

