import React, { useState } from 'react';
import { CalendarClock, Check, X as XIcon } from 'lucide-react';
import Button from './Button';
import Textarea from './Textarea';
import Loader from './Loader';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useExtensionRequests, useReviewExtensionRequest } from '@/services/extensionRequestsService';

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
  APPROVED: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]',
  REJECTED: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
};

interface ExtensionRequestsPanelProps {
  projectId: string;
  canReview: boolean;
}

const ExtensionRequestsPanel: React.FC<ExtensionRequestsPanelProps> = ({ projectId, canReview }) => {
  const toast = useToastContext();
  const { data: requests = [], isLoading } = useExtensionRequests(projectId);
  const review = useReviewExtensionRequest(projectId);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!isLoading && requests.length === 0) return null;

  const handleApprove = (requestId: string) => {
    review.mutate(
      { requestId, status: 'APPROVED' },
      {
        onSuccess: () => toast.success('Extension approved — deadline updated'),
        onError: (e: any) => toast.error(e?.message || 'Failed to approve request'),
      }
    );
  };

  const handleReject = (requestId: string) => {
    if (!rejectReason.trim()) return toast.error('A reason is required to reject');
    review.mutate(
      { requestId, status: 'REJECTED', review_reason: rejectReason },
      {
        onSuccess: () => { toast.success('Extension rejected'); setRejectingId(null); setRejectReason(''); },
        onError: (e: any) => toast.error(e?.message || 'Failed to reject request'),
      }
    );
  };

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center gap-3 p-6 border-b border-gray-100">
        <CalendarClock size={18} strokeWidth={2.5} className="text-primary-500" />
        <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Deadline Extension Requests</h3>
      </div>

      <div className="flex flex-col gap-4 p-6">
        {isLoading && <div className="flex justify-center py-6"><Loader size={28} /></div>}

        {requests.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 p-4 bg-gray-50/60 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_STYLE[r.status]}`}>
                {r.status}
              </span>
              <span className="text-[10px] font-bold text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm font-medium text-gray-700">
              Proposed deadline: <span className="font-black">{new Date(r.proposed_deadline).toLocaleDateString()}</span>
            </p>
            <p className="text-xs text-gray-500">{r.reason}</p>
            {r.requester && (
              <span className="text-[10px] font-bold text-gray-400">Requested by {r.requester.first_name} {r.requester.last_name}</span>
            )}
            {r.status !== 'PENDING' && r.review_reason && (
              <p className="text-xs text-gray-500 italic border-l-2 border-primary-200 pl-2 mt-1">Review note: {r.review_reason}</p>
            )}

            {canReview && r.status === 'PENDING' && (
              <div className="flex flex-col gap-2 mt-2">
                {rejectingId === r.id ? (
                  <>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejecting…"
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }} className="h-9 rounded-xl font-bold text-xs px-4">
                        Cancel
                      </Button>
                      <Button onClick={() => handleReject(r.id)} disabled={review.isPending} className="bg-red-600 text-white h-9 rounded-xl font-bold text-xs px-4">
                        Confirm Reject
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2 justify-end">
                    <Button
                      leftIcon={XIcon}
                      variant="outline"
                      onClick={() => setRejectingId(r.id)}
                      disabled={review.isPending}
                      className="h-9 rounded-xl font-bold text-xs px-4 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                    <Button
                      leftIcon={Check}
                      onClick={() => handleApprove(r.id)}
                      disabled={review.isPending}
                      className="bg-primary-500 text-white h-9 rounded-xl font-bold text-xs px-4"
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExtensionRequestsPanel;
