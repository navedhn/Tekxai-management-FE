import React, { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  useGetPerformanceConfig,
  useResetPerformanceConfigMutation,
  useSavePerformanceConfigMutation,
} from '@/services/performanceScoringService';
import type { BonusRule, PerformanceConfig, ScoringCriterion } from '@/types/performanceScoring';
import {
  formatPkrAmount,
  formatRuleRangeLabel,
  getMaxTotalScore,
  inferBonusRuleType,
  normalizePerformanceConfig,
} from '@/utils/performanceScoring';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react';

const ScoringConfigPanel: React.FC<{ className?: string }> = ({ className }) => {
  const toast = useToastContext();
  const { data: savedConfig, isLoading } = useGetPerformanceConfig();
  const saveMutation = useSavePerformanceConfigMutation();
  const resetMutation = useResetPerformanceConfigMutation();

  const [draft, setDraft] = useState<PerformanceConfig | null>(null);

  useEffect(() => {
    if (savedConfig) setDraft(structuredClone(savedConfig));
  }, [savedConfig]);

  const totalMax = useMemo(
    () => (draft ? getMaxTotalScore(draft.criteria) : 100),
    [draft]
  );

  const updateCriterion = (index: number, patch: Partial<ScoringCriterion>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const criteria = [...prev.criteria];
      const next = { ...criteria[index], ...patch };
      if (patch.max != null && patch.weight == null) {
        next.weight = patch.max;
      }
      criteria[index] = next;
      return { ...prev, criteria };
    });
  };

  const updateRule = (index: number, patch: Partial<BonusRule>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const bonusRules = [...prev.bonusRules];
      bonusRules[index] = { ...bonusRules[index], ...patch };
      return { ...prev, bonusRules };
    });
  };

  const addRule = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bonusRules: [
          ...prev.bonusRules,
          { id: `rule-${Date.now()}`, min: 0, max: 100, bonus: 0 },
        ],
      };
    });
  };

  const removeRule = (index: number) => {
    setDraft((prev) => {
      if (!prev || prev.bonusRules.length <= 1) return prev;
      return {
        ...prev,
        bonusRules: prev.bonusRules.filter((_, i) => i !== index),
      };
    });
  };

  const handleSave = () => {
    if (!draft) return;
    const normalized = normalizePerformanceConfig(draft);
    if (getMaxTotalScore(normalized.criteria) !== 100) {
      toast.warning('Criteria max points should total 100 for standard scoring.');
    }
    saveMutation.mutate(normalized, {
      onSuccess: () => toast.success('Scoring configuration saved'),
      onError: () => toast.error('Failed to save configuration'),
    });
  };

  const handleReset = () => {
    resetMutation.mutate(undefined, {
      onSuccess: (config) => {
        setDraft(structuredClone(config));
        toast.info('Configuration reset to defaults');
      },
    });
  };

  if (isLoading || !draft) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
        <Card className="p-5 h-48 animate-pulse bg-gray-50 border-none" />
        <Card className="p-5 h-48 animate-pulse bg-gray-50 border-none" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4 w-full min-w-0', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-500 font-medium min-w-0 flex-1">
          Edit category weights and bonus tiers. Changes apply to new calculations immediately.
        </p>
        <div className="flex flex-wrap gap-2 shrink-0 justify-end md:justify-end w-full md:w-auto">
          <Button
            variant="outline"
            size="md"
            className="gap-2 rounded-xl h-10 font-bold px-6"
            loading={resetMutation.isPending}
            onClick={handleReset}
          >
            <RotateCcw size={18} />
            Reset Defaults
          </Button>
          <Button
            variant="primary"
            size="md"
            className="gap-2 rounded-xl h-10 font-black px-6 shadow-lg shadow-primary-100"
            loading={saveMutation.isPending}
            onClick={handleSave}
          >
            <Save size={18} />
            Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 border-none shadow-sm bg-white">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Scoring Criteria</h3>
            <span
              className={cn(
                'text-xs font-bold px-2 py-1 rounded-lg',
                totalMax === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              )}
            >
              Total: {totalMax}/100
            </span>
          </div>
          <div className="space-y-4">
            {draft.criteria.map((c, index) => (
              <div key={c.key} className="rounded-xl border border-gray-100 p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Label</label>
                    <input
                      value={c.label}
                      onChange={(e) => updateCriterion(index, { label: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Short label</label>
                    <input
                      value={c.shortLabel}
                      onChange={(e) => updateCriterion(index, { shortLabel: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Max pts</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={c.max}
                        onChange={(e) => updateCriterion(index, { max: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Weight %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={c.weight}
                        onChange={(e) => updateCriterion(index, { weight: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Description</label>
                    <textarea
                      value={c.description}
                      onChange={(e) => updateCriterion(index, { description: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs resize-none outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-none shadow-sm bg-white">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Bonus & Penalty Rules</h3>
            <Button variant="outline" size="md" className="gap-2 rounded-xl h-10 font-bold px-6" onClick={addRule}>
              <Plus size={18} />
              Add Rule
            </Button>
          </div>
          <div className="space-y-3">
            {draft.bonusRules.map((rule, index) => {
              const type = inferBonusRuleType(rule.bonus);
              return (
                <div
                  key={rule.id}
                  className={cn(
                    'rounded-xl border p-3 space-y-2',
                    type === 'penalty' && 'border-red-100 bg-red-50/50',
                    type === 'bonus' && 'border-emerald-100 bg-emerald-50/40',
                    type === 'none' && 'border-gray-100 bg-gray-50/80'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-600">
                      {formatRuleRangeLabel(rule.min, rule.max)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRule(index)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      aria-label="Remove rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase">Min</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={rule.min}
                        onChange={(e) => updateRule(index, { min: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase">Max</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={rule.max}
                        onChange={(e) => updateRule(index, { max: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase">PKR</label>
                      <input
                        type="number"
                        step={500}
                        value={rule.bonus}
                        onChange={(e) => updateRule(index, { bonus: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] font-semibold text-gray-500">
                    {type === 'penalty'
                      ? `${formatPkrAmount(rule.bonus)} fine`
                      : rule.bonus === 0
                        ? 'No bonus'
                        : formatPkrAmount(rule.bonus)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ScoringConfigPanel;
