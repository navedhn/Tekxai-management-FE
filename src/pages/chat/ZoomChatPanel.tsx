import React, { useEffect, useState } from 'react';
import { Hash, Loader2, LogOut, MessageSquare, RefreshCw, User, Video } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import {
  isZoomNotConnectedError, isZoomReauthError, useDisconnectZoom, useStartZoomConnect,
  useZoomChatStatus, useZoomConversations,
  type ZoomConversation, type ZoomMessage,
} from '@/services/zoomChatService';

// Read-only V1 (see the implementation report). Deliberately self-contained
// and separate from the native channel/message rendering pipeline in
// index.tsx — a Zoom conversation is never a `channels`/`messages` row, so
// there is no code path here that could send, edit, or delete anything in
// Zoom, or accidentally mix a Zoom message into a native TekXAI channel.
export default function ZoomChatPanel() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useZoomChatStatus();
  const startConnect = useStartZoomConnect();
  const disconnect = useDisconnectZoom();
  const [selected, setSelected] = useState<ZoomConversation | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('zoom_chat');
    if (flag) {
      refetchStatus();
      params.delete('zoom_chat');
      params.delete('reason');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (statusLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
        <Video size={32} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-700">Zoom Team Chat isn't set up yet</p>
        <p className="text-xs text-gray-400 max-w-xs">
          This TekXAI environment doesn't have Zoom connected. Ask an administrator to finish the Zoom Marketplace setup.
        </p>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
        <Video size={32} className="text-blue-400" />
        <p className="text-sm font-medium text-gray-700">Connect your Zoom account</p>
        <p className="text-xs text-gray-400 max-w-xs">
          See your own Zoom Team Chat conversations here, read-only. TekXAI never sends messages on your behalf.
        </p>
        <button
          onClick={() => startConnect.mutate()}
          disabled={startConnect.isPending}
          className="mt-1 px-4 py-2 bg-[#0B5CFF] text-white text-sm font-medium rounded-xl hover:bg-[#0047AB] transition-colors disabled:opacity-60"
        >
          {startConnect.isPending ? 'Redirecting to Zoom…' : 'Connect Zoom'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-w-0">
      <div className="w-64 border-r border-gray-100 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Zoom</p>
            <p className="text-xs text-gray-400 truncate">{status.zoom_email}</p>
          </div>
          <button
            onClick={() => disconnect.mutate()}
            title="Disconnect Zoom"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
        <ZoomConversationList selected={selected} onSelect={setSelected} />
      </div>
      <ZoomMessagePane conversation={selected} onReauthRequired={() => disconnect.mutate()} />
    </div>
  );
}

function ZoomConversationList({
  selected, onSelect,
}: { selected: ZoomConversation | null; onSelect: (c: ZoomConversation) => void }) {
  const { data, isLoading, isError, error, refetch } = useZoomConversations(true);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={16} /></div>;
  }
  if (isError) {
    const reauth = isZoomReauthError(error);
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-xs text-gray-500">
          {reauth ? 'Your Zoom authorization expired or was revoked.' : 'Could not load your Zoom conversations.'}
        </p>
        <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const channels = data?.channels || [];
  const contacts = data?.contacts || [];

  if (channels.length === 0 && contacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 text-center">
        <p className="text-xs text-gray-400">No Zoom conversations yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {contacts.length > 0 && (
        <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Direct</div>
      )}
      {contacts.map((c) => (
        <ConversationRow key={`contact-${c.id}`} conv={c} icon={<User size={14} />} active={selected?.id === c.id && selected.type === 'contact'} onClick={() => onSelect(c)} />
      ))}
      {channels.length > 0 && (
        <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Channels</div>
      )}
      {channels.map((c) => (
        <ConversationRow key={`channel-${c.id}`} conv={c} icon={<Hash size={14} />} active={selected?.id === c.id && selected.type === 'channel'} onClick={() => onSelect(c)} />
      ))}
    </div>
  );
}

function ConversationRow({
  conv, icon, active, onClick,
}: { conv: ZoomConversation; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="truncate">{conv.name}</span>
    </button>
  );
}

function ZoomMessagePane({
  conversation, onReauthRequired,
}: { conversation: ZoomConversation | null; onReauthRequired: () => void }) {
  const [messages, setMessages] = useState<ZoomMessage[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async (conv: ZoomConversation, pageToken?: string, append = false) => {
    (append ? setIsLoadingMore : setIsLoading)(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (conv.type === 'channel') params.set('to_channel', conv.id);
      else params.set('to_contact', conv.email || conv.id);
      if (pageToken) params.set('next_page_token', pageToken);
      const r = await apiRequest<any>(`${API_ENDPOINTS.ZOOM_CHAT.MESSAGES}?${params.toString()}`);
      const result = r?.payload as { messages: ZoomMessage[]; next_page_token: string | null };
      setMessages((prev) => (append ? [...prev, ...result.messages] : result.messages));
      setNextPageToken(result.next_page_token || null);
    } catch (e: any) {
      if (isZoomReauthError(e)) {
        setLoadError('Your Zoom authorization expired or was revoked. Reconnecting is required.');
        onReauthRequired();
      } else if (isZoomNotConnectedError(e)) {
        setLoadError('Zoom is no longer connected.');
      } else {
        setLoadError(e?.message || 'Could not load messages from Zoom.');
      }
    } finally {
      (append ? setIsLoadingMore : setIsLoading)(false);
    }
  };

  useEffect(() => {
    if (!conversation) { setMessages([]); setNextPageToken(null); return; }
    load(conversation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, conversation?.type]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
        <MessageSquare size={28} className="text-gray-200" />
        <p className="text-sm text-gray-400">Select a Zoom conversation to view its messages</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2 shrink-0">
        {conversation.type === 'channel' ? <Hash size={14} className="text-gray-400" /> : <User size={14} className="text-gray-400" />}
        <span className="text-sm font-semibold text-gray-900 truncate">{conversation.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={18} /></div>
        ) : loadError ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-xs text-gray-500">{loadError}</p>
            <button onClick={() => load(conversation)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-gray-400">No messages in this conversation yet.</p>
          </div>
        ) : (
          <>
            {nextPageToken && (
              <div className="flex justify-center pb-1">
                <button
                  onClick={() => load(conversation, nextPageToken, true)}
                  disabled={isLoadingMore}
                  className="text-xs text-blue-600 hover:underline disabled:opacity-60"
                >
                  {isLoadingMore ? 'Loading…' : 'Load older messages'}
                </button>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-800">{m.sender_display_name}</span>
                  <span className="text-[11px] text-gray-400">{m.date_time ? new Date(m.date_time).toLocaleString() : m.timestamp}</span>
                  {m.edited && <span className="text-[10px] text-gray-300">(edited)</span>}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{m.message}</p>
                {m.files.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {m.files.map((f, i) => (
                      <span key={i} className="text-xs text-gray-400">📎 {f.file_name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400 shrink-0">
        Read-only — sending Zoom messages from TekXAI isn't supported yet.
      </div>
    </div>
  );
}
