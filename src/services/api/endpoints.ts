/**
 * API Endpoints Configuration
 */

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: 'api/v1/auth/login',
        REGISTER: 'api/v1/auth/register',
        VERIFY_OTP: (id: string | number) => `api/v1/auth/verify/${id}`,
        RESEND_OTP: (id: string | number) => `api/v1/auth/resendOTP/${id}`,
        FORGOT_PASSWORD: 'api/v1/auth/forgot',
        RESET_PASSWORD: (id: string | number) => `api/v1/auth/reset/${id}`,
        ME: 'api/v1/auth/me',
        REFRESH: 'api/v1/auth/refresh',
        LOGOUT: 'api/v1/auth/logout',
    },
    TEAM: {
        LIST: 'api/v1/team',
        CREATE: 'api/v1/team',
        DELETE_MANY: 'api/v1/team',
        DETAIL: (id: string | number) => `api/v1/team/${id}`,
        UPDATE: (id: string | number) => `api/v1/team/${id}`,
        DELETE: (id: string | number) => `api/v1/team/${id}`,
    },
    INVITE: {
        LIST: 'api/v1/invite',
        CREATE: 'api/v1/invite',
        DELETE_MANY: 'api/v1/invite',
        PREVIEW: (token: string) => `api/v1/invite/token/${token}/preview`,
        REDEEM: 'api/v1/invite/redeem',
        DETAIL: (id: string | number) => `api/v1/invite/${id}`,
        UPDATE: (id: string | number) => `api/v1/invite/${id}`,
        DELETE: (id: string | number) => `api/v1/invite/${id}`,
        ACCEPT: (id: string | number) => `api/v1/invite/${id}/accept`,
    },
    USER: {
        LIST: 'api/v1/user',
        CREATE: 'api/v1/user',
        UPDATE_MANY: 'api/v1/user',
        DELETE_MANY: 'api/v1/user',
        DETAIL: (id: string | number) => `api/v1/user/${id}`,
        UPDATE: (id: string | number) => `api/v1/user/${id}`,
        DELETE: (id: string | number) => `api/v1/user/${id}`,
    },
    // Add other modules here as needed
} as const;
