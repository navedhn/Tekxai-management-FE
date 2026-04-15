import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

const fetchUsersApi = async (params?: Record<string, any>) => {
  // Filter out undefined, null, and empty strings
  const filteredParams = params 
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
    : {};
    
  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${API_ENDPOINTS.USER.LIST}?${queryString}` : API_ENDPOINTS.USER.LIST;
  return apiRequest(url);
};

export const useFetchUsersQuery = (params?: Record<string, any>, enabled: boolean = true) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.USER.LIST, params],
    queryFn: () => fetchUsersApi(params),
    enabled,
  });
};

export const useLazyFetchUsersQuery = (params?: Record<string, any>) => {
  const query = useQuery({
    queryKey: [...QUERY_KEYS.USER.LIST, params],
    queryFn: () => fetchUsersApi(params),
    enabled: false,
  });
  
  return {
    ...query,
    fetchUsers: (params?: Record<string, any>) => {
      return query.refetch();
    },
  };
};

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest(API_ENDPOINTS.USER.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.LIST });
    },
  });
};

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => 
      apiRequest(API_ENDPOINTS.USER.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.LIST });
    },
  });
};

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => apiRequest(API_ENDPOINTS.USER.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.LIST });
    },
  });
};

export const useBulkUpdateUsersMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest(API_ENDPOINTS.USER.UPDATE_MANY, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.LIST });
    },
  });
};

export const useBulkDeleteUsersMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest(API_ENDPOINTS.USER.DELETE_MANY, { method: 'DELETE', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.LIST });
    },
  });
};
