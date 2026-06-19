export type ScoringCategoryKey =
  | 'qualityAssurance'
  | 'projectDelivery'
  | 'punctualityAttendance'
  | 'teamCollaboration'
  | 'dressCode';

export interface PerformanceScores {
  qualityAssurance: number;
  projectDelivery: number;
  punctualityAttendance: number;
  teamCollaboration: number;
  dressCode: number;
}

export interface EmployeePerformanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  position: string;
  period: string;
  scores: PerformanceScores;
  totalScore: number;
  suggestedBonus: number;
  bonusAmount: number;
  bonusOverridden: boolean;
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
  bonusAmount: number;
  bonusOverridden: boolean;
  notes?: string;
};

export interface ScoringCriterion {
  key: ScoringCategoryKey;
  label: string;
  shortLabel: string;
  max: number;
  weight: number;
  description: string;
}

export interface BonusRule {
  id: string;
  min: number;
  max: number;
  bonus: number;
}

export interface PerformanceConfig {
  criteria: ScoringCriterion[];
  bonusRules: BonusRule[];
}
