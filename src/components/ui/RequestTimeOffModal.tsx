import React, { useState } from 'react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import Textarea from './Textarea';
import Button from './Button';
import { useGetTimeOffPolicies, useCreateTimeOffRequestMutation } from '@/services/timesheetService';

interface RequestTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RequestTimeOffModal: React.FC<RequestTimeOffModalProps> = ({ isOpen, onClose }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch policies to get the Annual Leave policy ID
  const { data: policiesData } = useGetTimeOffPolicies(isOpen);
  const annualPolicy = policiesData?.find(p => p.name === 'Annual Leave') ?? policiesData?.[0];

  const { mutate: createRequest, isPending } = useCreateTimeOffRequestMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    if (!reason.trim()) newErrors.reason = 'Reason for leave is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const formData = new FormData();
    if (annualPolicy) formData.append('policy_id', String(annualPolicy.id));
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);
    formData.append('all_day', 'true');
    formData.append('exclude_weekends', 'false');
    formData.append('exclude_holidays', 'false');
    formData.append('reason', reason);
    if (file) formData.append('supporting_document', file);

    createRequest(formData, {
      onSuccess: () => {
        setStartDate('');
        setEndDate('');
        setReason('');
        setFile(null);
        onClose();
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      customClass="max-w-[480px] overflow-hidden"
      title="Request Leave"
    >
      <div className="flex flex-col gap-6">
        {/* Leave balance info */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
          <span className="text-xs font-semibold text-blue-700">Leave Type</span>
          <span className="text-xs font-black text-blue-900">Annual Leave (12 days/year)</span>
        </div>

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

          <div className="flex flex-col gap-2">
            <span className="text-sm font-black text-gray-900">Supporting Document <span className="text-gray-400 font-bold">(Optional)</span></span>
            <div className="relative group">
              <input
                type="file"
                className="hidden"
                id="leave-file-upload"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpeg,.jpg"
              />
              <label
                htmlFor="leave-file-upload"
                className="flex items-center h-12 w-full border border-gray-200 rounded-xl overflow-hidden cursor-pointer group-hover:border-gray-300 transition-all bg-white"
              >
                <div className="px-4 py-2 border-r border-gray-100 bg-gray-50 text-gray-900 text-sm font-black flex items-center gap-2">
                  Choose File
                </div>
                <div className="px-4 text-sm font-bold text-gray-400 truncate flex-1">
                  {file?.name || 'No File Chosen'}
                </div>
              </label>
              <p className="text-[10px] text-gray-400 font-bold mt-1">PDF, PNG, or JPEG. Max 5MB.</p>
            </div>
          </div>

          <Textarea
            label="Reason *"
            placeholder="Explain the reason for your leave request…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            error={errors.reason}
            className="min-h-[120px]"
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl h-12 font-black border-gray-200 text-gray-600"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary-100"
              disabled={isPending}
            >
              {isPending ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default RequestTimeOffModal;
