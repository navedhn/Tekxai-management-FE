import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

type TimesheetRow = {
  id: string;
  check_in: string;
  check_out: string | null;
  duration_sec: number;
  client_approval_status: string | null;
  client_rejection_reason?: string | null;
  user: { id: string; first_name: string; last_name: string; email: string };
  project: { id: string; title: string } | null;
  task: { id: string; title: string } | null;
};

function formatHours(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

const PortalTimesheetsPage: React.FC = () => {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'timesheets', status],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.PORTAL.TIMESHEETS}?status=${status}`),
  });
  const rows: TimesheetRow[] = data?.payload?.records || [];

  const respond = useMutation({
    mutationFn: ({ projectId, entryId, decision, reason }: { projectId: string; entryId: string; decision: string; reason?: string }) =>
      apiRequest(API_ENDPOINTS.PORTAL.TIMESHEET_RESPOND(projectId, entryId), {
        method: 'POST',
        body: JSON.stringify({ decision, reason }),
      }),
    onSuccess: () => {
      toast.success('Response recorded');
      qc.invalidateQueries({ queryKey: ['portal', 'timesheets'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-(--color-text-primary)">Timesheet approval</h1>
          <p className="text-sm text-(--color-text-secondary) mt-1">Review hours attributed to your projects.</p>
        </div>
        <select
          className="border border-(--color-border) rounded-lg px-3 py-2 text-sm bg-(--color-surface)"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-(--color-text-secondary) py-12 text-center">No timesheet entries to review.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.id} className="border border-(--color-border) rounded-xl p-4 bg-(--color-surface)">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-(--color-text-primary)">
                    {r.user.first_name} {r.user.last_name}
                  </div>
                  <div className="text-sm text-(--color-text-secondary) mt-0.5">
                    {r.project?.title || '—'}{r.task ? ` · ${r.task.title}` : ''}
                  </div>
                  <div className="text-xs text-(--color-text-secondary) mt-2 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(r.check_in).toLocaleString()} → {r.check_out ? new Date(r.check_out).toLocaleString() : 'open'} · {formatHours(r.duration_sec || 0)}
                  </div>
                  {r.client_rejection_reason && (
                    <div className="text-xs text-red-600 mt-2">Rejected: {r.client_rejection_reason}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{r.client_approval_status || '—'}</span>
                  {r.client_approval_status === 'PENDING' && r.project && (
                    <>
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm"
                        onClick={() => respond.mutate({ projectId: r.project!.id, entryId: r.id, decision: 'APPROVED' })}
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                        onClick={() => {
                          const reason = window.prompt('Rejection reason');
                          if (!reason) return;
                          respond.mutate({ projectId: r.project!.id, entryId: r.id, decision: 'REJECTED', reason });
                        }}
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalTimesheetsPage;
