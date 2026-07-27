// Topbar title/subtitle per route — title is the page name (matches the
// sidebar item label), subtitle is the module it belongs to. Kept as its
// own lookup (not derived from Sidebar.tsx's internal data) so the two
// files don't need to share an import just for this.
const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/admin': { title: 'Dashboard', subtitle: '' },
  '/admin/executive-dashboard': { title: 'Executive Dashboard', subtitle: 'Dashboard' },

  '/admin/employee-directory': { title: 'Employee Directory', subtitle: 'Workforce' },
  '/admin/add-employee': { title: 'Add Employee', subtitle: 'Workforce' },
  '/admin/business-units': { title: 'Business Units', subtitle: 'Workforce' },
  '/admin/departments': { title: 'Departments', subtitle: 'Workforce' },
  '/admin/divisions': { title: 'Divisions', subtitle: 'Workforce' },
  '/admin/team': { title: 'Teams', subtitle: 'Workforce' },
  '/admin/designations': { title: 'Designations', subtitle: 'Workforce' },
  '/admin/grades': { title: 'Grades', subtitle: 'Workforce' },
  '/admin/org-chart': { title: 'Org Chart', subtitle: 'Workforce' },
  '/admin/job-descriptions': { title: 'Job Descriptions', subtitle: 'Workforce' },
  '/admin/hr-reports': { title: 'HR Reports', subtitle: 'Workforce' },

  '/admin/onboarding': { title: 'Hiring & Onboarding', subtitle: 'Recruitment' },

  '/admin/attendance': { title: 'Attendance', subtitle: 'Attendance' },
  '/admin/overtime': { title: 'Overtime', subtitle: 'Attendance' },

  '/admin/performance': { title: 'Performance', subtitle: 'Performance' },
  '/admin/performance-scoring': { title: 'Performance Scoring', subtitle: 'Performance' },

  '/admin/increments': { title: 'Increments', subtitle: 'Payroll' },
  '/admin/payroll': { title: 'Payroll', subtitle: 'Payroll' },

  '/admin/finance/expenses': { title: 'Expense Claims', subtitle: 'Finance' },
  '/admin/finance/financial-reports': { title: 'Financial Reports', subtitle: 'Finance' },

  '/admin/assets': { title: 'Assets', subtitle: 'Assets' },

  '/admin/requisitions': { title: 'Requisitions', subtitle: 'Procurement' },

  '/admin/contracts': { title: 'Contracts', subtitle: 'Contracts' },
  '/admin/documents': { title: 'HR Documents', subtitle: 'Contracts' },
  '/admin/document-templates': { title: 'Document Templates', subtitle: 'Contracts' },

  '/admin/policies': { title: 'Policies', subtitle: 'Policies' },

  '/admin/tickets': { title: 'Support Tickets', subtitle: 'Ticketing' },
  '/admin/ticket-categories': { title: 'Ticket Categories', subtitle: 'Ticketing' },
  '/admin/ticket-types': { title: 'Ticket Types', subtitle: 'Ticketing' },
  '/admin/approvals': { title: 'Approvals', subtitle: 'Ticketing' },

  '/admin/monitoring': { title: 'Monitoring', subtitle: 'Monitoring' },
  '/admin/download-app': { title: 'Desktop App', subtitle: 'Monitoring' },

  '/admin/timesheet': { title: 'Timesheet', subtitle: 'My Workspace' },
  '/admin/my-salaries': { title: 'My Salaries', subtitle: 'My Workspace' },
  '/admin/settings': { title: 'Settings', subtitle: 'My Workspace' },

  '/admin/permissions': { title: 'Access Control', subtitle: 'Administration' },
  '/admin/webhooks': { title: 'Webhooks', subtitle: 'Administration' },
  '/admin/report-builder': { title: 'Report Builder', subtitle: 'Administration' },
  '/admin/email-logs': { title: 'Email Logs', subtitle: 'Administration' },
  '/admin/system-settings': { title: 'System Settings', subtitle: 'Administration' },

  '/admin/projects': { title: 'Projects', subtitle: 'Projects' },
  '/admin/project-tracking': { title: 'Project Tracking', subtitle: 'Projects' },
  '/admin/project-timeline': { title: 'Timeline', subtitle: 'Projects' },
  '/admin/meetings': { title: 'Meetings', subtitle: 'Projects' },
  '/admin/reports': { title: 'Reports', subtitle: 'Projects' },
  '/admin/project-report': { title: 'Project Report', subtitle: 'Projects' },
  '/admin/starred': { title: 'Starred', subtitle: 'Projects' },
};

function titleCase(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getPageTitle(pathname: string): { title: string; subtitle: string } {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match for detail/sub-routes (e.g. /admin/documents/:id)
  const prefixMatch = Object.keys(PAGE_TITLES)
    .filter((p) => p !== '/admin' && pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];
  if (prefixMatch) return PAGE_TITLES[prefixMatch];
  // Generic fallback: last path segment, title-cased, no subtitle guess.
  const last = pathname.split('/').filter(Boolean).pop() || 'Dashboard';
  return { title: titleCase(last), subtitle: '' };
}
