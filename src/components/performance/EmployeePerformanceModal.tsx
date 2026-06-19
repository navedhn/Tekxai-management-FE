import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetPerformanceEmployees,
  useGetPerformanceConfig,
  useSavePerformanceMutation,
} from '@/services/performanceScoringService';
import {
  EmployeePerformanceRecord,
  PerformanceScores,
  SavePerformancePayload,
} from '@/types/performanceScoring';
import {
  EMPTY_SCORES,
  calculateSuggestedBonus,
  calculateTotalScore,
  clampScore,
  getBonusRuleLabel,
  getMaxTotalScore,
  getScoreGrade,
  formatPkrAmount,
  normalizeScores,
} from '@/utils/performanceScoring';
import { cn } from '@/utils/cn';
import { RotateCcw } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  period: string;
  record?: EmployeePerformanceRecord | null;
};

const EmployeePerformanceModal: React.FC<Props> = ({ isOpen, onClose, period, record }) => {
  const toast = useToastContext();
  const { data: employees = [] } = useGetPerformanceEmployees();
  const { data: config } = useGetPerformanceConfig();
  const criteria = config?.criteria ?? [];
  const bonusRules = config?.bonusRules ?? [];
  const maxTotal = getMaxTotalScore(criteria);
  const saveMutation = useSavePerformanceMutation();

  const [employeeId, setEmployeeId] = useState('');
  const [scores, setScores] = useState<PerformanceScores>(EMPTY_SCORES);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [bonusOverridden, setBonusOverridden] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (record) {
      setEmployeeId(record.employeeId);
      setScores(record.scores);
      setBonusAmount(record.bonusAmount);
      setBonusOverridden(record.bonusOverridden);
      setNotes(record.notes);
    } else {
      setEmployeeId('');
      setScores(EMPTY_SCORES);
      setBonusAmount(0);
      setBonusOverridden(false);
      setNotes('');
    }
  }, [isOpen, record]);

  const totalScore = useMemo(
    () => calculateTotalScore(scores, criteria),
    [scores, criteria]
  );
  const suggestedBonus = useMemo(
    () => calculateSuggestedBonus(totalScore, bonusRules),
    [totalScore, bonusRules]
  );
  const grade = useMemo(
    () => getScoreGrade(totalScore, maxTotal || 100),
    [totalScore, maxTotal]
  );

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: `${e.name} — ${e.department}`,
  }));

  const updateScore = (key: keyof PerformanceScores, value: number, max: number) => {
    setScores((prev) => ({ ...prev, [key]: clampScore(value, max) }));
  };

  useEffect(() => {
    if (!bonusOverridden) {
      setBonusAmount(suggestedBonus);
    }
  }, [suggestedBonus, bonusOverridden]);

  const handleResetBonus = () => {
    setBonusOverridden(false);
    setBonusAmount(suggestedBonus);
  };

  const handleBonusChange = (value: number) => {
    setBonusAmount(value);
    setBonusOverridden(value !== suggestedBonus);
  };

  const handleSubmit = () => {
    if (!employeeId) {
      toast.error('Please select an employee');
      return;
    }

    const payload: SavePerformancePayload = {
      employeeId,
      period,
      scores: normalizeScores(scores, criteria),
      bonusAmount,
      bonusOverridden,
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
        {!config ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading scoring configuration...</p>
        ) : (
          <>
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
            <p className="text-sm text-gray-500">{record.department} · {record.position}</p>
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

          <div className="rounded-xl border border-gray-100 p-5 space-y-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Bonus / Penalty</p>
            <p className="text-sm text-gray-600">{getBonusRuleLabel(totalScore, bonusRules)}</p>
            <p className="text-sm">
              Suggested:{' '}
              <span className={cn('font-black', suggestedBonus < 0 ? 'text-red-600' : 'text-emerald-700')}>
                {formatPkrAmount(suggestedBonus)}
              </span>
            </p>

            <div>
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2 block">
                Final Bonus (Editable)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step={500}
                  value={bonusAmount}
                  onChange={(e) => handleBonusChange(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary-100 outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="gap-2 rounded-xl h-10 font-bold px-4 shrink-0"
                  onClick={handleResetBonus}
                  title="Reset to suggested"
                >
                  <RotateCcw size={16} />
                  Reset
                </Button>
              </div>
              {bonusOverridden && (
                <p className="text-xs text-amber-600 font-semibold mt-2">Manually overridden from suggested amount</p>
              )}
            </div>
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
          </>
        )}
      </div>
    </Modal>
  );
};

export default EmployeePerformanceModal;
