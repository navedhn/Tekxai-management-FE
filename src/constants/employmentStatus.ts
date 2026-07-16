// Employment Status display labels — the underlying wire value stays ACTIVE
// (unchanged, since Attendance/Payroll/Monitoring/Assets/Projects all key off
// users.status === 'ACTIVE') but every user-facing surface now reads
// "Permanent" instead of "Active". Keep this the single source of truth for
// the label so it never drifts between the Add Employee wizard, Employee
// Directory, Employee Profile, and HR Dashboard.
export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Permanent',
  INACTIVE: 'Inactive',
  ON_LEAVE: 'On Leave',
  SUSPENDED: 'Suspended',
  TERMINATED: 'Terminated',
  DECEASED: 'Deceased',
};

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Permanent' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'DECEASED', label: 'Deceased' },
];
