export const QUERY_KEYS = {
  AUTH: {
    USER:    ['auth', 'user'],
    PROFILE: ['auth', 'profile'],
  },
  ADMIN: {
    STATS:    ['admin', 'stats'],
    PROJECTS: ['admin', 'projects'],
  },
  TEAM: {
    LIST:   ['team', 'list'],
    CREATE: ['team', 'create'],
    UPDATE: ['team', 'update'],
    DELETE: ['team', 'delete'],
  },
  DEPARTMENT: {
    LIST:   ['department', 'list'],
    DETAIL: (id: string) => ['department', 'detail', id],
  },
  EMPLOYEE: {
    DASHBOARD_STATS: ['employee', 'dashboard-stats'],
    RECENT_ACTIVITY: ['employee', 'recent-activity'],
    PROJECTS:        ['employee', 'projects'],
    TIMESHEET:       ['employee', 'timesheet'],
    MEMBER_PROFILE:  (id: string) => ['employee', 'member-profile', id] as const,
  },
  INVITE: {
    LIST:    ['invite', 'list'],
    PREVIEW: (token: string) => ['invite', 'preview', token],
    UPDATE:  ['invite', 'update'],
    DELETE:  ['invite', 'delete'],
  },
  ROLE: {
    LIST: ['role', 'list'],
  },
  USER: {
    LIST:   ['user', 'list'],
    CREATE: ['user', 'create'],
    UPDATE: ['user', 'update'],
    DELETE: ['user', 'delete'],
  },
  PROJECT: {
    LIST:      ['project', 'list'],
    DETAIL:    (id: string | number) => ['project', 'detail', id],
    SAVED:     ['project', 'saved'],
    DASHBOARD: ['project', 'dashboard'],
  },
  MILESTONE: {
    LIST: (projectId: string) => ['project', projectId, 'milestones'],
  },
  DEVOPS_ACCESS: {
    DETAIL: (projectId: string) => ['project', projectId, 'devops-access'],
  },
  TRACKING_LINKS: {
    LIST: (projectId: string) => ['project', projectId, 'tracking-links'],
  },
  WEEKLY_UPDATES: {
    LIST: (projectId: string) => ['project', projectId, 'weekly-updates'],
  },
  PROJECT_DOCUMENTS: {
    LIST:  (projectId: string) => ['project', projectId, 'documents'],
    TYPES: (projectId: string) => ['project', projectId, 'document-types'],
  },
  PROJECT_TIMELINE: {
    LIST: (projectId: string) => ['project', projectId, 'timeline'],
  },
  EXTENSION_REQUESTS: {
    LIST: (projectId: string) => ['project', projectId, 'extension-requests'],
  },
  STARRED: {
    QUERIES: ['starred', 'queries'],
  },
  TIMESHEET: {
    WEEKLY:     ['timesheet', 'weekly'],
    REQUESTS:   ['timesheet', 'requests'],
    MY_REQUESTS:['timesheet', 'my-requests'],
    POLICIES:   ['timesheet', 'policies'],
    RECENT_ACTIVITY: ['timesheet', 'recent-activity'],
  },
  SETTINGS: {
    ME: ['settings', 'me'],
  },
  TICKETS: {
    LIST: ['tickets', 'list'],
  },
  NOTIFICATION: {
    LIST: ['notification', 'list'],
  },
  ASSET: {
    LIST:       ['asset', 'list'],
    DETAIL:     (id: string) => ['asset', 'detail', id],
    CATEGORIES: ['asset', 'categories'],
    LOCATIONS:  ['asset', 'locations'],
    VENDORS:    ['asset', 'vendors'],
  },
  PERFORMANCE: {
    LIST:         ['performance'],
    REPORTS:      ['performance', 'reports'],
    SCORES:       ['performance', 'scores'],
    BONUS:        ['performance', 'bonus'],
    BONUS_CONFIG: ['performance', 'bonus-config'],
  },
  MARKETING: {
    DEALS:          ['marketing', 'deals'],
    SALARY_BUILDER: ['marketing', 'salary-builder'],
    SALARY_HISTORY: ['marketing', 'salary-history'],
  },
  MEETING: {
    DASHBOARD:     ['meeting', 'dashboard'],
    ROOM_LIST:     (params?: unknown) => ['meeting', 'room', 'list', params],
    ROOM_DETAIL:   (id: string) => ['meeting', 'room', 'detail', id],
    ROOM_TIMELINE: (id: string) => ['meeting', 'room', 'timeline', id],
    AGENDA_LIST:   (roomId: string, params?: unknown) => ['meeting', 'room', roomId, 'agenda', params],
    MEETING_LIST:  (params?: unknown) => ['meeting', 'list', params],
    MEETING_DETAIL: (id: string) => ['meeting', 'detail', id],
    MEETING_TIMELINE: (id: string) => ['meeting', 'timeline', id],
    ACTION_ITEM_LIST: (params?: unknown) => ['meeting', 'action-item', 'list', params],
    ATTACHMENT_LIST: (attachableType: string, attachableId: string) => ['meeting', 'attachment', attachableType, attachableId],
  },
} as const;
