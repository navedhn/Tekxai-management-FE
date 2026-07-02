import React from 'react';
import Card from '@/components/ui/Card';
import { useGetBonusConfig, SCORING_CRITERIA } from '@/services/performanceScoringService';
import { formatPkrAmount, getMaxTotalScore } from '@/utils/performanceScoring';
import { cn } from '@/utils/cn';

// Scoring categories are fixed backend columns (not admin-editable) and bonus
// tiers are managed directly in the database — this panel is read-only.
const ScoringConfigPanel: React.FC<{ className?: string }> = ({ className }) => {
  const { data: bonusTiers = [], isLoading } = useGetBonusConfig();
  const totalMax = getMaxTotalScore(SCORING_CRITERIA);

  return (
    <div className={cn('flex flex-col gap-4 w-full min-w-0', className)}>
      <p className="text-sm text-gray-500 font-medium">
        Scoring criteria and bonus tiers for reference.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 border-none shadow-sm bg-white">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Scoring Criteria</h3>
            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
              Total: {totalMax}/100
            </span>
          </div>
          <div className="space-y-3">
            {SCORING_CRITERIA.map((c) => (
              <div key={c.key} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{c.label}</p>
                  <p className="text-xs text-gray-500">{c.description}</p>
                </div>
                <span className="shrink-0 text-xs font-black text-primary-600">{c.max} pts</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-none shadow-sm bg-white">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Bonus & Penalty Tiers</h3>
          {isLoading ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : bonusTiers.length === 0 ? (
            <p className="text-xs text-gray-400">No bonus tiers configured.</p>
          ) : (
            <div className="space-y-2">
              {bonusTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={cn(
                    'rounded-xl border p-3 flex items-center justify-between gap-2',
                    tier.bonus_amount < 0 ? 'border-red-100 bg-red-50/50' :
                    tier.bonus_amount > 0 ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100 bg-gray-50/80'
                  )}
                >
                  <div>
                    <p className="text-xs font-bold text-gray-700">{tier.level_name}</p>
                    <p className="text-[11px] text-gray-500">{tier.min_score} – {tier.max_score} pts</p>
                  </div>
                  <span className={cn('text-sm font-black', tier.bonus_amount < 0 ? 'text-red-600' : 'text-emerald-700')}>
                    {formatPkrAmount(tier.bonus_amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ScoringConfigPanel;
