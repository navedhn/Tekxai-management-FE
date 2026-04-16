// Global/shared types

// Auth / User
export type User = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role_id: string;
    rolesId?: string;
    status: string;
    show_notifications: boolean;
    language: string;
    avatar: string | null;
    phone: string | null;
    department: string | null;
    position: string | null;
    designation: string | null;
    last_login?: string;
    created_at?: string;
    updated_at?: string;
    deleted?: boolean;
    role_name?: string;
    role?: { id: string; name: string } | string;
    roles?: { name: string };
    team_memberships?: any[];
} | null;

export type AuthState = {
    isLoggedIn: boolean;
    token: string | null;
    user: User;
    role: string | null;
};

// Toasts
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';
export type ToastPosition = 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';

export type ToastItem = {
    id: string;
    message: string;
    variant?: ToastVariant;
    duration?: number;
};

// Select
export type SelectOption = { label: string; value: string };

// Table
export type TableColumn<T = any> = {
    name: string;
    selector: (row: T) => any;
    sortable?: boolean;
    cell?: (row: T) => React.ReactNode;
    width?: string;
    minWidth?: string;
};


