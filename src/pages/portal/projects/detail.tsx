import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, LayoutDashboard, ListChecks, FileText as FileIcon, CheckSquare, List, KanbanSquare, GanttChartSquare, Table2, UsersRound, Gauge } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import Card from '@/components/ui/Card';
import { PageSkeleton } from '@/components/skeletons';
import { PortalProjectDetail, MilestonesView } from './types';
import MilestonesTab from './tabs/MilestonesTab';
import UpdatesTab from './tabs/UpdatesTab';
import CommunicationTab from './tabs/CommunicationTab';
import FilesTab from './tabs/FilesTab';
import ApprovalsTab from './tabs/ApprovalsTab';

// One flat tab row — Communication/Updates/Files/Approvals are their own
// pages (URL-routed, as before); Dashboard/List/Board/Timeline/Table/
// Workload/Team are all views of the same milestones data, switched via
// local state rather than the URL (same as before this merge, just no
// longer nested inside a second row under a separate "Milestones" tab).
// "Overview" (start/end date) is folded into Dashboard rather than kept
// as its own tab — there is no standalone Milestones tab now; every one
// of its views already has a direct top-level entry.
const PAGE_TABS = [
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'updates', label: 'Updates', icon: ListChecks },
  { id: 'files', label: 'Files', icon: FileIcon },
  { id: 'approvals', label: 'Approvals', icon: CheckSquare },
] as const;
type PageTab = typeof PAGE_TABS[number]['id'];

const pageSlug: Record<PageTab, string> = {
  communication: '',
  updates: 'updates',
  files: 'files',
  approvals: 'approvals',
};

const MILESTONE_VIEW_OPTIONS: { id: MilestonesView; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <button onClick={() => navigate('/portal/projects')} className="text-xs font-semibold text-(--color-text-secondary) hover:text-primary-600 mb-2">
          ← Back to Projects
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-(--color-text-primary) tracking-tight">{project.title}</h1>
            <p className="text-sm text-(--color-text-secondary) mt-1">{project.project_type}</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-(--color-elevated) text-(--color-text-secondary)">
            {project.status}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-(--color-border)">
        {PAGE_TABS.map((t) => (
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

      <div>
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
            {page === 'updates' && <UpdatesTab projectId={project.id} />}
            {page === 'files' && <FilesTab projectId={project.id} />}
            {page === 'approvals' && <ApprovalsTab projectId={project.id} />}
          </>
        )}
      </div>
    </div>
  );
};

export default PortalProjectDetailPage;
