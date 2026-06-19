import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EmployeePerformanceRecord,
  PerformanceEmployee,
  PerformanceConfig,
  SavePerformancePayload,
} from '@/types/performanceScoring';
import {
  calculateSuggestedBonus,
  calculateTotalScore,
  getCurrentPeriod,
  normalizeScores,
  normalizePerformanceConfig,
  DEFAULT_SCORING_CRITERIA,
  DEFAULT_BONUS_RULES,
} from '@/utils/performanceScoring';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';

const STORAGE_KEY = 'tekxai_employee_performance_scores';
const CONFIG_STORAGE_KEY = 'tekxai_performance_config';

export const getDefaultPerformanceConfig = (): PerformanceConfig => ({
  criteria: structuredClone(DEFAULT_SCORING_CRITERIA),
  bonusRules: structuredClone(DEFAULT_BONUS_RULES),
});

const readConfig = (): PerformanceConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return getDefaultPerformanceConfig();
    return normalizePerformanceConfig(JSON.parse(raw));
  } catch {
    return getDefaultPerformanceConfig();
  }
};

const writeConfig = (config: PerformanceConfig) => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalizePerformanceConfig(config)));
};

const MOCK_EMPLOYEES: PerformanceEmployee[] = [
  { id: 'emp-1', name: 'Arslan Dar', email: 'arslan@tekxai.com', department: 'Engineering', position: 'Senior Developer' },
  { id: 'emp-2', name: 'Mubbashar Ali', email: 'mubbashar@tekxai.com', department: 'Engineering', position: 'Frontend Developer' },
  { id: 'emp-3', name: 'Ali Hamza', email: 'ali.hamza@tekxai.com', department: 'Design', position: 'UI/UX Designer' },
  { id: 'emp-4', name: 'Hammad Khan', email: 'hammad@tekxai.com', department: 'QA', position: 'QA Engineer' },
  { id: 'emp-5', name: 'Sara Ahmed', email: 'sara@tekxai.com', department: 'Engineering', position: 'Backend Developer' },
  { id: 'emp-6', name: 'Usman Tariq', email: 'usman@tekxai.com', department: 'DevOps', position: 'DevOps Engineer' },
];

const seedRecords = (): EmployeePerformanceRecord[] => {
  const period = getCurrentPeriod();
  const samples = [
    { employeeId: 'emp-1', scores: { qualityAssurance: 27, projectDelivery: 28, punctualityAttendance: 18, teamCollaboration: 9, dressCode: 9 } },
    { employeeId: 'emp-2', scores: { qualityAssurance: 22, projectDelivery: 24, punctualityAttendance: 16, teamCollaboration: 8, dressCode: 8 } },
    { employeeId: 'emp-3', scores: { qualityAssurance: 25, projectDelivery: 26, punctualityAttendance: 17, teamCollaboration: 9, dressCode: 10 } },
    { employeeId: 'emp-4', scores: { qualityAssurance: 18, projectDelivery: 20, punctualityAttendance: 14, teamCollaboration: 7, dressCode: 7 } },
  ];

  return samples.map((s, i) => {
    const employee = MOCK_EMPLOYEES.find((e) => e.id === s.employeeId)!;
    const config = readConfig();
    const scores = normalizeScores(s.scores, config.criteria);
    const totalScore = calculateTotalScore(scores, config.criteria);
    const suggestedBonus = calculateSuggestedBonus(totalScore, config.bonusRules);
    const now = new Date().toISOString();
    return {
      id: `perf-seed-${i + 1}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      department: employee.department,
      position: employee.position,
      period,
      scores,
      totalScore,
      suggestedBonus,
      bonusAmount: suggestedBonus,
      bonusOverridden: false,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
  });
};

const readRecords = (): EmployeePerformanceRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedRecords();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as EmployeePerformanceRecord[];
  } catch {
    return seedRecords();
  }
};

const writeRecords = (records: EmployeePerformanceRecord[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const fetchEmployees = async (): Promise<PerformanceEmployee[]> => {
  await delay(200);
  return MOCK_EMPLOYEES;
};

const fetchRecords = async (period?: string): Promise<EmployeePerformanceRecord[]> => {
  await delay(350);
  const records = readRecords().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  if (!period) return records;
  return records.filter((r) => r.period === period);
};

const saveRecord = async (payload: SavePerformancePayload): Promise<EmployeePerformanceRecord> => {
  await delay(400);
  const employee = MOCK_EMPLOYEES.find((e) => e.id === payload.employeeId);
  if (!employee) throw new Error('Employee not found');

  const config = readConfig();
  const scores = normalizeScores(payload.scores, config.criteria);
  const totalScore = calculateTotalScore(scores, config.criteria);
  const suggestedBonus = calculateSuggestedBonus(totalScore, config.bonusRules);
  const now = new Date().toISOString();

  const records = readRecords();
  const existingIdx = records.findIndex(
    (r) => r.employeeId === payload.employeeId && r.period === payload.period
  );

  const record: EmployeePerformanceRecord = {
    id: existingIdx >= 0 ? records[existingIdx].id : `perf-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeEmail: employee.email,
    department: employee.department,
    position: employee.position,
    period: payload.period,
    scores,
    totalScore,
    suggestedBonus,
    bonusAmount: payload.bonusAmount,
    bonusOverridden: payload.bonusOverridden,
    notes: payload.notes ?? '',
    createdAt: existingIdx >= 0 ? records[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) records[existingIdx] = record;
  else records.unshift(record);

  writeRecords(records);
  return record;
};

const deleteRecord = async (id: string): Promise<void> => {
  await delay(250);
  writeRecords(readRecords().filter((r) => r.id !== id));
};

export const useGetPerformanceConfig = () =>
  useQuery({
    queryKey: QUERY_KEYS.PERFORMANCE.CONFIG,
    queryFn: async () => {
      await delay(150);
      return readConfig();
    },
    staleTime: 60_000,
  });

export const useSavePerformanceConfigMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: PerformanceConfig) => {
      await delay(300);
      const normalized = normalizePerformanceConfig(config);
      writeConfig(normalized);
      return normalized;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERFORMANCE.CONFIG });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERFORMANCE.LIST });
    },
  });
};

export const useResetPerformanceConfigMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await delay(200);
      const defaults = getDefaultPerformanceConfig();
      writeConfig(defaults);
      return defaults;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERFORMANCE.CONFIG });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERFORMANCE.LIST });
    },
  });
};

export const useGetPerformanceEmployees = () =>
  useQuery({
    queryKey: QUERY_KEYS.PERFORMANCE.EMPLOYEES,
    queryFn: fetchEmployees,
  });

export const useGetPerformanceRecords = (period?: string) =>
  useQuery({
    queryKey: [...QUERY_KEYS.PERFORMANCE.LIST, period ?? 'all'],
    queryFn: () => fetchRecords(period),
  });

export const useSavePerformanceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERFORMANCE.LIST });
    },
  });
};

export const useDeletePerformanceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERFORMANCE.LIST });
    },
  });
};

export const getPerformancePeriods = (records: EmployeePerformanceRecord[]): string[] => {
  const periods = new Set(records.map((r) => r.period));
  periods.add(getCurrentPeriod());
  return Array.from(periods).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
};
