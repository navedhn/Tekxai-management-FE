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
  project_id?: string;
};

type PortalApproval = {
  id: string;
  milestone_id: string;
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';
  milestone_title?: string | null;
};

function useProjects() {
  return useQuery<PortalProject[]>({
    queryKey: ['portal', 'projects'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    select: (r: any) => r?.payload?.records || [],
  });
}

const ActionCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
  onClick?: () => void;
  hint?: string;
}> = ({ label, value, icon: Icon, accent, onClick, hint }) => {
  const interactive = typeof onClick === 'function';
  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 lg:gap-4 p-3 lg:p-4 text-left w-full rounded-2xl border border-(--color-card-border) bg-(--color-surface) shadow-sm',
          'hover:bg-(--color-state-hover) active:scale-[0.99] transition-colors cursor-pointer'
        )}
      >
        <div className={cn('h-9 w-9 lg:h-11 lg:w-11 rounded-xl flex items-center justify-center shrink-0', accent)}>
          <Icon size={18} className="lg:hidden" />
          <Icon size={20} className="hidden lg:block" />
        </div>
        <div className="min-w-0">
          <p className="text-xl lg:text-2xl font-black text-(--color-text-primary) leading-none truncate">{value}</p>
          <p className="text-[11px] lg:text-xs font-semibold text-(--color-text-secondary) mt-1 leading-tight">{label}</p>
          {hint && Number(value) > 0 && (
            <p className="text-[10px] font-bold text-primary-600 mt-0.5">{hint}</p>
          )}
        </div>
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 text-left w-full rounded-2xl border border-(--color-card-border) bg-(--color-surface) shadow-sm">
      <div className={cn('h-9 w-9 lg:h-11 lg:w-11 rounded-xl flex items-center justify-center shrink-0', accent)}>
        <Icon size={18} className="lg:hidden" />
        <Icon size={20} className="hidden lg:block" />
      </div>
      <div className="min-w-0">
        <p className="text-xl lg:text-2xl font-black text-(--color-text-primary) leading-none truncate">{value}</p>
        <p className="text-[11px] lg:text-xs font-semibold text-(--color-text-secondary) mt-1 leading-tight">{label}</p>
      </div>
    </div>
  );
};

const PortalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const activeProjectIds = (projects || []).map((p) => p.id);

  const milestoneQueries = useQueries({
    queries: activeProjectIds.map((id) => ({
      queryKey: ['portal', 'milestones', id],
      queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MILESTONES(id)),
      select: (r: any) =>
        ((r?.payload?.records || []) as PortalMilestone[]).map((m) => ({ ...m, project_id: id })),
      enabled: !!id,
    })),
  });

  const approvalQueries = useQueries({
    queries: activeProjectIds.map((id) => ({
      queryKey: ['portal', 'approvals', id],
      queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.APPROVALS(id)),
      select: (r: any) =>
        ((r?.payload?.records || []) as PortalApproval[]).map((a) => ({ ...a, project_id: id } as PortalApproval & { project_id: string })),
      enabled: !!id,
    })),
  });

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
  const upcomingMilestones = milestoneQueries
    .flatMap((q) => q.data || [])
    .filter((m) => m.due_date && new Date(m.due_date).getTime() > now && m.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  const pendingApprovals = approvalQueries
    .flatMap((q) => q.data || [])
    .filter((a) => a.status === 'PENDING') as (PortalApproval & { project_id: string })[];

  const firstUnreadProjectId = Object.entries(unreadCounts || {}).find(([, v]) => (v?.count || 0) > 0)?.[0];
  const firstPendingApproval = pendingApprovals[0];
  const nextMilestone = upcomingMilestones[0];

  const goPendingApprovals = () => {
    if (firstPendingApproval?.project_id) {
      navigate(`/portal/projects/${firstPendingApproval.project_id}/approvals`);
    } else if (activeProjects[0]) {
      navigate(`/portal/projects/${activeProjects[0].id}/approvals`);
    } else {
      navigate('/portal/projects');
    }
  };

  const goUnread = () => {
    if (firstUnreadProjectId) {
      navigate(`/portal/projects/${firstUnreadProjectId}/communication`);
    } else {
      navigate('/portal/projects');
    }
  };

  const goNextMilestone = () => {
    if (nextMilestone?.project_id) {
      navigate(`/portal/projects/${nextMilestone.project_id}/milestones`);
    } else if (activeProjects[0]) {
      navigate(`/portal/projects/${activeProjects[0].id}/milestones`);
    } else {
      navigate('/portal/projects');
    }
  };

  return (
    <div className="flex flex-col gap-5 lg:gap-6 pb-4 lg:pb-10">
      <div className="hidden lg:block">
        <h1 className="text-2xl font-black text-(--color-text-primary) tracking-tight">Home</h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">What needs your attention, and where to go next.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
        <ActionCard
          label="Active Projects"
          value={activeProjects.length}
          icon={FolderKanban}
          accent="bg-primary-100 text-primary-600"
          onClick={() => navigate('/portal/projects')}
          hint="Browse projects"
        />
        <ActionCard
          label="Pending Approvals"
          value={pendingApprovals.length}
          icon={ClipboardCheck}
          accent="bg-amber-100 text-amber-600"
          onClick={goPendingApprovals}
          hint="Review now"
        />
        <ActionCard
          label="Unread Messages"
          value={messagesUnread ?? 0}
          icon={MessageSquare}
          accent="bg-blue-100 text-blue-600"
          onClick={goUnread}
          hint="Open chat"
        />
        <ActionCard
          label="Upcoming Milestones"
          value={upcomingMilestones.length}
          icon={CalendarClock}
          accent="bg-green-100 text-green-600"
          onClick={goNextMilestone}
          hint="View progress"
        />
      </div>

      <Card className="!p-3 lg:!p-5">
        <div className="flex items-center justify-between mb-2 lg:mb-4 px-1">
          <h2 className="text-sm lg:text-base font-bold text-(--color-text-primary)">Projects</h2>
          <button
            type="button"
            onClick={() => navigate('/portal/projects')}
            className="text-xs font-bold text-primary-600 hover:underline min-h-11 px-2"
          >
            View all
          </button>
        </div>
        {projectList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
            <FolderKanban size={32} className="text-(--color-text-secondary) opacity-50" strokeWidth={1.5} />
            <p className="font-bold text-sm text-(--color-text-primary)">No projects yet</p>
            <p className="text-sm text-(--color-text-secondary) max-w-sm">
              When TekXAI invites you to a project, it will show up here so you can chat, approve milestones, and find shared files.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-(--color-card-border)">
            {projectList.map((p) => {
              const unread = unreadCounts?.[p.id]?.count || 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/portal/projects/${p.id}`)}
                  className="flex items-center justify-between py-3.5 lg:py-4 text-left hover:bg-(--color-state-hover) rounded-xl px-2 -mx-0.5 transition-colors active:bg-(--color-state-hover)"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-bold text-(--color-text-primary) truncate">{p.title}</p>
                    <p className="text-xs text-(--color-text-secondary) mt-0.5">{p.project_type}</p>
                  </div>
                  <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                    {unread > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-black flex items-center justify-center">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                    <span className="text-[10px] lg:text-xs font-semibold px-2 py-1 rounded-full bg-(--color-elevated) text-(--color-text-secondary)">
                      {p.status}
                    </span>
                    <span className="text-xs font-bold text-(--color-text-secondary) w-9 text-right">{p.progress}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PortalDashboard;
