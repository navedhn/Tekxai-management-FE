export type MarketingTeamId = 'sales' | 'intern';

export interface MarketingTeam {
  id: MarketingTeamId;
  label: string;
}

export type SalaryStatus = 'published' | 'draft' | 'pending';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: MarketingTeamId;
  month: string;
  status?: SalaryStatus | null;
  totalPkr?: number | null;
}

export interface PayrollSummary {
  published: number;
  drafts: number;
  pending: number;
  totalPayrollPkr: number;
  totalPayrollUsd: number;
  commissionPkr: number;
  commissionUsd: number;
  deductionsPkr: number;
}

export type DealSource = 'Upwork' | 'LinkedIn';

export interface WonDeal {
  id: string;
  date: string;
  salespersonId: string;
  salespersonName: string;
  source: DealSource;
  leadJob: string;
  contact: string;
  teamId: MarketingTeamId;
  revenueUsd: number;
}

export interface SalaryAllowance {
  id: string;
  label: string;
  amountPkr: number;
}

export interface SalaryHistoryRecord {
  id: string;
  employeeName: string;
  period: string;
  basicPkr: number;
  commissionPkr: number;
  deductionsPkr: number;
  grandTotalPkr: number;
  status: 'published' | 'draft';
  teamId: MarketingTeamId;
}

export interface SalaryBuilderMember {
  id: string;
  name: string;
  teamId: MarketingTeamId;
  teamLabel: string;
  period: string;
  status: 'draft' | 'published';
  basicSalaryPkr: number;
  deductionsPkr: number;
  deductionReason: string;
  allowances: SalaryAllowance[];
  commissionPkr: number;
}
