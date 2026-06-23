import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, CalendarClock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useToastContext } from '@/components/toast/ToastProvider';

interface Props {
  projectId: string | number;
  projectName: string;
  currentDeadline?: string;
  onClose: () => void;
}

const RequestExtensionModal: React.FC<Props> = ({ projectId, projectName, currentDeadline, onClose }) => {
  const toast = useToastContext();
  const [proposedDeadline, setProposedDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate, isPending } = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.PROJECT.EXTENSION(projectId), {
      method: 'POST',
      body: JSON.stringify({ proposed_deadline: proposedDeadline, reason }),
    }),
    onSuccess: () => {
      toast.success('Extension request submitted');
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to submit request'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!proposedDeadline) newErrors.proposedDeadline = 'Please select a new deadline';
    if (!reason.trim()) newErrors.reason = 'Reason is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    mutate();
  };

  const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarClock size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 leading-tight">Request Deadline Extension</h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5 leading-tight">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {currentDeadline && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs text-amber-700 font-semibold">
              Current deadline: <span className="font-black">{new Date(currentDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">
              Proposed New Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={inputCls}
              value={proposedDeadline}
              onChange={e => setProposedDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.proposedDeadline && <p className="text-red-500 text-xs mt-1">{errors.proposedDeadline}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">
              Reason for Extension <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              placeholder="Explain why the deadline needs to be extended…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 h-10 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
              {isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestExtensionModal;
