import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export interface ZoomChatStatus {
  connected: boolean;
  zoom_email: string | null;
  configured: boolean;
}

export interface ZoomConversation {
  type: 'channel' | 'contact';
  id: string;
  name: string;
  email?: string;
  presence_status?: string;
  // Zoom's own raw channel type (1 = private, 2 = public) — only present
  // when type === 'channel'. Used to split "Group Chats" (private) from
  // "Channels" (public) in the sidebar using real data, since Zoom's API
  // has no separate group-chat listing endpoint.
  channel_type?: number;
}

export interface ZoomConversationsResult {
  channels: ZoomConversation[];
  contacts: ZoomConversation[];
  next_page_token: string | null;
}

export interface ZoomMessage {
  id: string;
  sender: string;
  sender_display_name: string;
  message: string;
  date_time?: string;
  timestamp?: string;
  edited: boolean;
  files: { file_name: string; file_size?: number }[];
}

export interface ZoomMessagesResult {
  messages: ZoomMessage[];
  next_page_token: string | null;
}

export interface ZoomSendResult {
  id: string;
  message: string;
  sent_at: string;
}

function unwrap<T>(r: any): T {
  return r?.payload as T;
}

// A raw thrown value from apiRequest looks like { status, data, message }
// (see queryClient.ts) — ZOOM_REAUTH_REQUIRED/ZOOM_NOT_CONNECTED are the
// two backend error "codes" (plain message strings, not a `code` field —
// matches this codebase's existing app_error() convention) the UI needs to
// distinguish from a generic failure.
export function isZoomReauthError(err: any): boolean {
  return String(err?.message || err?.data?.message || '').includes('ZOOM_REAUTH_REQUIRED');
}
export function isZoomNotConnectedError(err: any): boolean {
  return String(err?.message || err?.data?.message || '').includes('ZOOM_NOT_CONNECTED');
}

export const useZoomChatStatus = () =>
  useQuery<ZoomChatStatus>({
    queryKey: ['zoom-chat-status'],
    queryFn: async () => unwrap<ZoomChatStatus>(await apiRequest<any>(API_ENDPOINTS.ZOOM_CHAT.STATUS)),
  });

export const useStartZoomConnect = () =>
  useMutation({
    mutationFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.ZOOM_CHAT.AUTHORIZE_URL);
      const { url } = unwrap<{ url: string }>(r);
      window.location.href = url; // full-page navigation to Zoom's own consent screen
    },
  });

export const useDisconnectZoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ZOOM_CHAT.DISCONNECT, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zoom-chat-status'] }),
  });
};

export const useZoomConversations = (enabled: boolean) =>
  useQuery<ZoomConversationsResult>({
    queryKey: ['zoom-chat-conversations'],
    queryFn: async () => unwrap<ZoomConversationsResult>(await apiRequest<any>(API_ENDPOINTS.ZOOM_CHAT.CONVERSATIONS)),
    enabled,
    retry: false,
  });

// Plain async function, not a react-query mutation hook — the composer
// manages its own local pending/error state (matching how
// ZoomChatPanel.tsx already fetches messages via direct apiRequest calls
// rather than a hook, so append-after-send stays simple and predictable).
export async function sendZoomMessage(target: { to_channel?: string; to_contact?: string }, message: string): Promise<ZoomSendResult> {
  const r = await apiRequest<any>(API_ENDPOINTS.ZOOM_CHAT.MESSAGES, {
    method: 'POST',
    body: JSON.stringify({ ...target, message }),
  });
  return unwrap<ZoomSendResult>(r);
}

export const useZoomMessages = (
  target: { to_channel?: string; to_contact?: string } | null,
  nextPageToken?: string,
) =>
  useQuery<ZoomMessagesResult>({
    queryKey: ['zoom-chat-messages', target?.to_channel || target?.to_contact, nextPageToken],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (target?.to_channel) params.set('to_channel', target.to_channel);
      if (target?.to_contact) params.set('to_contact', target.to_contact);
      if (nextPageToken) params.set('next_page_token', nextPageToken);
      const r = await apiRequest<any>(`${API_ENDPOINTS.ZOOM_CHAT.MESSAGES}?${params.toString()}`);
      return unwrap<ZoomMessagesResult>(r);
    },
    enabled: !!target && (!!target.to_channel || !!target.to_contact),
    retry: false,
  });
