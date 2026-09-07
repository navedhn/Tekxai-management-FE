import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export interface ServerMember {
  id: string;
  server_id: string;
  user_id: string;
  role: 'MEMBER' | 'ADMIN' | 'OWNER';
  joined_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    designation?: string;
    last_active_at?: string | null;
  };
}

export interface Server {
  id: string;
  name: string;
  icon_url?: string | null;
  description?: string | null;
  created_by?: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  _count?: { members: number; channels: number };
  members?: ServerMember[];
}

export const useGetServersQuery = () =>
  useQuery<Server[]>({
    queryKey: ['servers'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.SERVERS.LIST);
      return r?.payload?.records || [];
    },
  });

export const useGetServerQuery = (serverId: string | null) =>
  useQuery<Server | null>({
    queryKey: ['server', serverId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.SERVERS.DETAIL(serverId!));
      return r?.payload || null;
    },
    enabled: !!serverId,
  });

export const useGetServerChannelsQuery = (serverId: string | null) =>
  useQuery<any[]>({
    queryKey: ['server-channels', serverId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.SERVERS.CHANNELS(serverId!));
      return r?.payload?.records || [];
    },
    enabled: !!serverId,
  });

export const useCreateServerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; icon_url?: string }) =>
      apiRequest<any>(API_ENDPOINTS.SERVERS.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  });
};

export const useAddServerMemberMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { user_id: string; role?: string }) =>
      apiRequest<any>(API_ENDPOINTS.SERVERS.MEMBERS(serverId), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['server', serverId] });
      qc.invalidateQueries({ queryKey: ['servers'] });
    },
  });
};

export const useRemoveServerMemberMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest<any>(API_ENDPOINTS.SERVERS.MEMBER(serverId, userId), { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['server', serverId] });
      qc.invalidateQueries({ queryKey: ['servers'] });
    },
  });
};
