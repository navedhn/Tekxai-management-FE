import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const v1 = 'api/v1';
export const useGetMyLeaveBalances = (year?: number) =>
  useQuery({ queryKey: ['leave-balances', year], queryFn: async () => { const r = await apiRequest<any>(`${v1}/leave-balance/my${year ? '?year='+year : ''}`); return r?.payload?.records || []; } });
export const useGetUserLeaveBalances = (userId: string, year?: number) =>
  useQuery({ queryKey: ['leave-balances', userId, year], queryFn: async () => { const r = await apiRequest<any>(`${v1}/leave-balance/${userId}${year ? '?year='+year : ''}`); return r?.payload?.records || []; }, enabled: !!userId });
