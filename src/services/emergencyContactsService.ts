import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  relation: string;
  phone: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContactInput {
  name: string;
  relation: string;
  phone: string;
  is_primary?: boolean;
}

export const useGetEmergencyContacts = (userId?: string) =>
  useQuery({
    queryKey: ['emergency-contacts', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMERGENCY_CONTACTS.LIST(userId!)),
    enabled: !!userId,
    select: (r: any) => (r?.payload?.contacts || []) as EmergencyContact[],
  });

export const useCreateEmergencyContact = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmergencyContactInput) =>
      apiRequest<any>(API_ENDPOINTS.EMERGENCY_CONTACTS.CREATE(userId), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergency-contacts', userId] }),
  });
};

export const useUpdateEmergencyContact = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & EmergencyContactInput) =>
      apiRequest<any>(API_ENDPOINTS.EMERGENCY_CONTACTS.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergency-contacts', userId] }),
  });
};

export const useDeleteEmergencyContact = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.EMERGENCY_CONTACTS.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergency-contacts', userId] }),
  });
};
