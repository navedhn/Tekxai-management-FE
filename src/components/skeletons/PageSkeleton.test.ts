import { describe, expect, it } from 'vitest';
import { getPageSkeletonVariant } from './PageSkeleton';

describe('getPageSkeletonVariant', () => {
  it('maps employee and admin home to dashboard variants', () => {
    expect(getPageSkeletonVariant('/employee')).toBe('dashboard-employee');
    expect(getPageSkeletonVariant('/employee/')).toBe('dashboard-employee');
    expect(getPageSkeletonVariant('/admin')).toBe('dashboard-admin');
    expect(getPageSkeletonVariant('/admin/executive-dashboard')).toBe('dashboard-admin');
  });

  it('does not treat employee-directory as a profile detail page', () => {
    expect(getPageSkeletonVariant('/admin/employee-directory')).toBe('table');
    expect(getPageSkeletonVariant('/admin/employee/abc-123')).toBe('detail');
  });

  it('maps timesheet, tickets, documents, settings, chat, and org chart', () => {
    expect(getPageSkeletonVariant('/employee/timesheet')).toBe('timesheet');
    expect(getPageSkeletonVariant('/employee/daily-report')).toBe('timesheet');
    expect(getPageSkeletonVariant('/employee/tickets')).toBe('stats-table');
    expect(getPageSkeletonVariant('/employee/documents')).toBe('documents');
    expect(getPageSkeletonVariant('/employee/documents/doc-1')).toBe('detail');
    expect(getPageSkeletonVariant('/employee/settings')).toBe('form');
    expect(getPageSkeletonVariant('/chat')).toBe('chat');
    expect(getPageSkeletonVariant('/admin/org-chart')).toBe('org-chart');
    expect(getPageSkeletonVariant('/employee/projects')).toBe('table');
  });
});
