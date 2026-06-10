import React from 'react';
import { cn } from '@/utils/cn';

/** Shared dashboard stat card sizing — use across admin & employee dashboards */
export const dashboardStatStyles = {
  iconBox: 'h-12 w-12 rounded-lg shrink-0 flex items-center justify-center',
  value: 'text-xl font-bold text-gray-900 leading-tight tabular-nums',
  label: 'text-sm font-medium text-gray-700 tracking-tight',
  subtext: 'text-xs text-gray-500',
} as const;

export interface DashboardStatCardProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  subtext?: React.ReactNode;
  iconClassName?: string;
  showDivider?: boolean;
  className?: string;
}

const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  icon,
  value,
  label,
  subtext,
  iconClassName,
  showDivider = false,
  className,
}) => (
  <div
    className={cn(
      'flex items-center gap-3 px-3 py-2 min-w-0',
      showDivider && 'border-r border-[#00000014] lg:border-gray-100',
      className
    )}
  >
    <div className={cn(dashboardStatStyles.iconBox, iconClassName)}>
      {icon}
    </div>
    <div className="flex flex-col min-w-0 gap-0.5">
      <p className={dashboardStatStyles.value}>{value}</p>
      <p className={cn(dashboardStatStyles.label, 'truncate')}>{label}</p>
      {subtext != null && (
        <div className={cn(dashboardStatStyles.subtext, 'truncate')}>{subtext}</div>
      )}
    </div>
  </div>
);

export default DashboardStatCard;
