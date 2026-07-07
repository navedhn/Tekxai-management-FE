export interface ProjectStatusOption {
  value: string;
  label: string;
  className: string;
}

// Legacy statuses kept for backward compatibility with existing projects;
// workflow statuses are the Google-Sheet-parity delivery pipeline.
export const PROJECT_STATUS_OPTIONS: ProjectStatusOption[] = [
  { value: 'PLANNING',      label: 'Planning',      className: 'bg-[#F5F3FF] text-[#6941C6] border-[#E9D7FE]' },
  { value: 'DESIGN',        label: 'Design',         className: 'bg-[#FDF2FA] text-[#C11574] border-[#FCCEEE]' },
  { value: 'FRONTEND',      label: 'Frontend',       className: 'bg-[#ECFDFF] text-[#0E7090] border-[#B5E9F0]' },
  { value: 'BACKEND',       label: 'Backend',        className: 'bg-[#EEF4FF] text-[#3538CD] border-[#C7D7FE]' },
  { value: 'QA',            label: 'QA',             className: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]' },
  { value: 'CLIENT_REVIEW', label: 'Client Review',  className: 'bg-[#F0FDF9] text-[#0F766E] border-[#99F6E4]' },
  { value: 'DEPLOYMENT',    label: 'Deployment',     className: 'bg-[#F5F0FF] text-[#7C3AED] border-[#DDD6FE]' },
  { value: 'SUPPORT',       label: 'Support',        className: 'bg-[#F0F9FF] text-[#026AA2] border-[#B9E6FE]' },
  { value: 'DELIVERED',     label: 'Delivered',      className: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' },
  { value: 'BLOCKED',       label: 'Blocked',        className: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]' },
  { value: 'ARCHIVED',      label: 'Archived',       className: 'bg-gray-50 text-gray-500 border-gray-200' },
  // Legacy
  { value: 'PENDING',       label: 'Pending',        className: 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]' },
  { value: 'IN_PROGRESS',   label: 'In Progress',    className: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]' },
  { value: 'COMPLETED',     label: 'Completed',      className: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' },
  { value: 'OVERDUE',       label: 'Overdue',        className: 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]' },
];

const STATUS_MAP = new Map(PROJECT_STATUS_OPTIONS.map((o) => [o.value, o]));

export function getProjectStatusStyle(status: string | null | undefined): string {
  return STATUS_MAP.get(status || '')?.className || 'bg-gray-50 text-gray-500 border-gray-200';
}

export function getProjectStatusLabel(status: string | null | undefined): string {
  return STATUS_MAP.get(status || '')?.label || status || 'Pending';
}
