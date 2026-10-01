import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Card from '@/components/ui/Card';
import { TableSkeleton } from '@/components/skeletons';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/services/permissionsService';
import { useUpdateMilestone } from '@/services/milestonesService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PortalMilestone } from '../types';
import PortalMilestoneBoardView, { type PortalMilestoneStatus } from '../PortalMilestoneBoardView';
import PortalMilestoneTimelineView from '../PortalMilestoneTimelineView';
import PortalMilestoneTableView from '../PortalMilestoneTableView';
import PortalMilestoneTeamView from '../PortalMilestoneTeamView';
import PortalMilestoneWorkloadView from '../PortalMilestoneWorkloadView';
import PortalMilestoneDashboardView from '../PortalMilestoneDashboardView';
import type { MilestonesView } from '../types';

const statusStyles: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-(--color-elevated) text-(--color-text-secondary)',
};

const PRICE_VIEW_ROLES = new Set(['SUPER_ADMIN', 'CLIENT_ADMIN']);

const MilestonesTab: React.FC<{ projectId: string; view: MilestonesView }> = ({ projectId, view }) => {
  const { role } = useAuth();
  const toast = useToastContext();
  const qc = useQueryClient();
  const { data: myPerms } = useMyPermissions();
  const canViewPricing = !!role && PRICE_VIEW_ROLES.has(role);
  // Super admins, milestone managers, and access-control granters (extension.approve)
  // can drag board cards — matches BE can_any on PUT /milestones/:id.
  const canEditBoard =
    !!myPerms?.is_super_admin ||
    !!myPerms?.permissions?.includes('erp.milestones.manage') ||
    !!myPerms?.permissions?.includes('erp.projects.extension.approve');

  const { data, isLoading } = useQuery<PortalMilestone[]>({
    queryKey: ['portal', 'milestones', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MILESTONES(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  const updateMilestone = useUpdateMilestone(projectId);

  const handleChangeStatus = (milestoneId: string, status: PortalMilestoneStatus) => {
    // #region agent log
    fetch('http://127.0.0.1:7689/ingest/5fe2d865-37c9-41e9-b868-d88ad2f9dbc6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d0293d'},body:JSON.stringify({sessionId:'d0293d',runId:'board-dnd',hypothesisId:'H-mutate',location:'MilestonesTab.tsx:handleChangeStatus',message:'status mutation fired',data:{projectId,milestoneId,status,canEditBoard},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    updateMilestone.mutate(
      { milestoneId, updates: { status } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['portal', 'milestones', projectId] });
          qc.invalidateQueries({ queryKey: ['portal', 'project', projectId] });
        },
        onError: (err: any) => toast.error(err?.message || 'Failed to update milestone status'),
      }
    );
  };

  const handleViewFile = async (fileId: string) => {
    const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.FILE_VIEW_URL(projectId, fileId));
    const url = res?.payload?.view_url || res?.payload?.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) return <TableSkeleton columns={4} rows={4} />;

  const milestones = data || [];

  return (
    <div className="flex flex-col gap-4">
      {milestones.length === 0 && view !== 'dashboard' && view !== 'team' && (
        <p className="text-sm text-(--color-text-secondary) py-10 text-center">No milestones yet.</p>
      )}

      {view === 'dashboard' && <PortalMilestoneDashboardView milestones={milestones} />}
      {view === 'board' && milestones.length > 0 && (
        <PortalMilestoneBoardView
          milestones={milestones}
          canEdit={canEditBoard}
          onChangeStatus={handleChangeStatus}
        />
      )}
      {view === 'timeline' && milestones.length > 0 && <PortalMilestoneTimelineView milestones={milestones} />}
      {view === 'table' && milestones.length > 0 && <PortalMilestoneTableView milestones={milestones} />}
      {view === 'workload' && milestones.length > 0 && <PortalMilestoneWorkloadView milestones={milestones} />}
      {view === 'team' && <PortalMilestoneTeamView projectId={projectId} milestones={milestones} />}

      {view === 'list' && milestones.map((m) => (
        <Card key={m.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-(--color-text-primary)">{m.title}</p>
                {canViewPricing && m.price != null && Number(m.price) > 0 && (
                  <span className="text-xs font-black tabular-nums text-(--color-text-primary) bg-(--color-elevated) px-2 py-0.5 rounded-full">
                    {m.currency || 'PKR'} {Number(m.price).toLocaleString()}
                  </span>
                )}
                {canViewPricing && m.payment_status && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${m.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                    {m.payment_status === 'PAID' ? 'Paid' : 'Unpaid'}
                  </span>
                )}
              </div>
              {m.description && <p className="text-xs text-(--color-text-secondary) mt-1 whitespace-pre-wrap">{m.description}</p>}
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
