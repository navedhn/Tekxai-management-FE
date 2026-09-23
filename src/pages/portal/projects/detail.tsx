import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import Card from '@/components/ui/Card';
import { PageSkeleton } from '@/components/skeletons';
import { PortalProjectDetail } from './types';
import MilestonesTab from './tabs/MilestonesTab';
import UpdatesTab from './tabs/UpdatesTab';
import CommunicationTab from './tabs/CommunicationTab';
import FilesTab from './tabs/FilesTab';
import ApprovalsTab from './tabs/ApprovalsTab';

// Communication is the first/default tab — clients land straight on the
// conversation with the TekXAI team rather than a static overview.
const TABS = ['Communication', 'Overview', 'Milestones', 'Updates', 'Files', 'Approvals'] as const;
type Tab = typeof TABS[number];

const tabSlug: Record<Tab, string> = {
  Communication: '',
  Overview: 'overview',
  Milestones: 'milestones',
  Updates: 'updates',
  Files: 'files',
  Approvals: 'approvals',
};

const PortalProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const activeSlug = location.pathname.split(`/portal/projects/${id}`)[1]?.replace(/^\//, '') ?? '';
  const tab: Tab = (Object.keys(tabSlug) as Tab[]).find((t) => tabSlug[t] === activeSlug) ?? 'Communication';

  const goToTab = (t: Tab) => navigate(`/portal/projects/${id}${tabSlug[t] ? `/${tabSlug[t]}` : ''}`);

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

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-semibold text-(--color-text-secondary)">Progress</p>
            <p className="text-lg font-black text-(--color-text-primary) mt-1">{project.progress}%</p>
            <div className="h-2 rounded-full bg-(--color-elevated) mt-2 overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${project.progress}%` }} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-(--color-text-secondary)">Project Manager</p>
            <p className="text-sm font-bold text-(--color-text-primary) mt-1">
              {project.project_manager ? `${project.project_manager.first_name} ${project.project_manager.last_name}` : 'Unassigned'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-(--color-text-secondary)">Current Milestone</p>
            <p className="text-sm font-bold text-(--color-text-primary) mt-1">
              {project.current_milestone ? project.current_milestone.title : '—'}
            </p>
            {project.current_milestone?.due_date && (
              <p className="text-xs text-(--color-text-secondary) mt-0.5">
                Due {new Date(project.current_milestone.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-(--color-border)">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => goToTab(t)}
            className={cn(
              'px-4 h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        {tab === 'Overview' && (
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
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
        {tab === 'Milestones' && <MilestonesTab projectId={project.id} />}
        {tab === 'Updates' && <UpdatesTab projectId={project.id} />}
        {tab === 'Communication' && <CommunicationTab projectId={project.id} />}
        {tab === 'Files' && <FilesTab projectId={project.id} />}
        {tab === 'Approvals' && <ApprovalsTab projectId={project.id} />}
      </div>
    </div>
  );
};

export default PortalProjectDetailPage;
