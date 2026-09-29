import React from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, ClipboardCheck, MessageSquare, CalendarClock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Card from '@/components/ui/Card';
import { PageSkeleton } from '@/components/skeletons';
import { cn } from '@/utils/cn';

type PortalProject = {
  id: string;
  title: string;
  status: string;
  project_type: string;
  progress: number;
  start_date: string | null;
  end_date: string | null;
};

type PortalMilestone = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
};

type PortalApproval = {
  id: string;
  milestone_id: string;
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';
};

function useProjects() {
  return useQuery<PortalProject[]>({
    queryKey: ['portal', 'projects'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    select: (r: any) => r?.payload?.records || [],
  });
}

const StatCard: React.FC<{ label: string; value: number | string; icon: React.ElementType; accent: string }> = ({
  label,
  value,
  icon: Icon,
  accent,
}) => (
  <Card className="flex items-center gap-3 lg:gap-4 !p-3 lg:!p-4">
    <div className={cn('h-9 w-9 lg:h-11 lg:w-11 rounded-xl flex items-center justify-center shrink-0', accent)}>
      <Icon size={18} className="lg:hidden" />
      <Icon size={20} className="hidden lg:block" />
    </div>
    <div className="min-w-0">
      <p className="text-xl lg:text-2xl font-black text-(--color-text-primary) leading-none truncate">{value}</p>
      <p className="text-[11px] lg:text-xs font-semibold text-(--color-text-secondary) mt-1 leading-tight">{label}</p>
    </div>
  </Card>
);

const PortalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const activeProjectIds = (projects || []).map((p) => p.id);

  const milestoneQueries = useQueries({
    queries: activeProjectIds.map((id) => ({
      queryKey: ['portal', 'milestones', id],
      queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MILESTONES(id)),
      select: (r: any) => (r?.payload?.records || []) as PortalMilestone[],
      enabled: !!id,
    })),
  });

  const approvalQueries = useQueries({
    queries: activeProjectIds.map((id) => ({
      queryKey: ['portal', 'approvals', id],
      queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.APPROVALS(id)),
      select: (r: any) => (r?.payload?.records || []) as PortalApproval[],
      enabled: !!id,
    })),
  });

  // Genuinely-unread messages (authored by someone else, since this user's
  // last visit to that project's Communication tab) — not a total message
  // count. See GET /portal/unread-counts / portal_message_reads.
  const { data: unreadCounts } = useQuery({
    queryKey: ['portal', 'unread-counts'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.UNREAD_COUNTS),
    select: (r: any) => (r?.payload || {}) as Record<string, { count: number; last_message_at: string | null }>,
  });
  const messagesUnread = Object.values(unreadCounts || {}).reduce((sum, v) => sum + (v?.count || 0), 0);

  const isLoading = projectsLoading || milestoneQueries.some((q) => q.isLoading) || approvalQueries.some((q) => q.isLoading);

  if (isLoading) return <PageSkeleton />;

  const projectList = projects || [];
  const activeProjects = projectList.filter((p) => p.status !== 'COMPLETED');

  const now = Date.now();
  const upcomingMilestones = milestoneQueries.flatMap((q) => q.data || []).filter(
    (m) => m.due_date && new Date(m.due_date).getTime() > now && m.status !== 'COMPLETED'
  );

  const pendingApprovals = approvalQueries.flatMap((q) => q.data || []).filter((a) => a.status === 'PENDING');

  return (
    <div className="flex flex-col gap-5 lg:gap-6 pb-4 lg:pb-10">
      <div className="hidden lg:block">
        <h1 className="text-2xl font-black text-(--color-text-primary) tracking-tight">Dashboard</h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">Overview of your projects with TekXAI.</p>
      </div>

      {/* ClickUp Home-style tiles: 2×2 on phone, row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
        <StatCard label="Active Projects" value={activeProjects.length} icon={FolderKanban} accent="bg-primary-100 text-primary-600" />
        <StatCard label="Pending Approvals" value={pendingApprovals.length} icon={ClipboardCheck} accent="bg-amber-100 text-amber-600" />
        <StatCard label="Unread Messages" value={messagesUnread ?? 0} icon={MessageSquare} accent="bg-blue-100 text-blue-600" />
        <StatCard label="Upcoming Milestones" value={upcomingMilestones.length} icon={CalendarClock} accent="bg-green-100 text-green-600" />
      </div>

      <Card className="!p-3 lg:!p-5">
        <div className="flex items-center justify-between mb-2 lg:mb-4 px-1">
          <h2 className="text-sm lg:text-base font-bold text-(--color-text-primary)">Spaces</h2>
          <button
            type="button"
            onClick={() => navigate('/portal/projects')}
            className="text-xs font-bold text-primary-600 hover:underline"
          >
            View all
          </button>
        </div>
        {projectList.length === 0 ? (
          <p className="text-sm text-(--color-text-secondary) py-6 text-center">No projects yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-(--color-card-border)">
            {projectList.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/portal/projects/${p.id}`)}
                className="flex items-center justify-between py-3.5 lg:py-4 text-left hover:bg-(--color-state-hover) rounded-xl px-2 -mx-0.5 transition-colors active:bg-(--color-state-hover)"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-bold text-(--color-text-primary) truncate">{p.title}</p>
                  <p className="text-xs text-(--color-text-secondary) mt-0.5">{p.project_type}</p>
                </div>
                <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                  <span className="text-[10px] lg:text-xs font-semibold px-2 py-1 rounded-full bg-(--color-elevated) text-(--color-text-secondary)">
                    {p.status}
                  </span>
                  <span className="text-xs font-bold text-(--color-text-secondary) w-9 text-right">{p.progress}%</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PortalDashboard;
