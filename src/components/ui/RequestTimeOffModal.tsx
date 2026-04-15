import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Select, { SelectOption } from './Select';
import Button from './Button';
import { Calendar, X, Paperclip } from 'lucide-react';
import { cn } from '@/utils/cn';

interface RequestTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const leavePolicies: SelectOption[] = [
  { label: 'Select Policy', value: '' },
  { label: 'Paid Leave', value: 'paid' },
  { label: 'Casual Leave', value: 'casual' },
  { label: 'Sick Leave', value: 'sick' },
  { label: 'Unpaid Leave', value: 'unpaid' },
];

const RequestTimeOffModal: React.FC<RequestTimeOffModalProps> = ({ isOpen, onClose }) => {
  const [policy, setPolicy] = useState<string | number>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [excludeHolidays, setExcludeHolidays] = useState(false);
  const [reason, setReason] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting leave request:', {
      policy,
      startDate,
      endDate,
      isAllDay,
      excludeWeekends,
      excludeHolidays,
      reason,
      fileName
    });
    // Add logic here to call API or dispatch action
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      customClass="max-w-[480px] overflow-hidden"
      title="Request Time Off"
    >
      <div className="flex flex-col gap-6">


        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Select
            label="Leave Policy *"
            options={leavePolicies}
            value={policy}
            onChange={setPolicy}
            placeholder="Select Policy"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="date"
              placeholder="Pick date"
              // rightIcon={Calendar}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date *"
              type="date"
              placeholder="Pick date"
              // rightIcon={Calendar}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group w-fit">
            <div
              className={cn(
                "h-5 w-5 rounded border-2 transition-all flex items-center justify-center",
                isAllDay ? "bg-primary-500 border-primary-500" : "border-gray-200 group-hover:border-gray-300"
              )}
              onClick={() => setIsAllDay(!isAllDay)}
            >
              {isAllDay && <div className="h-2 w-2 bg-white rounded-full" />}
            </div>
            <span className="text-sm font-bold text-gray-700">All Day (24h)</span>
          </label>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-black text-gray-900">Exclusions</span>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={excludeWeekends}
                  onChange={() => setExcludeWeekends(!excludeWeekends)}
                />
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                    excludeWeekends ? "bg-primary-500 border-primary-500" : "border-gray-200 group-hover:border-gray-300"
                  )}
                >
                  {excludeWeekends && <div className="h-2 w-2 bg-white rounded-full" />}
                </div>
                <span className="text-sm font-bold text-gray-700">Exclude Weekends</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={excludeHolidays}
                  onChange={() => setExcludeHolidays(!excludeHolidays)}
                />
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                    excludeHolidays ? "bg-primary-500 border-primary-500" : "border-gray-200 group-hover:border-gray-300"
                  )}
                >
                  {excludeHolidays && <div className="h-2 w-2 bg-white rounded-full" />}
                </div>
                <span className="text-sm font-bold text-gray-700">Exclude Holidays</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-black text-gray-900">Supporting Document (Optional)</span>
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
                  {fileName || 'No File Chosen'}
                </div>
              </label>
              <p className="text-[10px] text-gray-400 font-bold mt-1">PDF, PNG, Or JPEG. Max 5MB.</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-black text-gray-900">Reason *</label>
            <textarea
              className="min-h-[140px] w-full rounded-xl border border-gray-200 p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_4px_rgba(31,123,255,0.1)] transition-all resize-none"
              placeholder="Explain the reason for your time off request...."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
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
            >
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default RequestTimeOffModal;
