import React, { useState } from 'react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import Textarea from './Textarea';
import Button from './Button';
import { useGetTimeOffPolicies, useCreateTimeOffRequestMutation } from '@/services/timesheetService';
import { useGetMyLeaveBalances } from '@/services/leaveBalanceService';
import { useToastContext } from '@/components/toast/ToastProvider';

interface RequestTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RequestTimeOffModal: React.FC<RequestTimeOffModalProps> = ({ isOpen, onClose }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [reason, setReason]       = useState('');
  const [policyId, setPolicyId]   = useState('');
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const toast = useToastContext();

  const { data: policiesData } = useGetTimeOffPolicies(isOpen);
  const policies = policiesData || [];

  const { data: balances } = useGetMyLeaveBalances();
  const selectedPolicyId = policyId || policies[0]?.id || '';
  const selectedBalance = (balances || []).find((b: any) => b.policy_id === selectedPolicyId);

  const { mutate: createRequest, isPending } = useCreateTimeOffRequestMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!startDate)      newErrors.startDate = 'Start date is required';
    if (!endDate)        newErrors.endDate   = 'End date is required';
    if (!reason.trim())  newErrors.reason    = 'Reason is required';
    if (!policyId && !policies.length) newErrors.policy = 'No leave policies available — contact HR';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Calculate days between dates
    const start = new Date(startDate);
    const end   = new Date(endDate);
    const days  = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    const selectedPolicy = policyId || policies[0]?.id;

    createRequest(
      { policy_id: selectedPolicy, start_date: startDate, end_date: endDate, days, reason } as any,
      {
        onSuccess: () => {
          toast.success('Leave request submitted successfully');
          setStartDate(''); setEndDate(''); setReason(''); setPolicyId('');
          onClose();
        },
        onError: (e: any) => {
          toast.error(e?.message || 'Failed to submit leave request');
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" customClass="max-w-[480px]" title="Request Leave">
      <div className="flex flex-col gap-6">
        {/* Policy selector */}
        {policies.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Leave Type *</label>
            <select
              value={policyId || policies[0]?.id || ''}
              onChange={e => setPolicyId(e.target.value)}
              className="h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:border-primary-400"
            >
              {policies.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {selectedBalance && (
              <p className="text-xs font-semibold text-gray-500">
                Remaining: <span className="text-gray-900 font-black">{selectedBalance.remaining_days}</span> of {selectedBalance.total_days} days
                {selectedBalance.pending_days > 0 && (
                  <span> &middot; {selectedBalance.pending_days} pending</span>
                )}
              </p>
            )}
          </div>
        )}
        {policies.length === 0 && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700">No leave policies found. Please contact HR to set up leave policies.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Start Date *"
              placeholder="Pick date"
              value={startDate}
              onChange={date => setStartDate(date)}
              error={errors.startDate}
            />
            <DatePicker
              label="End Date *"
              placeholder="Pick date"
              value={endDate}
              onChange={date => setEndDate(date)}
              error={errors.endDate}
            />
          </div>

          <Textarea
            label="Reason *"
            placeholder="Explain the reason for your leave request…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            error={errors.reason}
            className="min-h-[120px]"
          />

          {errors.policy && <p className="text-xs text-red-500">{errors.policy}</p>}

          <div className="flex items-center gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl h-12 font-black" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary-100" disabled={isPending}>
              {isPending ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default RequestTimeOffModal;
