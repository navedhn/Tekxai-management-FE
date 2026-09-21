import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useMyPermissions } from '@/services/permissionsService';
import { useToastContext } from '@/components/toast/ToastProvider';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { PageActionButton } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/skeletons';
import { PortalApproval } from '../types';

const statusStyles: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  CHANGES_REQUESTED: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-700',
};

const inputCls =
  'w-full min-h-[100px] px-3 py-2 border border-(--color-border) rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none bg-(--color-surface)';

const ApprovalsTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: myPerms } = useMyPermissions();
  const canRespond = !!myPerms?.permissions?.includes('client.approvals.respond');
  const qc = useQueryClient();
  const toast = useToastContext();
  const [changesModal, setChangesModal] = useState<PortalApproval | null>(null);
  const [comment, setComment] = useState('');

  const { data, isLoading } = useQuery<PortalApproval[]>({
    queryKey: ['portal', 'approvals', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.APPROVALS(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  const respond = useMutation({
    mutationFn: ({ approvalId, decision, comment }: { approvalId: string; decision: 'APPROVED' | 'CHANGES_REQUESTED'; comment?: string }) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.APPROVAL_RESPOND(projectId, approvalId), {
        method: 'POST',
        body: JSON.stringify({ decision, ...(comment ? { comment } : {}) }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'approvals', projectId] });
      setChangesModal(null);
      setComment('');
      toast?.success?.('Response submitted');
    },
    onError: () => toast?.error?.('Failed to submit response'),
  });

  const handleApprove = (a: PortalApproval) => respond.mutate({ approvalId: a.id, decision: 'APPROVED' });

  const handleRequestChanges = () => {
    if (!changesModal) return;
    if (!comment.trim()) {
      toast?.error?.('A comment is required to request changes');
      return;
    }
    respond.mutate({ approvalId: changesModal.id, decision: 'CHANGES_REQUESTED', comment: comment.trim() });
  };

  if (isLoading) return <TableSkeleton columns={3} rows={4} />;

  if (!data || data.length === 0) {
    return <p className="text-sm text-(--color-text-secondary) py-10 text-center">No approvals yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((a) => (
        <Card key={a.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[a.status]}`}>{a.status}</span>
              <p className="text-xs text-(--color-text-secondary) mt-2">
                Submitted: {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '—'}
                {a.responded_at && <> · Responded: {new Date(a.responded_at).toLocaleDateString()}</>}
              </p>
              {a.comment && <p className="text-sm text-(--color-text-primary) mt-2">{a.comment}</p>}
            </div>

            {a.status === 'PENDING' && canRespond && (
              <div className="flex items-center gap-2 shrink-0">
                <PageActionButton leftIcon={CheckCircle2} onClick={() => handleApprove(a)} disabled={respond.isPending}>
                  Approve
                </PageActionButton>
                <button
                  onClick={() => { setChangesModal(a); setComment(''); }}
                  disabled={respond.isPending}
                  className="flex items-center gap-2 px-4 h-10 rounded-xl border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle size={15} />
                  Request Changes
                </button>
              </div>
            )}
          </div>
        </Card>
      ))}

      <Modal
        isOpen={!!changesModal}
        onClose={() => setChangesModal(null)}
        title="Request Changes"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={() => setChangesModal(null)}
              className="px-4 h-10 rounded-xl border border-(--color-border) text-sm font-semibold"
            >
              Cancel
            </button>
            <PageActionButton onClick={handleRequestChanges} disabled={respond.isPending || !comment.trim()}>
              Submit
            </PageActionButton>
          </div>
        }
      >
        <label className="text-xs font-semibold text-(--color-text-secondary) block mb-1.5">
          Comment (required)
        </label>
        <textarea className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Describe the changes you'd like..." />
      </Modal>
    </div>
  );
};

export default ApprovalsTab;
