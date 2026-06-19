import type { PerformanceScores, ScoringCategoryKey, ScoringCriterion, BonusRule } from '@/types/performanceScoring';

export type { ScoringCriterion, BonusRule };

export const DEFAULT_SCORING_CRITERIA: ScoringCriterion[] = [
  {
    key: 'qualityAssurance',
    label: 'Quality Assurance (QA)',
    shortLabel: 'QA',
    max: 30,
    weight: 30,
    description: 'Code quality, bugs, testing, client feedback, and rework.',
  },
  {
    key: 'projectDelivery',
    label: 'Project Delivery',
    shortLabel: 'Delivery',
    max: 30,
    weight: 30,
    description: 'Meeting deadlines, completing assigned tasks, and delivery quality.',
  },
  {
    key: 'punctualityAttendance',
    label: 'Punctuality & Attendance',
    shortLabel: 'Attendance',
    max: 20,
    weight: 20,
    description: 'Login time, attendance, leaves, and meeting punctuality.',
  },
  {
    key: 'teamCollaboration',
    label: 'Team Collaboration & Communication',
    shortLabel: 'Teamwork',
    max: 10,
    weight: 10,
    description: 'Teamwork, communication, and helping team members.',
  },
  {
    key: 'dressCode',
    label: 'Dress Code',
    shortLabel: 'Dress Code',
    max: 10,
    weight: 10,
    description: 'Professional appearance and adherence to dress code policy.',
  },
];

export const DEFAULT_BONUS_RULES: BonusRule[] = [
  { id: 'r1', min: 90, max: 100, bonus: 20_000 },
  { id: 'r2', min: 80, max: 89.99, bonus: 15_000 },
  { id: 'r3', min: 70, max: 79.99, bonus: 10_000 },
  { id: 'r4', min: 60, max: 69.99, bonus: 5_000 },
  { id: 'r5', min: 50, max: 59.99, bonus: 5_000 },
  { id: 'r6', min: 40, max: 49.99, bonus: 0 },
  { id: 'r7', min: 0, max: 39.99, bonus: -5_000 },
];

/** @deprecated Use DEFAULT_SCORING_CRITERIA or loaded config */
export const SCORING_CRITERIA = DEFAULT_SCORING_CRITERIA;

export const EMPTY_SCORES: PerformanceScores = {
  qualityAssurance: 0,
  projectDelivery: 0,
  punctualityAttendance: 0,
  teamCollaboration: 0,
  dressCode: 0,
};

export const clampScore = (value: number, max: number): number =>
  Math.min(max, Math.max(0, Number.isFinite(value) ? value : 0));

export const getMaxTotalScore = (criteria: ScoringCriterion[]): number =>
  criteria.reduce((sum, c) => sum + (Number.isFinite(c.max) ? Math.max(0, c.max) : 0), 0);

export const calculateTotalScore = (
  scores: PerformanceScores,
  criteria: ScoringCriterion[] = DEFAULT_SCORING_CRITERIA
): number => {
  const total = criteria.reduce((sum, c) => sum + clampScore(scores[c.key], c.max), 0);
  return Math.round(total * 100) / 100;
};

export const inferBonusRuleType = (bonus: number): 'bonus' | 'penalty' | 'none' => {
  if (bonus < 0) return 'penalty';
  if (bonus === 0) return 'none';
  return 'bonus';
};

export const formatRuleRangeLabel = (min: number, max: number): string => {
  if (min <= 0 && max < 40) return 'Below 40';
  if (Number.isInteger(min) && Number.isInteger(max)) return `${min} – ${max}`;
  return `${min} – ${max}`;
};

export const calculateSuggestedBonus = (
  totalScore: number,
  rules: BonusRule[] = DEFAULT_BONUS_RULES
): number => {
  const sorted = [...rules].sort((a, b) => b.min - a.min);
  for (const rule of sorted) {
    if (totalScore >= rule.min && totalScore <= rule.max) return rule.bonus;
  }
  return 0;
};

export const getBonusRuleLabel = (
  totalScore: number,
  rules: BonusRule[] = DEFAULT_BONUS_RULES
): string => {
  const bonus = calculateSuggestedBonus(totalScore, rules);
  const range = formatRuleRangeLabel(
    rules.find((r) => totalScore >= r.min && totalScore <= r.max)?.min ?? 0,
    rules.find((r) => totalScore >= r.min && totalScore <= r.max)?.max ?? 0
  );

  if (bonus > 0) return `Score ${range} — ${formatPkrAmount(bonus)} bonus`;
  if (bonus < 0) return `Score ${range} — ${formatPkrAmount(bonus)} penalty`;
  return `Score ${range} — No bonus applied`;
};

export const getScoreGrade = (totalScore: number, maxTotal = 100): { label: string; color: string } => {
  const pct = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0;
  if (pct >= 90) return { label: 'Outstanding', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (pct >= 80) return { label: 'Excellent', color: 'text-blue-700 bg-blue-50 border-blue-200' };
  if (pct >= 70) return { label: 'Good', color: 'text-sky-700 bg-sky-50 border-sky-200' };
  if (pct >= 60) return { label: 'Satisfactory', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  if (pct >= 40) return { label: 'Needs Improvement', color: 'text-orange-700 bg-orange-50 border-orange-200' };
  return { label: 'Critical', color: 'text-red-700 bg-red-50 border-red-200' };
};

export const formatPkrAmount = (amount: number): string => {
  const prefix = amount < 0 ? '- PKR ' : 'PKR ';
  return `${prefix}${Math.abs(amount).toLocaleString('en-PK')}`;
};

export const normalizeScores = (
  scores: PerformanceScores,
  criteria: ScoringCriterion[] = DEFAULT_SCORING_CRITERIA
): PerformanceScores =>
  criteria.reduce(
    (acc, c) => ({ ...acc, [c.key]: clampScore(scores[c.key], c.max) }),
    {} as PerformanceScores
  );

export const normalizePerformanceConfig = (config: {
  criteria: ScoringCriterion[];
  bonusRules: BonusRule[];
}): { criteria: ScoringCriterion[]; bonusRules: BonusRule[] } => {
  const criteria = config.criteria.map((c) => ({
    ...c,
    max: Math.max(0, Number(c.max) || 0),
    weight: Math.max(0, Number(c.weight) || 0),
    label: c.label.trim() || c.key,
    shortLabel: c.shortLabel.trim() || c.label.trim() || c.key,
    description: c.description.trim(),
  }));

  const bonusRules = config.bonusRules
    .map((r, i) => ({
      id: r.id || `rule-${i + 1}`,
      min: Math.max(0, Math.min(100, Number(r.min) || 0)),
      max: Math.max(0, Math.min(100, Number(r.max) || 0)),
      bonus: Number(r.bonus) || 0,
    }))
    .sort((a, b) => b.min - a.min);

  return { criteria, bonusRules };
};

export const getCurrentPeriod = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
