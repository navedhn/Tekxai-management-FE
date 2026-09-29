import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePortalTopbarStore } from '@/stores/portalTopbarStore';
import {
  MessageSquare,
  FileText as FileIcon,
  CheckSquare,
  List,
  KanbanSquare,
  GanttChartSquare,
  Table2,
  UsersRound,
  Gauge,
  LayoutDashboard,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import Card from '@/components/ui/Card';
import { PageSkeleton } from '@/components/skeletons';
import { useAuth } from '@/hooks/useAuth';
import { PortalProjectDetail, MilestonesView, PortalApproval } from './types';
import MilestonesTab from './tabs/MilestonesTab';
import CommunicationTab from './tabs/CommunicationTab';
import FilesTab from './tabs/FilesTab';
import ApprovalsTab from './tabs/ApprovalsTab';
import ProjectPeopleWidget from './ProjectPeopleWidget';

/** Primary project jobs — Talk / Progress / Approve / Files. */
const PRIMARY_TABS = [
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'progress', label: 'Progress', icon: LayoutDashboard },
  { id: 'approvals', label: 'Approvals', icon: CheckSquare },
  { id: 'files', label: 'Files', icon: FileIcon },
] as const;
type PrimaryTab = typeof PRIMARY_TABS[number]['id'];

const MILESTONE_VIEW_OPTIONS: { id: MilestonesView; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'list', label: 'List', icon: List },
  { id: 'board', label: 'Board', icon: KanbanSquare },
  { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'workload', label: 'Workload', icon: Gauge },
  { id: 'team', label: 'Team', icon: UsersRound },
];

const PortalProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [milestoneView, setMilestoneView] = useState<MilestonesView>('dashboard');

  const activeSlug = location.pathname.split(`/portal/projects/${id}`)[1]?.replace(/^\//, '') ?? '';
  const onMilestonesRoute = activeSlug === 'milestones' || activeSlug === 'overview';
  const page: PrimaryTab = onMilestonesRoute
    ? 'progress'
    : activeSlug === 'files'
      ? 'files'
      : activeSlug === 'approvals'
        ? 'approvals'
        : 'communication';

  const goToPrimary = (t: PrimaryTab) => {
    if (t === 'communication') navigate(`/portal/projects/${id}`);
    else if (t === 'progress') {
      setMilestoneView('dashboard');
      navigate(`/portal/projects/${id}/milestones`);
    } else navigate(`/portal/projects/${id}/${t}`);
  };

  const goToMilestoneView = (v: MilestonesView) => {
    setMilestoneView(v);
    navigate(`/portal/projects/${id}/milestones`);
  };

  const { data: project, isLoading, isError } = useQuery<PortalProjectDetail>({
    queryKey: ['portal', 'project', id],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECT(id!)),
    select: (r: any) => r?.payload,
    enabled: !!id,
    retry: false,
  });

  const { data: approvals = [] } = useQuery<PortalApproval[]>({
    queryKey: ['portal', 'approvals', id],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.APPROVALS(id!)),
    select: (r: any) => r?.payload?.records || [],
    enabled: !!id,
  });
  const pendingApprovalCount = approvals.filter((a) => a.status === 'PENDING').length;

  const setTopbarTitle = usePortalTopbarStore((s) => s.setTitle);
  useEffect(() => {
    setTopbarTitle(project?.title ?? null);
    return () => setTopbarTitle(null);
  }, [project?.title, setTopbarTitle]);

  if (isLoading) return <PageSkeleton />;

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-(--color-text-secondary)">
        <p className="font-semibold text-sm">Project not found</p>
        <p className="text-xs max-w-sm text-center">This project may have been removed, or you no longer have access.</p>
        <button onClick={() => navigate('/portal/projects')} className="text-sm font-bold text-primary-600 hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  const showingProgress = onMilestonesRoute;
  const activeMilestoneView = milestoneView;
  const isCommunication = !showingProgress && page === 'communication';

  const tabBtn = (active: boolean) =>
    cn(
      'px-3 lg:px-5 h-11 lg:h-12 text-[13px] lg:text-[15px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5',
      active ? 'border-primary-600 text-primary-600' : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)'
    );

  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:gap-5',
        isCommunication
          ? 'h-[calc(100dvh-3rem-env(safe-area-inset-top))] lg:h-[calc(100dvh-4rem)] bg-white'
          : 'pb-4 lg:pb-10'
      )}
    >
      <div className={cn('flex items-center gap-2 border-b border-(--color-border) shrink-0', isCommunication && 'px-3 lg:px-6')}>
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0 scrollbar-none">
          {PRIMARY_TABS.map((t) => {
            const active = t.id === 'progress' ? showingProgress : !showingProgress && page === t.id;
            return (
              <button key={t.id} type="button" onClick={() => goToPrimary(t.id)} className={tabBtn(active)}>
                {t.label}
                {t.id === 'approvals' && pendingApprovalCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                    {pendingApprovalCount > 9 ? '9+' : pendingApprovalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {isSuperAdmin && (
          <div className="pb-2 shrink-0 hidden sm:block">
            <ProjectPeopleWidget projectId={project.id} clientId={project.client_id} />
          </div>
        )}
      </div>

      {showingProgress && (
        <div className={cn('flex items-center gap-1 overflow-x-auto scrollbar-none px-1', isCommunication && 'px-3')}>
          {MILESTONE_VIEW_OPTIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => goToMilestoneView(v.id)}
              className={cn(
                'px-3 h-9 rounded-lg text-[12px] font-bold whitespace-nowrap transition-colors inline-flex items-center gap-1.5',
                activeMilestoneView === v.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-(--color-text-secondary) hover:bg-(--color-state-hover)'
              )}
            >
              <v.icon size={14} />
              {v.label}
            </button>
          ))}
        </div>
      )}

      <div className={cn('flex-1 min-h-0 flex flex-col', isCommunication && 'px-3 lg:px-6')}>
        {showingProgress ? (
          <div className="flex flex-col gap-4">
            {activeMilestoneView === 'dashboard' && (
              <Card>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-(--color-text-secondary)">Progress</p>
                    <p className="text-lg font-black text-(--color-text-primary) mt-1">{project.progress}%</p>
                    <div className="h-2 rounded-full bg-(--color-elevated) mt-2 overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-(--color-text-secondary)">Project Manager</p>
                    <p className="font-bold text-(--color-text-primary) mt-1">
                      {project.project_manager ? `${project.project_manager.first_name} ${project.project_manager.last_name}` : 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-(--color-text-secondary)">Current Milestone</p>
                    <p className="font-bold text-(--color-text-primary) mt-1">
                      {project.current_milestone ? project.current_milestone.title : '—'}
                    </p>
                    {project.current_milestone?.due_date && (
                      <p className="text-xs text-(--color-text-secondary) mt-0.5">
                        Due {new Date(project.current_milestone.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-(--color-text-secondary)">Start Date</p>
                    <p className="font-bold text-(--color-text-primary) mt-1">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-(--color-text-secondary)">End Date</p>
                    <p className="font-bold text-(--color-text-primary) mt-1">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              </Card>
            )}
            <MilestonesTab projectId={project.id} view={activeMilestoneView} />
          </div>
        ) : (
          <>
            {page === 'communication' && <CommunicationTab projectId={project.id} />}
            {page === 'files' && <FilesTab projectId={project.id} />}
            {page === 'approvals' && <ApprovalsTab projectId={project.id} />}
          </>
        )}
      </div>
    </div>
  );
};

export default PortalProjectDetailPage;
