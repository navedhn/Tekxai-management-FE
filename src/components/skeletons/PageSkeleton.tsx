import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import Skeleton from './skeleton';

export type PageSkeletonVariant =
  | 'dashboard-employee'
  | 'dashboard-admin'
  | 'table'
  | 'stats-table'
  | 'detail'
  | 'form'
  | 'cards'
  | 'timesheet'
  | 'documents'
  | 'chat'
  | 'org-chart';

function StatRow({ count }: { count: number }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        count <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={88} className="rounded-lg" />
      ))}
    </div>
  );
}

function RowList({ count = 6, height = 44 }: { count?: number; height?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={height} className="rounded-lg" />
      ))}
    </div>
  );
}

function DashboardEmployeeSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <StatRow count={3} />
      <Skeleton variant="rectangular" height={72} className="rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton variant="rectangular" height={220} className="rounded-lg" />
        <Skeleton variant="rectangular" height={220} className="rounded-lg" />
      </div>
      <RowList count={5} />
    </div>
  );
}

function DashboardAdminSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <StatRow count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton variant="rectangular" height={260} className="rounded-lg lg:col-span-2" />
        <Skeleton variant="rectangular" height={260} className="rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={180} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function TablePageSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex justify-end">
        <Skeleton variant="rectangular" width={140} height={40} className="rounded-lg" />
      </div>
      <RowList count={8} height={48} />
    </div>
  );
}

function StatsTableSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex justify-end">
        <Skeleton variant="rectangular" width={140} height={40} className="rounded-lg" />
      </div>
      <StatRow count={4} />
      <Skeleton variant="rectangular" height={40} className="rounded-lg w-full max-w-md" />
      <RowList count={8} height={48} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Skeleton variant="rectangular" height={120} className="rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton variant="rectangular" height={240} className="rounded-lg" />
        <Skeleton variant="rectangular" height={240} className="rounded-lg" />
      </div>
      <RowList count={4} />
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Skeleton variant="rectangular" height={100} className="rounded-lg" />
      <Skeleton variant="rectangular" height={160} className="rounded-lg" />
      <Skeleton variant="rectangular" height={280} className="rounded-lg" />
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={120} className="rounded-lg" />
      ))}
    </div>
  );
}

function TimesheetSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <StatRow count={4} />
      <Skeleton variant="rectangular" height={40} className="rounded-lg w-full max-w-lg" />
      <StatRow count={4} />
      <Skeleton variant="rectangular" height={40} className="rounded-lg" />
      <RowList count={7} height={48} />
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={140} className="rounded-lg" />
      ))}
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-var(--spacing-topbar))] overflow-hidden gap-0">
      <div className="w-16 p-3 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={40} className="rounded-lg" />
        ))}
      </div>
      <div className="w-72 p-4 flex flex-col gap-3">
        <Skeleton variant="rectangular" height={36} className="rounded-lg" />
        <RowList count={8} height={44} />
      </div>
      <div className="flex-1 p-6 flex flex-col gap-4">
        <Skeleton variant="rectangular" height={28} className="rounded-lg w-48" />
        <div className="flex-1 flex flex-col gap-3 justify-end">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={48}
              className={cn('rounded-lg', i % 2 === 0 ? 'w-2/5 self-start' : 'w-1/3 self-end')}
            />
          ))}
        </div>
        <Skeleton variant="rectangular" height={48} className="rounded-lg" />
      </div>
    </div>
  );
}

function OrgChartSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={120} className="rounded-lg" />
        ))}
      </div>
      <RowList count={6} />
    </div>
  );
}

const VARIANT_MAP: Record<PageSkeletonVariant, React.FC> = {
  'dashboard-employee': DashboardEmployeeSkeleton,
  'dashboard-admin': DashboardAdminSkeleton,
  table: TablePageSkeleton,
  'stats-table': StatsTableSkeleton,
  detail: DetailSkeleton,
  form: FormSkeleton,
  cards: CardsSkeleton,
  timesheet: TimesheetSkeleton,
  documents: DocumentsSkeleton,
  chat: ChatSkeleton,
  'org-chart': OrgChartSkeleton,
};

export function getPageSkeletonVariant(pathname: string): PageSkeletonVariant {
  const path = (pathname.replace(/\/+$/, '') || '/').split('?')[0];

  if (path === '/chat') return 'chat';
  if (path === '/employee') return 'dashboard-employee';
  if (path === '/admin' || path === '/admin/executive-dashboard') return 'dashboard-admin';

  if (
    path === '/employee/timesheet' ||
    path === '/admin/timesheet' ||
    path === '/admin/employee-timesheets' ||
    path === '/employee/daily-report'
  ) {
    return 'timesheet';
  }

  if (
    path === '/employee/tickets' ||
    path === '/admin/tickets' ||
    path === '/admin/attendance' ||
    path === '/admin/monitoring' ||
    path === '/employee/requisitions' ||
    path === '/admin/requisitions'
  ) {
    return 'stats-table';
  }

  if (
    path === '/employee/documents' ||
    path === '/employee/onboarding' ||
    path === '/admin/documents' ||
    path === '/admin/contracts' ||
    path === '/admin/policies'
  ) {
    return 'documents';
  }

  if (
    path === '/employee/starred' ||
    path === '/employee/saved' ||
    path === '/admin/starred'
  ) {
    return 'cards';
  }

  if (
    path === '/employee/settings' ||
    path === '/admin/settings' ||
    path === '/admin/system-settings' ||
    path === '/admin/permissions' ||
    path === '/employee/download-app' ||
    path.startsWith('/admin/add-employee')
  ) {
    return 'form';
  }

  if (path === '/admin/org-chart') return 'org-chart';

  if (
    path === '/employee/profile' ||
    /^\/employee\/profile\/[^/]+$/.test(path) ||
    path === '/admin/profile' ||
    /^\/admin\/profile\/[^/]+$/.test(path) ||
    /^\/admin\/employee\/[^/]+$/.test(path) ||
    /^\/employee\/documents\/[^/]+$/.test(path) ||
    /^\/admin\/documents\/[^/]+$/.test(path) ||
    /^\/admin\/performance-reviews\/[^/]+$/.test(path)
  ) {
    return 'detail';
  }

  return 'table';
}

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  className?: string;
}

const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'table', className }) => {
  const View = VARIANT_MAP[variant] || TablePageSkeleton;
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading page</span>
      <View />
    </div>
  );
};

export const RoutePageSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  const { pathname } = useLocation();
  return <PageSkeleton variant={getPageSkeletonVariant(pathname)} className={className} />;
};

export default PageSkeleton;
