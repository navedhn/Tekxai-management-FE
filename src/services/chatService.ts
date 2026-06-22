import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  member_count?: number;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  reactions?: Record<string, string[]>;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
}

const v1 = 'api/v1';

export const useGetChannels = () =>
  useQuery<Channel[]>({
    queryKey: ['chat-channels'],
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/chat/channels`);
      return r?.payload?.records || r?.payload || [];
    },
  });

export const useGetMessages = (channelId: string | null) =>
  useQuery<Message[]>({
    queryKey: ['chat-messages', channelId],
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/chat/channels/${channelId}/messages`);
      return r?.payload?.records || r?.payload || [];
    },
    enabled: !!channelId,
    refetchInterval: 5000,
  });

export const useSendMessage = (channelId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiRequest<any>(`${v1}/chat/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-messages', channelId] }),
  });
};

export const useJoinChannel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) =>
      apiRequest<any>(`${v1}/chat/channels/${channelId}/join`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-channels'] }),
  });
};

export const useCreateChannel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; is_private?: boolean }) =>
      apiRequest<any>(`${v1}/chat/channels`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-channels'] }),
  });
};
