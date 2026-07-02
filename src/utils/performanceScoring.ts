import type { PerformanceScores, ScoringCriterion, BonusTier } from '@/types/performanceScoring';

export type { ScoringCriterion, BonusTier };

// Fixed to match the real backend columns (employee_performance_scores) —
// these aren't admin-editable since the columns themselves are fixed.
export const SCORING_CRITERIA: ScoringCriterion[] = [
  {
    key: 'quality_score',
    label: 'Quality Score',
    shortLabel: 'Quality',
    max: 30,
    description: 'Code quality, bugs, testing, client feedback, and rework.',
  },
  {
    key: 'timely_delivery',
    label: 'Timely Delivery',
    shortLabel: 'Delivery',
    max: 30,
    description: 'Meeting deadlines, completing assigned tasks, and delivery quality.',
  },
  {
    key: 'regularity',
    label: 'Regularity',
    shortLabel: 'Regularity',
    max: 15,
    description: 'Attendance and consistency showing up for work.',
  },
  {
    key: 'punctuality',
    label: 'Punctuality',
    shortLabel: 'Punctuality',
    max: 15,
    description: 'On-time login, meetings, and task check-ins.',
  },
  {
    key: 'dress_code',
    label: 'Dress Code',
    shortLabel: 'Dress Code',
    max: 10,
    description: 'Professional appearance and adherence to dress code policy.',
  },
];

export const EMPTY_SCORES: PerformanceScores = {
  quality_score: 0,
  timely_delivery: 0,
  regularity: 0,
  punctuality: 0,
  dress_code: 0,
};

export const clampScore = (value: number, max: number): number =>
  Math.min(max, Math.max(0, Number.isFinite(value) ? value : 0));

export const getMaxTotalScore = (criteria: ScoringCriterion[] = SCORING_CRITERIA): number =>
  criteria.reduce((sum, c) => sum + (Number.isFinite(c.max) ? Math.max(0, c.max) : 0), 0);

export const calculateTotalScore = (
  scores: PerformanceScores,
  criteria: ScoringCriterion[] = SCORING_CRITERIA
): number => criteria.reduce((sum, c) => sum + clampScore(scores[c.key], c.max), 0);

export const normalizeScores = (
  scores: PerformanceScores,
  criteria: ScoringCriterion[] = SCORING_CRITERIA
): PerformanceScores =>
  criteria.reduce(
    (acc, c) => ({ ...acc, [c.key]: clampScore(scores[c.key], c.max) }),
    {} as PerformanceScores
  );

export const getScoreGrade = (totalScore: number, maxTotal = 100): { label: string; color: string } => {
  const pct = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0;
  if (pct >= 90) return { label: 'Outstanding', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (pct >= 80) return { label: 'Excellent', color: 'text-blue-700 bg-blue-50 border-blue-200' };
  if (pct >= 70) return { label: 'Good', color: 'text-sky-700 bg-sky-50 border-sky-200' };
  if (pct >= 60) return { label: 'Satisfactory', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  if (pct >= 40) return { label: 'Needs Improvement', color: 'text-orange-700 bg-orange-50 border-orange-200' };
  return { label: 'Critical', color: 'text-red-700 bg-red-50 border-red-200' };
};

/** Look up the matching tier for a score, e.g. for a "suggested bonus" preview
 * while entering scores. Actual bonus records are calculated/approved/paid
 * server-side via the separate /performance/bonus endpoints. */
export const findBonusTier = (totalScore: number, tiers: BonusTier[]): BonusTier | null =>
  tiers.find((t) => totalScore >= t.min_score && totalScore <= t.max_score) || null;

export const formatPkrAmount = (amount: number): string => {
  const prefix = amount < 0 ? '- PKR ' : 'PKR ';
  return `${prefix}${Math.abs(amount).toLocaleString('en-PK')}`;
};

export const getCurrentPeriod = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
