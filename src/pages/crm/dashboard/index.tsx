import React from 'react';
import { useGetPostSalesDashboard } from '@/services/crmService';
import Card from '@/components/ui/Card';
import DashboardStatCard from '@/components/ui/DashboardStatCard';
import { cn } from '@/utils/cn';
import {
  Building2, FolderKanban, Clock, CheckCircle2, AlertTriangle, CalendarClock,
  ShieldAlert, Ban, Users, Milestone, UserX, MessageSquareWarning,
  CalendarDays, CalendarX2, Activity, UserCheck, UserMinus, Layers, Smile,
} from 'lucide-react';

const fmt_date = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const humanize_status = (status: string) =>
  status.replace(/_/g, ' ').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

// ── Small building blocks ───────────────────────────────────────────────────
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

// ── Page ─────────────────────────────────────────────────────────────────────
const CRMDashboard: React.FC = () => {
  const { data: d, isLoading } = useGetPostSalesDashboard();

  if (isLoading || !d) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const { top_kpis, project_health, status_distribution, timeline, resource_overview, client_success } = d;
  const max_status = Math.max(1, ...Object.values(status_distribution));
  const max_dept_projects = Math.max(1, ...resource_overview.department_workload.map((x) => x.active_projects));

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Post-Sales Dashboard</h1>
        <p className="text-sm text-gray-500 font-medium">Client delivery, project health, and team resourcing at a glance.</p>
      </div>

      {/* Top KPIs */}
      <Card className="p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-50">
          <DashboardStatCard icon={<Building2 size={20} className="text-blue-600" />} iconClassName="bg-blue-50" value={top_kpis.active_clients} label="Active Clients" showDivider />
          <DashboardStatCard icon={<FolderKanban size={20} className="text-indigo-600" />} iconClassName="bg-indigo-50" value={top_kpis.active_projects} label="Active Projects" showDivider />
          <DashboardStatCard icon={<Clock size={20} className="text-gray-500" />} iconClassName="bg-gray-100" value={top_kpis.queued_projects} label="Queued Projects" showDivider />
          <DashboardStatCard icon={<CheckCircle2 size={20} className="text-green-600" />} iconClassName="bg-green-50" value={top_kpis.completed_projects} label="Completed Projects" showDivider />
          <DashboardStatCard icon={<AlertTriangle size={20} className="text-red-600" />} iconClassName="bg-red-50" value={top_kpis.overdue_projects} label="Overdue Projects" showDivider />
          <DashboardStatCard icon={<CalendarClock size={20} className="text-orange-600" />} iconClassName="bg-orange-50" value={top_kpis.projects_due_this_week} label="Due This Week" />
        </div>
      </Card>

      {/* Project Health */}
      <SectionCard title="Project Health">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <HealthTile icon={<ShieldAlert size={16} className="text-red-600" />} tone="bg-red-50" label="Critical Projects" count={project_health.critical_projects.count} projects={project_health.critical_projects.projects} />
          <HealthTile icon={<Ban size={16} className="text-gray-600" />} tone="bg-gray-100" label="Blocked Projects" count={project_health.blocked_projects.count} projects={project_health.blocked_projects.projects} />
          <HealthTile icon={<Users size={16} className="text-amber-600" />} tone="bg-amber-50" label="Missing Team Members" count={project_health.missing_team_members.count} projects={project_health.missing_team_members.projects} />
          <HealthTile icon={<Milestone size={16} className="text-purple-600" />} tone="bg-purple-50" label="Missing Milestones" count={project_health.missing_milestones.count} projects={project_health.missing_milestones.projects} />
          <HealthTile icon={<UserX size={16} className="text-rose-600" />} tone="bg-rose-50" label="Missing Project Manager" count={project_health.missing_project_manager.count} projects={project_health.missing_project_manager.projects} />
          <HealthTile icon={<MessageSquareWarning size={16} className="text-blue-600" />} tone="bg-blue-50" label="Waiting for Client Response" count={project_health.waiting_for_client_response.count} projects={project_health.waiting_for_client_response.projects} />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
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

        {/* Team Capacity */}
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

      {/* Timeline */}
      <SectionCard title="Timeline">
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
            icon={<Milestone size={14} className="text-purple-500" />}
            title="Upcoming Milestones"
            empty="No upcoming milestones."
            items={timeline.upcoming_milestones.map((m) => ({ key: m.id, primary: `${m.title} — ${m.project.title}`, secondary: fmt_date(m.due_date) }))}
          />
          <ListPanel
            icon={<Milestone size={14} className="text-red-500" />}
            title="Overdue Milestones"
            empty="No overdue milestones."
            items={timeline.overdue_milestones.map((m) => ({ key: m.id, primary: `${m.title} — ${m.project.title}`, secondary: fmt_date(m.due_date) }))}
          />
          <ListPanel
            icon={<Activity size={14} className="text-gray-400" />}
            title="No Activity (7+ Days)"
            empty="All projects have recent activity."
            items={timeline.projects_with_no_activity.map((p) => ({ key: p.id, primary: p.title, secondary: fmt_date(p.last_updated) }))}
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Overview */}
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

        {/* Client Success */}
        <SectionCard title="Client Success">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="text-xl font-black text-gray-900">{client_success.clients_with_active_projects}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clients w/ Active Projects</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="text-xl font-black text-blue-600">{client_success.clients_waiting_for_feedback}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Waiting for Feedback</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="text-xl font-black text-amber-600">{client_success.projects_waiting_for_client}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Projects Waiting on Client</div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3 flex items-center gap-2">
              <Smile size={18} className="text-gray-300" />
              <div>
                <div className="text-sm font-black text-gray-400">{client_success.client_satisfaction ?? 'No data'}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client Satisfaction</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-black text-gray-600 uppercase tracking-wide mb-2">Recent Client Activity</p>
            {client_success.recent_client_activity.length === 0 ? (
              <p className="text-xs text-gray-300 italic">No recent client updates logged.</p>
            ) : (
              <ul className="space-y-2">
                {client_success.recent_client_activity.slice(0, 6).map((a) => (
                  <li key={a.id} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 truncate">{a.project.title}</span>
                      <span className="text-gray-400 shrink-0">{fmt_date(a.update_date)}</span>
                    </div>
                    <p className="text-gray-500 truncate">{a.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default CRMDashboard;
