import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { unwrapApiData } from '@/utils/apiResponse';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';
import type { DevopsAccessTracking, DevopsAccessUpdatePayload } from '@/types/devopsAccess';

const getDevopsAccessApi = (projectId: string) =>
  apiRequest<any>(API_ENDPOINTS.DEVOPS_ACCESS.GET(projectId)).then(unwrapApiData<DevopsAccessTracking>);

const updateDevopsAccessApi = (projectId: string, data: DevopsAccessUpdatePayload) =>
  apiRequest<any>(API_ENDPOINTS.DEVOPS_ACCESS.UPDATE(projectId), {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then(unwrapApiData<DevopsAccessTracking>);

export const useDevopsAccess = (projectId: string | null) => {
  return useQuery<DevopsAccessTracking>({
    queryKey: QUERY_KEYS.DEVOPS_ACCESS.DETAIL(projectId || ''),
    queryFn: () => getDevopsAccessApi(projectId!),
    enabled: !!projectId,
  });
};

export const useUpdateDevopsAccess = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DevopsAccessUpdatePayload) => updateDevopsAccessApi(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEVOPS_ACCESS.DETAIL(projectId) });
    },
  });
};
