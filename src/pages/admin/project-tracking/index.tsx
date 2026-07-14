import React, { useMemo, useState } from 'react';
import { useGetProjects, ProjectDetail } from '@/services/projectService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getProjectStatusStyle, getProjectStatusLabel } from '@/utils/projectStatus';

// Project Tracking Dashboard — a read-only view over the operational tracking
// sheet's columns. Every field here is reused verbatim from the existing
// GET /project response (normalize_project in projects.repository.js) — no
// new endpoint, no new table, no recomputation. The only backend change this
// page required was surfacing the already-joined devops_access row (Point of
// Communication / Progress Shared / access statuses) that was previously
// computed into access_completion_score but never returned.

const ACCESS_BADGE: Record<string, string> = {
  GRANTED: 'bg-green-50 text-green-700',
  PENDING: 'bg-amber-50 text-amber-700',
  LIMITED: 'bg-amber-50 text-amber-700',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-400',
};

const PROGRESS_SHARED_BADGE: Record<string, string> = {
  NOT_SHARED: 'bg-gray-100 text-gray-500',
  SHARED: 'bg-blue-50 text-blue-600',
  AWAITING_FEEDBACK: 'bg-amber-50 text-amber-700',
  CLIENT_APPROVED: 'bg-green-50 text-green-700',
};

function AccessBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-xs text-gray-300">—</span>;
  return (
    <span className={cn('text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wide', ACCESS_BADGE[status] || 'bg-gray-100 text-gray-500')}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function namesFor(members: ProjectDetail['members'], role: string): string {
  const names = (members || [])
    .filter((m: any) => m.role === role)
    .map((m: any) => `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email);
  return names.length ? names.join(', ') : '—';
}

export default function ProjectTrackingDashboard() {
  const { data: projects, isLoading } = useGetProjects({ limit: 1000 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.client_name || '').toLowerCase().includes(q)
    );
  }, [projects, search]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const columns: Column<ProjectDetail>[] = [
    { header: 'Client', key: 'client_name', render: (p) => <span className="font-semibold text-gray-700">{p.client_name || '—'}</span> },
    { header: 'Project', key: 'title', render: (p) => <span className="font-bold text-gray-900">{p.title}</span> },
    { header: 'Dev Status', key: 'dev_status', render: (p) => <span className="text-gray-600 text-xs">{p.dev_status || '—'}</span> },
    {
      header: 'Active Milestone',
      key: 'current_milestone',
      render: (p) => p.current_milestone
        ? <span className="text-xs text-gray-700">{p.current_milestone.title}</span>
        : <span className="text-xs text-gray-300">—</span>,
    },
    { header: 'Pending Milestones', key: 'pending_milestones_count', render: (p) => <span className="text-xs font-bold text-gray-600">{p.pending_milestones_count ?? 0}</span> },
    {
      header: 'Delivery Date',
      key: 'end_date',
      render: (p) => (
        <span className={cn('text-xs whitespace-nowrap', p.is_overdue ? 'text-red-600 font-bold' : 'text-gray-600')}>
          {p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      header: 'Current Status',
      key: 'status',
      render: (p) => (
        <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide', getProjectStatusStyle(p.status))}>
          {getProjectStatusLabel(p.status)}
        </span>
      ),
    },
    { header: 'Frontend Dev(s)', key: 'members', render: (p) => <span className="text-xs text-gray-600">{namesFor(p.members, 'FRONTEND')}</span> },
    { header: 'Backend Dev(s)', key: 'members', render: (p) => <span className="text-xs text-gray-600">{namesFor(p.members, 'BACKEND')}</span> },
    {
      header: 'Team Lead',
      key: 'team_leader',
      render: (p) => p.team_leader
        ? <span className="text-xs font-semibold text-gray-700">{`${p.team_leader.first_name} ${p.team_leader.last_name || ''}`.trim()}</span>
        : <span className="text-xs text-gray-300">—</span>,
    },
    {
      header: 'Progress',
      key: 'progress',
      render: (p) => (
        <div className="flex items-center gap-2 w-24">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${p.progress || 0}%` }} />
          </div>
          <span className="text-[11px] font-bold text-gray-500 w-8 text-right">{p.progress || 0}%</span>
        </div>
      ),
    },
    {
      header: 'Point of Communication',
      key: 'devops_access',
      render: (p) => <span className="text-xs text-gray-600">{p.devops_access?.point_of_communication?.replace(/_/g, ' ') || '—'}</span>,
    },
    {
      header: 'Progress Shared',
      key: 'devops_access',
      render: (p) => {
        const status = p.devops_access?.progress_shared_status;
        if (!status) return <span className="text-xs text-gray-300">—</span>;
        return (
          <span className={cn('text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wide', PROGRESS_SHARED_BADGE[status] || 'bg-gray-100 text-gray-500')}>
            {status.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    { header: 'Git', key: 'devops_access', render: (p) => <AccessBadge status={p.devops_access?.git_access_status} /> },
    { header: 'Server', key: 'devops_access', render: (p) => <AccessBadge status={p.devops_access?.server_access_status} /> },
    { header: 'Domain', key: 'devops_access', render: (p) => <AccessBadge status={p.devops_access?.domain_access_status} /> },
    { header: 'Email/SMTP', key: 'devops_access', render: (p) => <AccessBadge status={p.devops_access?.email_smtp_access_status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Project Tracking Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Operational tracking sheet, sourced live from existing project data — nothing here is a separate record.</p>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by project or client…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-10 pl-9 rounded-xl"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              data={paged}
              emptyMessage="No projects found"
              pagination={{
                currentPage: page,
                totalPages: Math.max(1, Math.ceil(filtered.length / perPage)),
                onPageChange: setPage,
                totalEntries: filtered.length,
                entriesPerPage: perPage,
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
