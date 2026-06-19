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
    EMPLOYEE: {
        DASHBOARD_STATS: ['employee', 'dashboard-stats'],
        RECENT_ACTIVITY: ['employee', 'recent-activity'],
        PROJECTS: ['employee', 'projects'],
        TIMESHEET: ['employee', 'timesheet'],
        MEMBER_PROFILE: (id: string) => ['employee', 'member-profile', id] as const,
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
    PROJECT: {
        LIST: ['project', 'list'],
        DETAIL: (id: string | number) => ['project', 'detail', id],
        SAVED: ['project', 'saved'],
    },
    STARRED: {
        QUERIES: ['starred', 'queries'],
    },
    TIMESHEET: {
        WEEKLY: ['timesheet', 'weekly'],
        REQUESTS: ['timesheet', 'requests'],
        MY_REQUESTS: ['timesheet', 'my-requests'],
        POLICIES: ['timesheet', 'policies'],
    },
    SETTINGS: {
        ME: ['settings', 'me'],
    },
    TICKETS: {
        LIST: ['tickets', 'list'],
    },
    PERFORMANCE: {
        LIST: ['performance', 'list'],
        EMPLOYEES: ['performance', 'employees'],
        CONFIG: ['performance', 'config'],
    },
} as const;
