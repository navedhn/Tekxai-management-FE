import React, { useMemo, useState } from 'react';
import { useGetProjects, ProjectDetail } from '@/services/projectService';
import { useGetPostSalesDashboard } from '@/services/crmService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import DashboardStatCard from '@/components/ui/DashboardStatCard';
import { Search, FolderKanban, Clock, AlertTriangle, CalendarClock, ShieldAlert, Ban, Users, Milestone as MilestoneIcon, UserX, MessageSquareWarning, UserMinus, UserCheck, Layers, CalendarDays, CalendarX2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getProjectStatusStyle, getProjectStatusLabel } from '@/utils/projectStatus';

const fmt_date = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const humanize_status = (status: string) =>
  status.replace(/_/g, ' ').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

const SectionCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <Card className="p-5 rounded-2xl border border-gray-100 shadow-sm">
    <div className="mb-4">
      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </Card>
);

const HealthTile: React.FC<{ icon: React.ReactNode; label: string; count: number; tone: string; projects: { id: string; title: string }[] }> = ({ icon, label, count, tone, projects }) => (
  <div className="rounded-xl border border-gray-100 p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tone)}>{icon}</div>
      <span className="text-2xl font-black text-gray-900 tabular-nums">{count}</span>
    </div>
    <p className="text-xs font-bold text-gray-500">{label}</p>
    {projects.length > 0 && (
      <ul className="mt-1 space-y-0.5">
        {projects.slice(0, 3).map((p) => (
          <li key={p.id} className="text-[11px] text-gray-400 truncate">{p.title}</li>
        ))}
      </ul>
    )}
  </div>
);

const ListPanel: React.FC<{ icon: React.ReactNode; title: string; items: { key: string; primary: string; secondary?: string }[]; empty: string }> = ({ icon, title, items, empty }) => (
  <div className="flex-1 min-w-[240px]">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <p className="text-xs font-black text-gray-600 uppercase tracking-wide">{title}</p>
    </div>
    {items.length === 0 ? (
      <p className="text-xs text-gray-300 italic">{empty}</p>
    ) : (
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-700 font-medium truncate">{it.primary}</span>
            {it.secondary && <span className="text-gray-400 shrink-0">{it.secondary}</span>}
          </li>
        ))}
      </ul>
    )}
  </div>
);

