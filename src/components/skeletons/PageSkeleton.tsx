import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import Skeleton from './skeleton';
import TableSkeleton from './TableSkeleton';
import StatSkeleton from './StatSkeleton';
import CardSkeleton from './CardSkeleton';

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

const CHART_BARS = [40, 65, 45, 80, 55, 70, 35, 90, 50, 75, 60, 42];

function Surface({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm', className)}>
      {children}
    </div>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={180} height={28} />
        <Skeleton variant="text" width={260} height={14} />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton variant="rectangular" width={220} height={40} className="rounded-xl" />
        <Skeleton variant="rectangular" width={96} height={40} className="rounded-xl" />
      </div>
    </div>
  );
}

function StatsStrip({ count }: { count: number }) {
  return (
    <div className="p-3 rounded-[8px] bg-white">
      <div
        className={cn(
          'bg-[#F8F8F8] grid gap-3 py-4',
          count <= 3 ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function ChartBlock({ className }: { className?: string }) {
  return (
    <Surface className={cn('p-6 flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width={160} height={20} />
        <Skeleton variant="rectangular" width={88} height={32} className="rounded-lg" />
      </div>
      <div className="flex items-end justify-between gap-2 h-48 px-1">
        {CHART_BARS.map((h, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            width="7%"
            height={`${h}%`}
            className="rounded-t-lg"
          />
        ))}
      </div>
    </Surface>
  );
}

function DashboardEmployeeSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={88} className="rounded-lg" />
        ))}
      </div>

      <Skeleton variant="rectangular" height={72} className="rounded-lg" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton variant="rectangular" height={220} className="rounded-lg" />
        <Skeleton variant="rectangular" height={220} className="rounded-lg" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={44} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function DashboardAdminSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <StatsStrip count={5} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartBlock className="lg:col-span-2 border-none" />
        <Surface className="p-6 flex flex-col gap-4 border-none">
          <Skeleton variant="text" width={180} height={20} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton variant="rectangular" width={36} height={36} className="rounded-lg" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton variant="text" width="80%" height={14} />
                <Skeleton variant="text" width="60%" height={12} />
              </div>
            </div>
          ))}
        </Surface>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Surface key={i} className="p-6 flex flex-col gap-4 border-none">
            <Skeleton variant="text" width={150} height={20} />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton variant="circular" width={36} height={36} />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton variant="text" width="70%" height={14} />
                  <Skeleton variant="text" width="40%" height={12} />
                </div>
              </div>
            ))}
          </Surface>
        ))}
      </div>
    </div>
  );
}

function TablePageSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <ToolbarSkeleton />
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}

function StatsTableSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <ToolbarSkeleton />
      <StatsStrip count={4} />
      <Surface className="p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col gap-4">
          <Skeleton variant="rectangular" width={320} height={36} className="rounded-lg" />
          <Skeleton variant="rectangular" width={256} height={40} className="rounded-xl" />
        </div>
        <div className="p-2">
          <TableSkeleton rows={8} columns={6} />
        </div>
      </Surface>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="text" width={180} height={28} />
      </div>
      <Surface className="p-6 flex flex-col sm:flex-row gap-6 items-start">
        <Skeleton variant="circular" width={96} height={96} />
        <div className="flex-1 flex flex-col gap-3 w-full">
          <Skeleton variant="text" width={220} height={24} />
          <Skeleton variant="text" width={180} height={14} />
          <div className="grid grid-cols-2 gap-4 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton variant="text" width={80} height={10} />
                <Skeleton variant="text" width="70%" height={16} />
              </div>
            ))}
          </div>
        </div>
      </Surface>
      <Skeleton variant="rectangular" width={360} height={40} className="rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Surface className="p-6 flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton variant="text" width={100} height={10} />
              <Skeleton variant="text" width="80%" height={16} />
            </div>
          ))}
        </Surface>
        <Surface className="p-6 flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton variant="text" width={100} height={10} />
              <Skeleton variant="text" width="75%" height={16} />
            </div>
          ))}
        </Surface>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Surface className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton variant="rectangular" width={64} height={64} className="rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton variant="text" width={120} height={16} />
            <Skeleton variant="text" width={160} height={12} />
          </div>
        </div>
        <Skeleton variant="rectangular" width={140} height={40} className="rounded-xl" />
      </Surface>
      {Array.from({ length: 2 }).map((_, i) => (
        <Surface key={i} className="p-6 flex flex-col gap-5">
          <Skeleton variant="text" width={160} height={20} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex flex-col gap-2">
                <Skeleton variant="text" width={100} height={12} />
                <Skeleton variant="rectangular" height={44} className="rounded-xl" />
              </div>
            ))}
          </div>
        </Surface>
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <Skeleton variant="text" width={220} height={32} />
      <Skeleton variant="rectangular" width={360} height={40} className="rounded-lg" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function TimesheetSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={180} height={32} />
        <Skeleton variant="text" width={240} height={14} />
      </div>
      <Surface className="p-6 flex flex-wrap items-center gap-8 border-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 min-w-[120px]">
            <Skeleton variant="text" width={90} height={10} />
            <Skeleton variant="text" width={140} height={16} />
          </div>
        ))}
      </Surface>
      <Skeleton variant="rectangular" width={420} height={40} className="rounded-lg" />
      <Surface className="p-4 flex flex-col gap-4 border-none">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={200} height={22} />
          <div className="flex gap-2">
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="rectangular" width={88} height={32} className="rounded-lg" />
            <Skeleton variant="circular" width={32} height={32} />
          </div>
        </div>
        <TableSkeleton rows={7} columns={6} />
      </Surface>
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={200} height={28} />
        <Skeleton variant="text" width={280} height={14} />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Surface key={i} className="p-6 flex flex-col gap-4 border-none">
          <div className="flex items-center gap-3">
            <Skeleton variant="rectangular" width={40} height={40} className="rounded-xl" />
            <Skeleton variant="text" width={160} height={20} />
          </div>
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex items-center justify-between py-2">
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton variant="text" width="55%" height={16} />
                <Skeleton variant="text" width="30%" height={12} />
              </div>
              <Skeleton variant="rectangular" width={88} height={28} className="rounded-lg" />
            </div>
          ))}
        </Surface>
      ))}
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-var(--spacing-topbar))] bg-white overflow-hidden">
      <div className="w-16 border-r border-gray-100 flex flex-col items-center gap-3 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="circular" width={40} height={40} />
        ))}
      </div>
      <div className="w-72 border-r border-gray-100 p-4 flex flex-col gap-3">
        <Skeleton variant="rectangular" height={36} className="rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={44} className="rounded-lg" />
        ))}
      </div>
      <div className="flex-1 flex flex-col p-6 gap-4">
        <Skeleton variant="text" width={180} height={20} />
        <div className="flex-1 flex flex-col gap-4 justify-end">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={i % 2 === 0 ? '45%' : '38%'}
              height={56}
              className={cn('rounded-2xl', i % 2 === 0 ? 'self-start' : 'self-end')}
            />
          ))}
        </div>
        <Skeleton variant="rectangular" height={48} className="rounded-xl" />
      </div>
    </div>
  );
}

function OrgChartSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={240} height={28} />
        <Skeleton variant="text" width={360} height={14} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <Surface className="p-6 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3" style={{ paddingLeft: `${(i % 3) * 24}px` }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="text" width={160} height={14} />
          </div>
        ))}
      </Surface>
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
    path === '/admin/employee-timesheets'
  ) {
    return 'timesheet';
  }

  if (
    path === '/employee/tickets' ||
    path === '/admin/tickets' ||
    path === '/admin/attendance' ||
    path === '/admin/monitoring'
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
