import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePortalTopbarStore } from '@/stores/portalTopbarStore';
import { MessageSquare, FileText as FileIcon, CheckSquare, List, KanbanSquare, GanttChartSquare, Table2, UsersRound, Gauge } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import Card from '@/components/ui/Card';
import { PageSkeleton } from '@/components/skeletons';
import { PortalProjectDetail, MilestonesView } from './types';
import MilestonesTab from './tabs/MilestonesTab';
import CommunicationTab from './tabs/CommunicationTab';
import FilesTab from './tabs/FilesTab';
import ApprovalsTab from './tabs/ApprovalsTab';

// Communication/Files/Approvals are their own pages (URL-routed, as
// before); Dashboard/List/Board/Timeline/Table/Workload/Team are all
// views of the same milestones data, switched via local state rather
// than the URL. The two kinds are interleaved into one ordered tab row
// below — Dashboard sits second, right after Communication.
const PAGE_TABS = [
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'files', label: 'Files', icon: FileIcon },
  { id: 'approvals', label: 'Approvals', icon: CheckSquare },
] as const;
type PageTab = typeof PAGE_TABS[number]['id'];

const pageSlug: Record<PageTab, string> = {
  communication: '',
  files: 'files',
  approvals: 'approvals',
};

const MILESTONE_VIEW_OPTIONS: { id: MilestonesView; label: string; icon: React.ElementType }[] = [
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
  const [milestoneView, setMilestoneView] = useState<MilestonesView>('dashboard');

  const activeSlug = location.pathname.split(`/portal/projects/${id}`)[1]?.replace(/^\//, '') ?? '';
  // Any milestone-view tab shares the same "milestones" URL slug — the
  // specific view is local state (milestoneView), not part of the route.
  const onMilestonesRoute = activeSlug === 'milestones';
  const page: PageTab = onMilestonesRoute
    ? 'communication' // unused while showingMilestones is true, needs a valid fallback
    : (Object.keys(pageSlug) as PageTab[]).find((t) => pageSlug[t] === activeSlug) ?? 'communication';

  const goToPage = (t: PageTab) => navigate(`/portal/projects/${id}${pageSlug[t] ? `/${pageSlug[t]}` : ''}`);
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
        <button onClick={() => navigate('/portal/projects')} className="text-sm font-bold text-primary-600 hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  const showingMilestones = onMilestonesRoute;
  const activeMilestoneView = milestoneView;

  return (
    <div className="flex flex-col gap-6 pb-10 h-[calc(100vh-114px)]">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-(--color-border) shrink-0">
        <button
          onClick={() => goToPage('communication')}
          className={cn(
            'px-4 h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
            !showingMilestones && page === 'communication' ? 'border-primary-600 text-primary-600' : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)'
          )}
        >
          Communication
        </button>
        <button
          onClick={() => goToMilestoneView('dashboard')}
          className={cn(
            'px-4 h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
            showingMilestones && activeMilestoneView === 'dashboard' ? 'border-primary-600 text-primary-600' : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)'
          )}
        >
          Dashboard
        </button>
        {PAGE_TABS.filter((t) => t.id !== 'communication').map((t) => (
          <button
            key={t.id}
            onClick={() => goToPage(t.id)}
            className={cn(
              'px-4 h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
              !showingMilestones && page === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)'
            )}
          >
            {t.label}
          </button>
        ))}
        {MILESTONE_VIEW_OPTIONS.map((v) => (
          <button
            key={v.id}
            onClick={() => goToMilestoneView(v.id)}
            className={cn(
              'px-4 h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
              showingMilestones && activeMilestoneView === v.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {showingMilestones ? (
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