// Operational KPI cards moved here from the CRM Post-Sales Dashboard (CRM/ERP
// split) — reuses the same useGetPostSalesDashboard hook/endpoint verbatim,
// no duplicated calculations. Only the project/team-operational sections are
// included; client-relationship cards (Active Clients, Client Success) stay
// on the CRM side since they're not operational tracking data.
function OperationalKpis() {
  const { data: d, isLoading } = useGetPostSalesDashboard();
  if (isLoading || !d) return null;

  const { top_kpis, project_health, status_distribution, timeline, resource_overview } = d;
  const max_status = Math.max(1, ...Object.values(status_distribution));
  const max_dept_projects = Math.max(1, ...resource_overview.department_workload.map((x) => x.active_projects));

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-gray-50">
          <DashboardStatCard icon={<FolderKanban size={20} className="text-indigo-600" />} iconClassName="bg-indigo-50" value={top_kpis.active_projects} label="Active Projects" showDivider />
          <DashboardStatCard icon={<Clock size={20} className="text-gray-500" />} iconClassName="bg-gray-100" value={top_kpis.queued_projects} label="Queued Projects" showDivider />
          <DashboardStatCard icon={<AlertTriangle size={20} className="text-red-600" />} iconClassName="bg-red-50" value={top_kpis.overdue_projects} label="Overdue Projects" showDivider />
          <DashboardStatCard icon={<CalendarClock size={20} className="text-orange-600" />} iconClassName="bg-orange-50" value={top_kpis.projects_due_this_week} label="Due This Week" showDivider />
          <DashboardStatCard icon={<ShieldAlert size={20} className="text-rose-600" />} iconClassName="bg-rose-50" value={top_kpis.critical_projects} label="Critical Projects" />
        </div>
      </Card>

      <SectionCard title="Project Health">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <HealthTile icon={<Ban size={16} className="text-gray-600" />} tone="bg-gray-100" label="Blocked Projects" count={project_health.blocked_projects.count} projects={project_health.blocked_projects.projects} />
          <HealthTile icon={<MessageSquareWarning size={16} className="text-blue-600" />} tone="bg-blue-50" label="Waiting for Client" count={project_health.waiting_for_client.count} projects={project_health.waiting_for_client.projects} />
          <HealthTile icon={<Users size={16} className="text-amber-600" />} tone="bg-amber-50" label="Missing Team Members" count={project_health.missing_team_members.count} projects={project_health.missing_team_members.projects} />
          <HealthTile icon={<UserX size={16} className="text-rose-600" />} tone="bg-rose-50" label="Missing Project Manager" count={project_health.missing_project_manager.count} projects={project_health.missing_project_manager.projects} />
          <HealthTile icon={<MilestoneIcon size={16} className="text-purple-600" />} tone="bg-purple-50" label="Missing Milestones" count={project_health.missing_milestones.count} projects={project_health.missing_milestones.projects} />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Project Status Distribution">
          <div className="space-y-2.5">
            {Object.entries(status_distribution).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600 w-32 truncate">{humanize_status(status)}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(count / max_status) * 100}%` }} />
                </div>
                <span className="text-xs font-black text-gray-900 tabular-nums w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Team Capacity" subtitle={`Overload threshold: more than ${resource_overview.team_capacity.overload_threshold} active projects`}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-2xl font-black text-gray-900">{resource_overview.team_capacity.total_employees}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-blue-600">{resource_overview.team_capacity.allocated}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Allocated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-green-600">{resource_overview.team_capacity.available}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 border-t border-gray-100 pt-3">
            <span className="flex items-center gap-1.5"><UserMinus size={13} className="text-red-500" /> {resource_overview.employees_overloaded.count} Overloaded</span>
            <span className="flex items-center gap-1.5"><UserCheck size={13} className="text-green-500" /> {resource_overview.employees_available.count} Available</span>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Milestones & Progress Timeline">
        <div className="flex flex-wrap gap-6">
          <ListPanel
            icon={<CalendarDays size={14} className="text-blue-500" />}
            title="Upcoming Due Dates"
            empty="Nothing due soon."
            items={timeline.upcoming_due_dates.map((p) => ({ key: p.id, primary: p.title, secondary: fmt_date(p.end_date) }))}
          />
          <ListPanel
            icon={<CalendarX2 size={14} className="text-red-500" />}
            title="Overdue Due Dates"
            empty="Nothing overdue."
            items={timeline.overdue_due_dates.map((p) => ({ key: p.id, primary: p.title, secondary: fmt_date(p.end_date) }))}
          />
          <ListPanel
            icon={<MilestoneIcon size={14} className="text-purple-500" />}
            title="Upcoming Milestones"
            empty="No upcoming milestones."
            items={timeline.upcoming_milestones.map((m) => ({ key: m.id, primary: `${m.title} — ${m.project.title}`, secondary: fmt_date(m.due_date) }))}
          />
          <ListPanel
            icon={<CheckCircle2 size={14} className="text-green-500" />}
            title="Recently Completed Projects"
            empty="No recently completed projects."
            items={timeline.recently_completed_projects.map((p) => ({ key: p.id, primary: p.title, secondary: fmt_date(p.completed_at) }))}
          />
        </div>
      </SectionCard>

      <SectionCard title="Resource Overview" subtitle="Employee allocation across active projects">
        <div className="space-y-3 mb-5">
          {resource_overview.department_workload.map((dept) => (
            <div key={dept.department} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600 w-36 truncate">{dept.department}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.min(100, (dept.active_projects / max_dept_projects) * 100)}%` }} />
              </div>
              <span className="text-xs font-black text-gray-900 tabular-nums w-24 text-right">{dept.active_projects} proj · {dept.employee_count} emp</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-black text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Layers size={13} /> Employee Allocation</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {resource_overview.employee_allocation.slice(0, 10).map((e) => (
              <li key={e.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate">{e.name}</span>
                <span className={cn('font-bold tabular-nums', e.active_projects > resource_overview.team_capacity.overload_threshold ? 'text-red-500' : 'text-gray-400')}>{e.active_projects}</span>
              </li>
            ))}
          </ul>
        </div>
      </SectionCard>
    </div>
  );
}

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

      <OperationalKpis />

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
