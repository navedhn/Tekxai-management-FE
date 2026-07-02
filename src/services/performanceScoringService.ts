import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';
import { unwrapApiData, unwrapApiList } from '@/utils/apiResponse';
import {
  BonusTier,
  EmployeePerformanceRecord,
  PerformanceScores,
  SavePerformancePayload,
} from '@/types/performanceScoring';
import { calculateTotalScore, getCurrentPeriod, SCORING_CRITERIA } from '@/utils/performanceScoring';

// Raw shape returned by GET /performance/score (matches employee_performance_scores + user relation)
interface RawScoreRecord {
  id: string;
  user_id: string;
  period: string;
  timely_delivery: number;
  quality_score: number;
  regularity: number;
  punctuality: number;
  dress_code: number;
  total_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar?: string | null;
    division?: { id: string; name: string } | null;
  };
}

function toRecord(r: RawScoreRecord): EmployeePerformanceRecord {
  return {
    id: r.id,
    employeeId: r.user_id,
    employeeName: r.user ? `${r.user.first_name} ${r.user.last_name}`.trim() : r.user_id,
    employeeEmail: '',
    department: r.user?.division?.name || '',
    avatar: r.user?.avatar || undefined,
    period: r.period,
    scores: {
      timely_delivery: r.timely_delivery,
      quality_score: r.quality_score,
      regularity: r.regularity,
      punctuality: r.punctuality,
      dress_code: r.dress_code,
    },
    totalScore: r.total_score,
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const fetchRecords = async (period?: string): Promise<EmployeePerformanceRecord[]> => {
  const url = period ? `${API_ENDPOINTS.PERFORMANCE.SCORES}?period=${encodeURIComponent(period)}` : API_ENDPOINTS.PERFORMANCE.SCORES;
  const res = await apiRequest<unknown>(url);
  return unwrapApiList<RawScoreRecord>(res).map(toRecord);
};

const saveRecord = async (payload: SavePerformancePayload): Promise<EmployeePerformanceRecord> => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.PERFORMANCE.SCORES, {
    method: 'POST',
    body: JSON.stringify({
      user_id: payload.employeeId,
      period: payload.period,
      notes: payload.notes,
      ...payload.scores,
    }),
  });
  return toRecord(unwrapApiData<RawScoreRecord>(res));
};

const deleteRecord = async (id: string): Promise<void> => {
  await apiRequest(API_ENDPOINTS.PERFORMANCE.DELETE_SCORE(id), { method: 'DELETE' });
};

const fetchBonusConfig = async (): Promise<BonusTier[]> => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.PERFORMANCE.BONUS_CONFIG);
  return unwrapApiList<BonusTier>(res);
};

export const useGetPerformanceRecords = (period?: string) =>
  useQuery({
    queryKey: [...QUERY_KEYS.PERFORMANCE.LIST, period ?? 'all'],
    queryFn: () => fetchRecords(period),
    staleTime: 30_000,
  });

export const useGetBonusConfig = () =>
  useQuery({
    queryKey: QUERY_KEYS.PERFORMANCE.BONUS_CONFIG,
    queryFn: fetchBonusConfig,
    staleTime: 5 * 60_000,
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

export { calculateTotalScore, SCORING_CRITERIA };
export type { PerformanceScores };
