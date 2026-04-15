import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

// --- API Calls ---

export const getInvitesApi = async (params?: Record<string, any>) => {
  const filteredParams = params 
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined))
    : {};
    
  const queryString = Object.keys(filteredParams).length > 0 
    ? '?' + new URLSearchParams(filteredParams).toString() 
    : '';
  return apiRequest(`${API_ENDPOINTS.INVITE.LIST}${queryString}`);
};

export const createInviteApi = async (payload: any) => {
  return apiRequest(API_ENDPOINTS.INVITE.CREATE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const previewInviteTokenApi = async (token: string) => {
  return apiRequest(API_ENDPOINTS.INVITE.PREVIEW(token));
};

export const redeemInviteApi = async (payload: any) => {
  return apiRequest(API_ENDPOINTS.INVITE.REDEEM, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};


export const updateInviteApi = async (id: string | number, payload: any) => {
  return apiRequest(API_ENDPOINTS.INVITE.UPDATE(id), {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const deleteInviteApi = async (id: string | number) => {
  return apiRequest(API_ENDPOINTS.INVITE.DELETE(id), { method: 'DELETE' });
};

export const bulkDeleteInvitesApi = async (payload: any) => {
  return apiRequest(API_ENDPOINTS.INVITE.DELETE_MANY, {
    method: 'DELETE',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const acceptInviteApi = async (id: string | number) => {
  return apiRequest(API_ENDPOINTS.INVITE.ACCEPT(id), { method: 'POST' });
};

// --- Hooks ---

export const useGetInvitesQuery = (params?: Record<string, any>, enabled: boolean = true) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.INVITE.LIST, params],
    queryFn: () => getInvitesApi(params),
    enabled,
  });
};

export const useCreateInviteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInviteApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVITE.LIST });
    },
  });
};

export const useUpdateInviteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => updateInviteApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVITE.LIST });
    },
  });
};

export const useDeleteInviteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInviteApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVITE.LIST });
    },
  });
};

export const useBulkDeleteInvitesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkDeleteInvitesApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVITE.LIST });
    },
  });
};

export const useAcceptInviteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInviteApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVITE.LIST });
    },
  });
};

export const usePreviewInviteTokenQuery = (token: string, enabled: boolean = !!token) => {
  return useQuery({
    queryKey: QUERY_KEYS.INVITE.PREVIEW(token),
    queryFn: () => previewInviteTokenApi(token),
    enabled,
  });
};

export const useRedeemInviteMutation = () => {
  return useMutation({
    mutationFn: redeemInviteApi,
  });
};
