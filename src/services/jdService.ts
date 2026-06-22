import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const v1 = 'api/v1';
export const useGetMyJD = () => useQuery({ queryKey: ['jd', 'my'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/job-description/my`); return r?.payload; } });
export const useGetUserJD = (userId: string) => useQuery({ queryKey: ['jd', userId], queryFn: async () => { const r = await apiRequest<any>(`${v1}/job-description/${userId}`); return r?.payload; }, enabled: !!userId });
export const useUpsertJDMutation = (userId?: string) => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/job-description/${userId || 'my'}`, { method: 'PUT', body: JSON.stringify(data) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['jd'] }); } }); };
