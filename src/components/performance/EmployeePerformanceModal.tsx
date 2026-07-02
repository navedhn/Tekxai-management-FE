import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useFetchUsersQuery } from '@/services/userService';
import {
  useGetBonusConfig,
  useSavePerformanceMutation,
  SCORING_CRITERIA,
} from '@/services/performanceScoringService';
import {
  EmployeePerformanceRecord,
  PerformanceScores,
  SavePerformancePayload,
} from '@/types/performanceScoring';
import {
  EMPTY_SCORES,
  calculateTotalScore,
  clampScore,
  findBonusTier,
  getMaxTotalScore,
  getScoreGrade,
  formatPkrAmount,
} from '@/utils/performanceScoring';
import { cn } from '@/utils/cn';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  period: string;
  record?: EmployeePerformanceRecord | null;
};

const EmployeePerformanceModal: React.FC<Props> = ({ isOpen, onClose, period, record }) => {
  const toast = useToastContext();
  const { data: employees = [] } = useFetchUsersQuery({}, isOpen);
  const { data: bonusTiers = [] } = useGetBonusConfig();
  const criteria = SCORING_CRITERIA;
  const maxTotal = getMaxTotalScore(criteria);
  const saveMutation = useSavePerformanceMutation();

  const [employeeId, setEmployeeId] = useState('');
  const [scores, setScores] = useState<PerformanceScores>(EMPTY_SCORES);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (record) {
      setEmployeeId(record.employeeId);
      setScores(record.scores);
      setNotes(record.notes);
    } else {
      setEmployeeId('');
      setScores(EMPTY_SCORES);
      setNotes('');
    }
  }, [isOpen, record]);

  const totalScore = useMemo(() => calculateTotalScore(scores, criteria), [scores, criteria]);
  const grade = useMemo(() => getScoreGrade(totalScore, maxTotal || 100), [totalScore, maxTotal]);
  const suggestedTier = useMemo(() => findBonusTier(totalScore, bonusTiers), [totalScore, bonusTiers]);

  const employeeOptions = employees.map((e: any) => ({
    value: e.id,
    label: `${e.first_name} ${e.last_name}`,
  }));

  const updateScore = (key: keyof PerformanceScores, value: number, max: number) => {
    setScores((prev) => ({ ...prev, [key]: clampScore(value, max) }));
  };

  const handleSubmit = () => {
    if (!employeeId) {
      toast.error('Please select an employee');
      return;
    }

    const payload: SavePerformancePayload = {
      employeeId,
      period,
      scores,
      notes,
    };

    saveMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(record ? 'Performance score updated' : 'Performance score saved');
        onClose();
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to save score'),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {record ? 'Edit Performance Score' : 'Score Employee Performance'}
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Period: {period}</p>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
          <Button
            variant="outline"
            size="md"
            className="w-full sm:w-auto h-10 rounded-xl font-bold px-6"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto h-10 rounded-xl font-black px-6 shadow-lg shadow-primary-100"
            loading={saveMutation.isPending}
            onClick={handleSubmit}
          >
            {record ? 'Update Score' : 'Save Score'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {!record && (
          <div>
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2 block">
              Employee *
            </label>
            <Select
              value={employeeId}
              onChange={(v) => setEmployeeId(String(v))}
              options={[{ value: '', label: 'Select employee...' }, ...employeeOptions]}
              placeholder="Select employee"
            />
          </div>
        )}

        {record && (
          <div className="rounded-xl bg-[#F8F9FA] p-4">
            <p className="font-black text-gray-900">{record.employeeName}</p>
            {record.department && <p className="text-sm text-gray-500">{record.department}</p>}
          </div>
        )}

        <div className="space-y-4">
          {criteria.map((c) => (
            <div key={c.key} className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{c.label}</p>
                  <p className="text-xs text-gray-500">{c.description}</p>
                </div>
                <span className="text-xs font-black text-primary-600">Max {c.max} pts</span>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="range"
                  min={0}
                  max={c.max}
                  step={0.5}
                  value={scores[c.key]}
                  onChange={(e) => updateScore(c.key, Number(e.target.value), c.max)}
                  className="flex-1 min-w-0 accent-[#005CDA]"
                />
                <input
                  type="number"
                  min={0}
                  max={c.max}
                  step={0.5}
                  value={scores[c.key]}
                  onChange={(e) => updateScore(c.key, Number(e.target.value), c.max)}
                  className="w-16 sm:w-20 shrink-0 rounded-lg border border-gray-200 px-2 sm:px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-primary-100 outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-[#005CDA] to-[#001F4A] p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Total Score</p>
            <p className="text-4xl font-black mt-1 tabular-nums">{totalScore}<span className="text-lg text-blue-200">/{maxTotal || 100}</span></p>
            <span className={cn('inline-block mt-3 rounded-lg border px-3 py-1 text-xs font-bold', grade.color)}>
              {grade.label}
            </span>
          </div>

          <div className="rounded-xl border border-gray-100 p-5 space-y-2">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Bonus Preview</p>
            {suggestedTier ? (
              <>
                <p className="text-sm text-gray-600">{suggestedTier.level_name}</p>
                <p className="text-sm">
                  Suggested:{' '}
                  <span className={cn('font-black', suggestedTier.bonus_amount < 0 ? 'text-red-600' : 'text-emerald-700')}>
                    {formatPkrAmount(suggestedTier.bonus_amount)}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400">No bonus tier configured for this score.</p>
            )}
            <p className="text-[11px] text-gray-400 pt-1">
              This is a preview only — actual bonus records are calculated and approved separately from the Bonus tab.
            </p>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2 block">
            Admin Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add feedback or justification for this score..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary-100 outline-none resize-none"
          />
        </div>
      </div>
    </Modal>
  );
};

export default EmployeePerformanceModal;
