import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, List, KanbanSquare, GanttChartSquare, Table2, UsersRound, Gauge } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Card from '@/components/ui/Card';
import { TableSkeleton } from '@/components/skeletons';
import { PortalMilestone } from '../types';
import PortalMilestoneBoardView from '../PortalMilestoneBoardView';
import PortalMilestoneTimelineView from '../PortalMilestoneTimelineView';
import PortalMilestoneTableView from '../PortalMilestoneTableView';
import PortalMilestoneTeamView from '../PortalMilestoneTeamView';
import PortalMilestoneWorkloadView from '../PortalMilestoneWorkloadView';
import { cn } from '@/utils/cn';

const statusStyles: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-(--color-elevated) text-(--color-text-secondary)',
};

const VIEW_OPTIONS = [
  { id: 'list', label: 'List', icon: List },
  { id: 'board', label: 'Board', icon: KanbanSquare },
  { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'workload', label: 'Workload', icon: Gauge },
  { id: 'team', label: 'Team', icon: UsersRound },
] as const;

const MilestonesTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [view, setView] = useState<'list' | 'board' | 'timeline' | 'table' | 'workload' | 'team'>('list');
  const { data, isLoading } = useQuery<PortalMilestone[]>({
    queryKey: ['portal', 'milestones', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MILESTONES(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  const handleViewFile = async (fileId: string) => {
    const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.FILE_VIEW_URL(projectId, fileId));
    const url = res?.payload?.view_url || res?.payload?.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) return <TableSkeleton columns={4} rows={4} />;

  if (!data || data.length === 0) {
    return <p className="text-sm text-(--color-text-secondary) py-10 text-center">No milestones yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 bg-(--color-elevated) rounded-xl p-1">
          {VIEW_OPTIONS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-black transition-colors',
                view === v.id ? 'bg-(--color-card) text-primary-600 shadow-sm' : 'text-(--color-text-secondary) hover:text-(--color-text-primary)'
              )}
            >
              <v.icon size={13} />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'board' && <PortalMilestoneBoardView milestones={data} />}
      {view === 'timeline' && <PortalMilestoneTimelineView milestones={data} />}
      {view === 'table' && <PortalMilestoneTableView milestones={data} />}
      {view === 'workload' && <PortalMilestoneWorkloadView milestones={data} />}
      {view === 'team' && <PortalMilestoneTeamView milestones={data} />}

      {view === 'list' && data.map((m) => (
        <Card key={m.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-(--color-text-primary)">{m.title}</p>
              {m.description && <p className="text-xs text-(--color-text-secondary) mt-1">{m.description}</p>}
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusStyles[m.status] || statusStyles.PENDING}`}>
              {m.status}
            </span>
          </div>

          <div className="flex items-center gap-6 mt-4 text-xs text-(--color-text-secondary)">
            <span>Due: {m.due_date ? new Date(m.due_date).toLocaleDateString() : '—'}</span>
            {m.completed_date && <span>Completed: {new Date(m.completed_date).toLocaleDateString()}</span>}
            <span className="font-bold text-(--color-text-primary)">{m.progress_percent}%</span>
          </div>

          <div className="h-2 rounded-full bg-(--color-elevated) mt-2 overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${m.progress_percent}%` }} />
          </div>

          {m.deliverables?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-(--color-card-border)">
              <p className="text-xs font-semibold text-(--color-text-secondary) mb-2">Deliverables</p>
              <div className="flex flex-wrap gap-2">
                {m.deliverables.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleViewFile(d.id)}
                    className="flex items-center gap-2 px-3 h-9 rounded-xl border border-(--color-border) text-xs font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover)"
                  >
                    <FileText size={13} />
                    {d.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default MilestonesTab;
