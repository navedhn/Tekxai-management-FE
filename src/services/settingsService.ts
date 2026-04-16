import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export interface SettingsPreferences {
  show_notifications: boolean;
  language: string;
}

export const useGetMySettingsQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: QUERY_KEYS.SETTINGS.ME,
    queryFn: () => apiRequest(API_ENDPOINTS.SETTINGS.ME),
    enabled,
  });
};

export const useUpdatePreferencesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SettingsPreferences) => 
      apiRequest(API_ENDPOINTS.SETTINGS.PREFERENCES, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS.ME });
    },
  });
};

export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: (data: any) => 
      apiRequest(API_ENDPOINTS.SETTINGS.PASSWORD, { method: 'PATCH', body: JSON.stringify(data) }),
  });
};
