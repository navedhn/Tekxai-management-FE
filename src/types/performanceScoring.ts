// These field names match the real backend columns exactly
// (employee_performance_scores in schema.prisma) — do not rename without
// also updating the backend.
export type ScoringCategoryKey =
  | 'timely_delivery'
  | 'quality_score'
  | 'regularity'
  | 'punctuality'
  | 'dress_code';

export type PerformanceScores = Record<ScoringCategoryKey, number>;

export interface EmployeePerformanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  avatar?: string;
  period: string;
  scores: PerformanceScores;
  totalScore: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
}

export type SavePerformancePayload = {
  employeeId: string;
  period: string;
  scores: PerformanceScores;
  notes?: string;
};

export interface ScoringCriterion {
  key: ScoringCategoryKey;
  label: string;
  shortLabel: string;
  max: number;
  description: string;
}

export interface BonusTier {
  id: string;
  level_name: string;
  min_score: number;
  max_score: number;
  bonus_amount: number;
}
