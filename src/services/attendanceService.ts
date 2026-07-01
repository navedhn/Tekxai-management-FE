import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const v1 = 'api/v1';

export const useGetShiftsQuery = () =>
  useQuery({ queryKey: ['shifts'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/attendance/shifts`); return r?.payload || []; } });

export const useGetViolationsQuery = (params?: Record<string,any>) =>
  useQuery({ queryKey: ['violations', params], queryFn: async () => { const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!=''))).toString() : ''; const r = await apiRequest<any>(`${v1}/attendance/violations${qs}`); return r?.payload || { records: [], total: 0 }; }, staleTime: 30000 });

export const useGetMyShiftQuery = () =>
  useQuery({ queryKey: ['my-shift'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/attendance/my-shift`); return r?.payload; }, staleTime: 60000 });

export const useGetMyAttendanceSummary = (params?: { start_date?: string; end_date?: string }) =>
  useQuery({ queryKey: ['attendance-summary', params], queryFn: async () => { const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''; const r = await apiRequest<any>(`${v1}/attendance/my-summary${qs}`); return r?.payload; }, staleTime: 60000 });

export const useUpsertShiftMutation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/attendance/shifts`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) }); };

export const useAssignShiftMutation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/attendance/shifts/assign`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) }); };

export const useDeleteShiftMutation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest(`${v1}/attendance/shifts/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) }); };
