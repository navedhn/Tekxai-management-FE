/**
 * TanStack Query Keys Configuration
 */

export const QUERY_KEYS = {
    AUTH: {
        USER: ['auth', 'user'],
        PROFILE: ['auth', 'profile'],
    },
    ADMIN: {
        STATS: ['admin', 'stats'],
        PROJECTS: ['admin', 'projects'],
    },
    TEAM: {
        LIST: ['team', 'list'],
        CREATE: ['team', 'create'],
        UPDATE: ['team', 'update'],
        DELETE: ['team', 'delete'],
    },
    EMPLLOYEE: {
        PROJECTS: ['employee', 'projects'],
        TIMESHEET: ['employee', 'timesheet'],
    },
    INVITE: {
        LIST: ['invite', 'list'],
        PREVIEW: (token: string) => ['invite', 'preview', token],
        UPDATE: ['invite', 'update'],
        DELETE: ['invite', 'delete'],
    },
    USER: {
        LIST: ['user', 'list'],
        CREATE: ['user', 'create'],
        UPDATE: ['user', 'update'],
        DELETE: ['user', 'delete'],
    },
} as const;
