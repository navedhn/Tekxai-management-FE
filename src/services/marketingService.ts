import {
  MarketingTeam,
  MarketingTeamId,
  PayrollSummary,
  SalaryBuilderMember,
  SalaryHistoryRecord,
  TeamMember,
  WonDeal,
} from '@/types/marketing';

export const MARKETING_TEAMS: MarketingTeam[] = [
  { id: 'sales', label: 'Tekxai Sales Team' },
  { id: 'intern', label: 'Intern BDs' },
];

export const EXCHANGE_RATE_USD_TO_PKR = 278.24;

export const formatPkr = (amount: number) =>
  `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatUsd = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const pkrToUsd = (pkr: number) => pkr / EXCHANGE_RATE_USD_TO_PKR;

export const HR_DOCUMENT_TEMPLATES = {
  offer_letter: [
    { label: 'Standard Offer Letter', value: 'standard' },
    { label: 'Sales Team Offer', value: 'sales' },
    { label: 'Intern Offer', value: 'intern' },
  ],
  contract: [
    { label: 'Employment Contract', value: 'employment' },
    { label: 'Commission-Based Contract', value: 'commission' },
    { label: 'Internship Agreement', value: 'internship' },
  ],
};

const SALES_MEMBERS: TeamMember[] = [
  { id: 'm1', name: 'Mohib Ur Rehman', email: 'mohib@tekxai.com', role: 'Sales Person', teamId: 'sales', month: 'June 2026', status: null, totalPkr: null, offerLetterStatus: 'signed', contractStatus: 'signed' },
  { id: 'm2', name: 'Ayan Rasheed', email: 'ayan@tekxai.com', role: 'Sales Person', teamId: 'sales', month: 'June 2026', status: null, totalPkr: null, offerLetterStatus: 'sent', contractStatus: 'not_sent' },
  { id: 'm3', name: 'Mahnoor Abdul Razzaq', email: 'mahnoor@tekxai.com', role: 'Sales Person', teamId: 'sales', month: 'June 2026', status: 'published', totalPkr: 60868, offerLetterStatus: 'signed', contractStatus: 'signed' },
  { id: 'm4', name: 'Hassan Ali', email: 'hassan@tekxai.com', role: 'Sales Person', teamId: 'sales', month: 'June 2026', status: 'draft', totalPkr: null, offerLetterStatus: 'not_sent', contractStatus: 'not_sent' },
  { id: 'm5', name: 'Sara Khan', email: 'sara@tekxai.com', role: 'Sales Person', teamId: 'sales', month: 'June 2026', status: null, totalPkr: null, offerLetterStatus: 'sent', contractStatus: 'sent' },
];

const INTERN_MEMBERS: TeamMember[] = [
  { id: 'i1', name: 'Ali Raza', email: 'ali.raza@tekxai.com', role: 'Intern BD', teamId: 'intern', month: 'June 2026', status: null, totalPkr: null, offerLetterStatus: 'signed', contractStatus: 'not_sent' },
  { id: 'i2', name: 'Fatima Noor', email: 'fatima@tekxai.com', role: 'Intern BD', teamId: 'intern', month: 'June 2026', status: 'pending', totalPkr: null, offerLetterStatus: 'not_sent', contractStatus: 'not_sent' },
  { id: 'i3', name: 'Usman Tariq', email: 'usman@tekxai.com', role: 'Intern BD', teamId: 'intern', month: 'June 2026', status: null, totalPkr: null, offerLetterStatus: 'sent', contractStatus: 'sent' },
];

const WON_DEALS: WonDeal[] = [
  { id: 'd1', date: 'Apr 30, 2026', salespersonId: 'm1', salespersonName: 'Mohib Ur Rehman', source: 'Upwork', leadJob: 'Web Development and Designing (CHOL)', contact: '—', teamId: 'intern', revenueUsd: 4200 },
  { id: 'd2', date: 'Apr 28, 2026', salespersonId: 'm2', salespersonName: 'Ayan Rasheed', source: 'Upwork', leadJob: 'Scoot Web fixes', contact: '—', teamId: 'intern', revenueUsd: 1850 },
  { id: 'd3', date: 'Apr 25, 2026', salespersonId: 'i1', salespersonName: 'Ali Raza', source: 'Upwork', leadJob: 'Jay Gerber (Cannabis)', contact: '—', teamId: 'intern', revenueUsd: 3100 },
  { id: 'd4', date: 'Apr 22, 2026', salespersonId: 'i2', salespersonName: 'Fatima Noor', source: 'Upwork', leadJob: 'E-commerce Store Setup', contact: '—', teamId: 'intern', revenueUsd: 2750 },
  { id: 'd5', date: 'Apr 18, 2026', salespersonId: 'm1', salespersonName: 'Mohib Ur Rehman', source: 'Upwork', leadJob: 'React Dashboard UI', contact: '—', teamId: 'intern', revenueUsd: 3400 },
  { id: 'd6', date: 'Apr 15, 2026', salespersonId: 'i3', salespersonName: 'Usman Tariq', source: 'Upwork', leadJob: 'WordPress Theme Customization', contact: '—', teamId: 'intern', revenueUsd: 1200 },
  { id: 'd7', date: 'Apr 12, 2026', salespersonId: 'm2', salespersonName: 'Ayan Rasheed', source: 'Upwork', leadJob: 'Mobile App Bug Fixes', contact: '—', teamId: 'intern', revenueUsd: 980 },
  { id: 'd8', date: 'Apr 10, 2026', salespersonId: 'i1', salespersonName: 'Ali Raza', source: 'Upwork', leadJob: 'Landing Page Design', contact: '—', teamId: 'intern', revenueUsd: 1500 },
  { id: 'd9', date: 'Apr 8, 2026', salespersonId: 'm3', salespersonName: 'Mahnoor Abdul Razzaq', source: 'Upwork', leadJob: 'API Integration Project', contact: '—', teamId: 'intern', revenueUsd: 5200 },
  { id: 'd10', date: 'Apr 5, 2026', salespersonId: 'i2', salespersonName: 'Fatima Noor', source: 'Upwork', leadJob: 'Shopify Store Migration', contact: '—', teamId: 'intern', revenueUsd: 2900 },
  { id: 'd11', date: 'Apr 3, 2026', salespersonId: 'm4', salespersonName: 'Hassan Ali', source: 'Upwork', leadJob: 'CRM Data Entry', contact: '—', teamId: 'intern', revenueUsd: 857 },
  { id: 'd12', date: 'Apr 1, 2026', salespersonId: 'm5', salespersonName: 'Sara Khan', source: 'Upwork', leadJob: 'SEO Content Writing', contact: '—', teamId: 'intern', revenueUsd: 1600 },
  { id: 's1', date: 'May 28, 2026', salespersonId: 'm1', salespersonName: 'Mohib Ur Rehman', source: 'Upwork', leadJob: 'Enterprise SaaS Dashboard', contact: '—', teamId: 'sales', revenueUsd: 8500 },
  { id: 's2', date: 'May 20, 2026', salespersonId: 'm2', salespersonName: 'Ayan Rasheed', source: 'Upwork', leadJob: 'Fintech Mobile App', contact: '—', teamId: 'sales', revenueUsd: 12000 },
  { id: 's3', date: 'May 15, 2026', salespersonId: 'm3', salespersonName: 'Mahnoor Abdul Razzaq', source: 'LinkedIn', leadJob: 'Healthcare Portal', contact: '—', teamId: 'sales', revenueUsd: 6500 },
];

const SALARY_HISTORY: SalaryHistoryRecord[] = [
  { id: 'sh1', employeeName: 'Ayan Rasheed', period: 'May 2026', basicPkr: 70000, commissionPkr: 55682, deductionsPkr: 9132, grandTotalPkr: 60868, status: 'published', teamId: 'sales' },
  { id: 'sh2', employeeName: 'Mahnoor Abdul Razzaq', period: 'May 2026', basicPkr: 70000, commissionPkr: 42000, deductionsPkr: 0, grandTotalPkr: 112000, status: 'published', teamId: 'sales' },
  { id: 'sh3', employeeName: 'Mohib Ur Rehman', period: 'May 2026', basicPkr: 75000, commissionPkr: 60868, deductionsPkr: 5000, grandTotalPkr: 130868, status: 'published', teamId: 'sales' },
  { id: 'sh4', employeeName: 'Hassan Ali', period: 'May 2026', basicPkr: 65000, commissionPkr: 28000, deductionsPkr: 2000, grandTotalPkr: 91000, status: 'published', teamId: 'sales' },
  { id: 'sh5', employeeName: 'Ali Raza', period: 'May 2026', basicPkr: 35000, commissionPkr: 15000, deductionsPkr: 0, grandTotalPkr: 50000, status: 'published', teamId: 'intern' },
];

const SALARY_BUILDERS: Record<string, SalaryBuilderMember> = {
  m1: {
    id: 'm1',
    name: 'Mohib Ur Rehman',
    teamId: 'sales',
    teamLabel: 'Tekxai Sales Team',
    period: 'June 2026',
    status: 'draft',
    basicSalaryPkr: 0,
    deductionsPkr: 0,
    deductionReason: '',
    allowances: [
      { id: 'a1', label: 'Bonus', amountPkr: 0 },
      { id: 'a2', label: 'Fuel Allowance', amountPkr: 0 },
      { id: 'a3', label: 'Food Allowance', amountPkr: 0 },
    ],
    commissionPkr: 0,
  },
};

export const getTeamLabel = (teamId: MarketingTeamId) =>
  MARKETING_TEAMS.find(t => t.id === teamId)?.label ?? teamId;

export const getTeamMembers = (teamId: MarketingTeamId): TeamMember[] =>
  teamId === 'intern' ? INTERN_MEMBERS : SALES_MEMBERS;

export const getPayrollSummary = (teamId: MarketingTeamId, _period: string): PayrollSummary => {
  const members = getTeamMembers(teamId);
  const published = members.filter(m => m.status === 'published').length;
  const drafts = members.filter(m => m.status === 'draft').length;
  const pending = members.filter(m => !m.status || m.status === 'pending').length;

  return {
    published,
    drafts,
    pending: teamId === 'sales' ? 13 : pending,
    totalPayrollPkr: 0,
    totalPayrollUsd: 0,
    commissionPkr: 0,
    commissionUsd: 0,
    deductionsPkr: 0,
  };
};

export const getWonDeals = (teamId: MarketingTeamId): WonDeal[] =>
  WON_DEALS.filter(d => d.teamId === teamId);

export const getWonDealsStats = (deals: WonDeal[]) => {
  const totalRevenue = deals.reduce((sum, d) => sum + d.revenueUsd, 0);
  const upworkCount = deals.filter(d => d.source === 'Upwork').length;
  const linkedInCount = deals.filter(d => d.source === 'LinkedIn').length;

  return {
    totalDeals: deals.length,
    totalRevenue,
    avgDealSize: deals.length ? totalRevenue / deals.length : 0,
    upworkCount,
    linkedInCount,
  };
};

export const getSalaryHistory = (teamId: MarketingTeamId): SalaryHistoryRecord[] =>
  SALARY_HISTORY.filter(r => r.teamId === teamId);

export const getSalaryBuilderMember = (memberId: string): SalaryBuilderMember | null => {
  const member = [...SALES_MEMBERS, ...INTERN_MEMBERS].find(m => m.id === memberId);
  if (!member) return null;

  if (SALARY_BUILDERS[memberId]) return SALARY_BUILDERS[memberId];

  return {
    id: member.id,
    name: member.name,
    teamId: member.teamId,
    teamLabel: getTeamLabel(member.teamId),
    period: member.month,
    status: 'draft',
    basicSalaryPkr: 0,
    deductionsPkr: 0,
    deductionReason: '',
    allowances: [
      { id: 'a1', label: 'Bonus', amountPkr: 0 },
      { id: 'a2', label: 'Fuel Allowance', amountPkr: 0 },
      { id: 'a3', label: 'Food Allowance', amountPkr: 0 },
    ],
    commissionPkr: 0,
  };
};

export const getMemberWonDeals = (memberId: string, period: string): WonDeal[] => {
  const month = period.split(' ')[0];
  return WON_DEALS.filter(d => d.salespersonId === memberId && d.date.includes(month.slice(0, 3)));
};

export const PERIOD_OPTIONS = [
  { label: 'Jun 2026', value: 'June 2026' },
  { label: 'May 2026', value: 'May 2026' },
  { label: 'Apr 2026', value: 'April 2026' },
];
