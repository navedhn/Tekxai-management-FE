const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/executive-dashboard': 'Executive Dashboard',

  '/admin/employee-directory': 'Employee Directory',
  '/admin/add-employee': 'Add Employee',
  '/admin/business-units': 'Business Units',
  '/admin/departments': 'Departments',
  '/admin/divisions': 'Divisions',
  '/admin/team': 'Teams',
  '/admin/designations': 'Designations',
  '/admin/grades': 'Grades',
  '/admin/org-chart': 'Org Chart',
  '/admin/job-descriptions': 'Job Descriptions',
  '/admin/hr-reports': 'HR Reports',
  '/admin/performance-reviews': 'Performance Reviews',

  '/admin/onboarding': 'Hiring & Onboarding',

  '/admin/attendance': 'Attendance',
  '/admin/overtime': 'Overtime',

  '/admin/performance': 'Performance',
  '/admin/performance-scoring': 'Performance Scoring',

  '/admin/increments': 'Increments',
  '/admin/payroll': 'Payroll',

  '/admin/finance/expenses': 'Expense Claims',
  '/admin/finance/financial-reports': 'Financial Reports',

  '/admin/assets': 'Assets',

  '/admin/requisitions': 'Requisitions',

  '/admin/contracts': 'Contracts',
  '/admin/documents': 'HR Documents',
  '/admin/document-templates': 'Document Templates',

  '/admin/policies': 'Policies',

  '/admin/tickets': 'Support Tickets',
  '/admin/ticket-categories': 'Ticket Categories',
  '/admin/ticket-types': 'Ticket Types',
  '/admin/approvals': 'Approvals',

  '/admin/monitoring': 'Monitoring',
  '/admin/download-app': 'Desktop App',

  '/admin/timesheet': 'Timesheet',
  '/admin/my-salaries': 'My Salaries',
  '/admin/settings': 'Settings',

  '/admin/permissions': 'Access Control',
  '/admin/webhooks': 'Webhooks',
  '/admin/report-builder': 'Report Builder',
  '/admin/email-logs': 'Email Logs',
  '/admin/system-settings': 'System Settings',

  '/admin/projects': 'Projects',
  '/admin/project-tracking': 'Project Tracking',
  '/admin/project-timeline': 'Timeline',
  '/admin/meetings': 'Meetings',
  '/admin/reports': 'Reports',
  '/admin/project-report': 'Project Report',
  '/admin/starred': 'Starred',

  '/chat': 'Messages',
};

function titleCase(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getPageTitle(pathname: string, routePrefix: string = '/admin'): { title: string } {
  const normalized = routePrefix !== '/admin' && pathname.startsWith(routePrefix)
    ? '/admin' + pathname.slice(routePrefix.length)
    : pathname;
  if (PAGE_TITLES[normalized]) return { title: PAGE_TITLES[normalized] };

  const prefixMatch = Object.keys(PAGE_TITLES)
    .filter((p) => p !== '/admin' && normalized.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];
  if (prefixMatch) return { title: PAGE_TITLES[prefixMatch] };

  const last = normalized.split('/').filter(Boolean).pop() || 'Dashboard';
  return { title: titleCase(last) };
}
