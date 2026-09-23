import React from 'react';
import Modal from '@/components/ui/Modal';
import { CheckCircle2, Clock } from 'lucide-react';
import { useGetPolicyAcknowledgementStatus } from '@/services/policyService';

// Phase 3 — the "N/M employees have acknowledged version X" HR reporting
// view. Read-only: this modal never writes anything, it just renders
// GET /policy/:id/acknowledgement-status verbatim (required/eligible count
// already respects the policy's own targeting server-side, so a
// department-only policy's percentage is against that department's
// headcount, not the whole company).
interface PolicyAcknowledgementStatusModalProps {
  policyId: string;
  onClose: () => void;
}

const PolicyAcknowledgementStatusModal: React.FC<PolicyAcknowledgementStatusModalProps> = ({ policyId, onClose }) => {
  const { data, isLoading } = useGetPolicyAcknowledgementStatus(policyId);

  return (
    <Modal isOpen onClose={onClose} title={data ? `Acknowledgement Status — ${data.policy.title}` : 'Acknowledgement Status'} size="lg">
      <div className="flex flex-col gap-5 mt-4">
        {isLoading && <p className="text-sm text-gray-400 italic py-6 text-center">Loading…</p>}

        {!isLoading && data && (
          <>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="font-mono font-bold text-gray-500">{data.policy.policy_number}</span>
              <span>·</span>
              <span>v{data.policy.version}</span>
              {data.policy.is_mandatory && <span className="text-red-500 font-bold">· Mandatory</span>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-black text-gray-900">{data.required_count}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Required</p>
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
                <p className="text-2xl font-black text-green-600">{data.acknowledged_count}</p>
                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mt-1">Acknowledged</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center">
                <p className="text-2xl font-black text-amber-600">{data.pending_count}</p>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Pending</p>
              </div>
            </div>

            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${data.percentage}%` }} />
            </div>
            <p className="text-xs text-gray-500 -mt-3">{data.percentage}% acknowledged</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending ({data.pending_employees.length})</p>
                {data.pending_employees.length === 0 && <p className="text-xs text-gray-300 italic">Nobody pending.</p>}
                {data.pending_employees.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-2 text-sm">
                    <Clock size={13} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{u.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Acknowledged ({data.acknowledged_employees.length})</p>
                {data.acknowledged_employees.length === 0 && <p className="text-xs text-gray-300 italic">Nobody yet.</p>}
                {data.acknowledged_employees.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{u.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{new Date(u.acknowledged_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default PolicyAcknowledgementStatusModal;
