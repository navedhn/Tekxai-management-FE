import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { classNames } from '@/utils/helpers';

type Variant = 'success' | 'error' | 'info' | 'warning';

type Props = {
    children: React.ReactNode;
    variant?: Variant;
    title?: string;
    dismissible?: boolean;
    onDismiss?: () => void;
    className?: string;
};

const variantStyles: Record<Variant, { bg: string; icon: React.ReactNode; border: string }> = {
    success: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        icon: <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />,
        border: 'border-green-200 dark:border-green-800'
    },
    error: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        icon: <AlertCircle className="text-red-600 dark:text-red-400" size={20} />,
        border: 'border-red-200 dark:border-red-800'
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        icon: <Info className="text-blue-600 dark:text-blue-400" size={20} />,
        border: 'border-blue-200 dark:border-blue-800'
    },
    warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        icon: <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />,
        border: 'border-yellow-200 dark:border-yellow-800'
    }
};

const Alert: React.FC<Props> = ({
    children,
    variant = 'info',
    title,
    dismissible = false,
    onDismiss,
    className
}) => {
    const styles = variantStyles[variant];

    return (
        <div
            className={classNames(
                'flex gap-3 p-4 rounded-lg border',
                styles.bg,
                styles.border,
                className
            )}
            role="alert"
        >
            <div className="shrink-0">{styles.icon}</div>
            <div className="flex-1">
                {title && <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>}
                <div className="text-sm text-gray-800 dark:text-gray-200">{children}</div>
            </div>
            {dismissible && onDismiss && (
                <button
                    onClick={onDismiss}
                    className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Dismiss"
                >
                    <X size={18} />
                </button>
            )}
        </div>
    );
};

export default Alert;

