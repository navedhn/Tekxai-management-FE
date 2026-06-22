import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export interface Role {
  id: string;
  name: string;
  level: number;
  is_system: boolean;
}

export const useGetRolesQuery = () =>
  useQuery<Role[]>({
    queryKey: QUERY_KEYS.ROLE.LIST,
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.ROLE.LIST);
      return res?.payload || [];
    },
    staleTime: 300000,
  });
