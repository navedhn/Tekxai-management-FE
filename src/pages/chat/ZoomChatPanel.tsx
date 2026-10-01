import React, { useEffect, useRef, useState } from 'react';
import { Hash, Link2, Loader2, LogOut, MessageSquare, RefreshCw, Search, Send, User, Video } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { getAvatarColor, getInitials } from './chatTypes';
import {
  isZoomNotConnectedError, isZoomReauthError, sendZoomMessage, useDisconnectZoom, useStartZoomConnect,
  useZoomChatStatus, useZoomConversations,
  type ZoomConversation, type ZoomMessage,
} from '@/services/zoomChatService';

export default function ZoomChatPanel() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useZoomChatStatus();
  const startConnect = useStartZoomConnect();
  const disconnect = useDisconnectZoom();
  const [selected, setSelected] = useState<ZoomConversation | null>(null);
  const [search, setSearch] = useState('');

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

  return (
    <div className="flex flex-1 min-w-0 flex-col">
      <WorkspaceHeader />
      <div className="flex flex-1 min-h-0">
        {statusLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : !status?.configured ? (
          <UnavailableState />
        ) : !status.connected ? (
          <ConnectState onConnect={() => startConnect.mutate()} isPending={startConnect.isPending} />
        ) : (
          <>
            <ZoomSidebar
              search={search}
              onSearchChange={setSearch}
              selected={selected}
              onSelect={setSelected}
              zoomEmail={status.zoom_email}
              onDisconnect={() => disconnect.mutate()}
            />
            <ZoomConversationPane conversation={selected} onReauthRequired={() => disconnect.mutate()} />
          </>
        )}
      </div>
    </div>
  );
}

function WorkspaceHeader() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 shrink-0">
      <span className="flex size-7 items-center justify-center rounded-lg bg-[#0B5CFF] text-white shrink-0">
        <Video size={15} />
      </span>
      <h1 className="text-[15px] font-semibold text-gray-900">Zoom Team Chat</h1>
    </div>
  );
}

function UnavailableState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
      <Video size={32} className="text-gray-300" />
      <p className="text-sm font-medium text-gray-700">Zoom Team Chat isn't set up yet</p>
      <p className="text-xs text-gray-400 max-w-sm">
        This TekXAI environment doesn't have Zoom connected. Ask an administrator to finish the Zoom Marketplace
        setup (Team Chat read/write + instant meetings) so everyone can connect and share Zoom from chat.
      </p>
    </div>
  );
}

function ConnectState({ onConnect, isPending }: { onConnect: () => void; isPending: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50">
        <Video size={22} className="text-[#0B5CFF]" />
      </span>
      <p className="text-sm font-semibold text-gray-900">Connect your Zoom account</p>
      <p className="text-xs text-gray-400 max-w-sm">
        Connect Zoom to send Team Chat messages here and to start Zoom meetings from any TekXAI channel or DM (toolbar Video button or <code className="text-[11px]">/zoom</code>).
      </p>
      <button
        onClick={onConnect}
        disabled={isPending}
        className="mt-1 px-4 py-2 bg-[#0B5CFF] text-white text-sm font-medium rounded-xl hover:bg-[#0047AB] transition-colors disabled:opacity-60"
      >
        {isPending ? 'Redirecting to Zoom…' : 'Connect Zoom'}
      </button>
    </div>
  );
}

function ReauthState({ onReconnect, isPending }: { onReconnect: () => void; isPending: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-50">
        <Link2 size={22} className="text-amber-600" />
      </span>
      <p className="text-sm font-semibold text-gray-900">Reconnect Zoom</p>
      <p className="text-xs text-gray-400 max-w-xs">
        Your Zoom connection needs to be reconnected.
      </p>
      <button
        onClick={onReconnect}
        disabled={isPending}
        className="mt-1 px-4 py-2 bg-[#0B5CFF] text-white text-sm font-medium rounded-xl hover:bg-[#0047AB] transition-colors disabled:opacity-60"
      >
        {isPending ? 'Redirecting to Zoom…' : 'Reconnect Zoom'}
      </button>
    </div>
  );
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-br ${getAvatarColor(name)} flex items-center justify-center text-white font-semibold`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {getInitials(name)}
    </div>
  );
}

function ZoomSidebar({
  search, onSearchChange, selected, onSelect, zoomEmail, onDisconnect,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  selected: ZoomConversation | null;
  onSelect: (c: ZoomConversation) => void;
  zoomEmail: string | null;
  onDisconnect: () => void;
}) {
  const { data, isLoading, isError, error, refetch } = useZoomConversations(true);

  const q = search.trim().toLowerCase();
  const contacts = (data?.contacts || []).filter((c) => !q || c.name.toLowerCase().includes(q));
  const allChannels = data?.channels || [];

  const groupChats = allChannels.filter((c) => c.channel_type === 1 && (!q || c.name.toLowerCase().includes(q)));
  const channels = allChannels.filter((c) => c.channel_type !== 1 && (!q || c.name.toLowerCase().includes(q)));

  return (
    <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Zoom chats..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={16} /></div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <p className="text-xs text-gray-500">
              {isZoomReauthError(error) ? 'Your Zoom authorization expired or was revoked.' : 'Could not load your Zoom conversations.'}
            </p>
            <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : contacts.length === 0 && groupChats.length === 0 && channels.length === 0 ? (
          <div className="flex items-center justify-center py-10 px-4 text-center">
            <p className="text-xs text-gray-400">{q ? 'No conversations match your search.' : 'No Zoom conversations yet.'}</p>
          </div>
        ) : (
          <>
            <SidebarSection title="Direct Messages">
              {contacts.map((c) => (
                <ConversationRow key={`contact-${c.id}`} conv={c} active={selected?.type === 'contact' && selected.id === c.id} onClick={() => onSelect(c)} />
              ))}
            </SidebarSection>
            <SidebarSection title="Group Chats">
              {groupChats.map((c) => (
                <ConversationRow key={`group-${c.id}`} conv={c} active={selected?.type === 'channel' && selected.id === c.id} onClick={() => onSelect(c)} />
              ))}
            </SidebarSection>
            <SidebarSection title="Channels">
              {channels.map((c) => (
                <ConversationRow key={`channel-${c.id}`} conv={c} active={selected?.type === 'channel' && selected.id === c.id} onClick={() => onSelect(c)} />
              ))}
            </SidebarSection>
          </>
        )}
      </div>

      <div className="px-3 py-2.5 border-t border-gray-100 flex items-center justify-between shrink-0">
        <p className="text-[11px] text-gray-400 truncate">{zoomEmail}</p>
        <button
          onClick={onDisconnect}
          title="Disconnect Zoom"
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
        >
          <LogOut size={13} />
        </button>
      </div>
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{title}</div>
      {children}
    </div>
  );
}

function ConversationRow({ conv, active, onClick }: { conv: ZoomConversation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
        active ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      {conv.type === 'contact' ? (
        <Avatar name={conv.name} size={30} />
      ) : (
        <span className="flex size-[30px] items-center justify-center rounded-full bg-gray-100 text-gray-500 shrink-0">
          <Hash size={14} />
        </span>
      )}
      <span className={`truncate text-sm ${active ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{conv.name}</span>
    </button>
  );
}

function ZoomConversationPane({
  conversation, onReauthRequired,
}: { conversation: ZoomConversation | null; onReauthRequired: () => void }) {
  const disconnect = useDisconnectZoom();
  const [messages, setMessages] = useState<ZoomMessage[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<{ reauth: boolean; message: string } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

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
        setLoadError({ reauth: true, message: 'Your Zoom authorization expired or was revoked.' });
      } else if (isZoomNotConnectedError(e)) {
        setLoadError({ reauth: true, message: 'Zoom is no longer connected.' });
      } else {

        setLoadError({ reauth: false, message: 'Could not load messages from Zoom.' });
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

  if (loadError?.reauth) {
    return <ReauthState onReconnect={() => disconnect.mutate(undefined, { onSuccess: onReauthRequired })} isPending={disconnect.isPending} />;
  }

  const handleSend = async (text: string) => {
    setSendError(null);
    try {
      const result = await sendZoomMessage(
        conversation.type === 'channel' ? { to_channel: conversation.id } : { to_contact: conversation.email || conversation.id },
        text,
      );
      setMessages((prev) => [...prev, {
        id: result.id,
        sender: 'me',
        sender_display_name: 'You',
        message: result.message,
        date_time: result.sent_at,
        edited: false,
        files: [],
      }]);
    } catch (e: any) {
      if (isZoomReauthError(e) || isZoomNotConnectedError(e)) {
        setLoadError({ reauth: true, message: 'Your Zoom authorization expired or was revoked.' });
      } else {
        setSendError('Could not send this message. Please try again.');
      }
      throw e;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ConversationHeader conversation={conversation} />

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={18} /></div>
        ) : loadError ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-xs text-gray-500">{loadError.message}</p>
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
              <div key={m.id} className="flex items-start gap-3">
                <Avatar name={m.sender_display_name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-900">{m.sender_display_name}</span>
                    <span className="text-[11px] text-gray-400">{formatTime(m.date_time || m.timestamp)}</span>
                    {m.edited && <span className="text-[10px] text-gray-300">(edited)</span>}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{m.message}</p>
                  {m.files.length > 0 && (
                    <div className="flex flex-col gap-0.5 mt-1">
                      {m.files.map((f, i) => (
                        <span key={i} className="text-xs text-gray-400">📎 {f.file_name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <Composer conversation={conversation} onSend={handleSend} error={sendError} onDismissError={() => setSendError(null)} />
    </div>
  );
}

function ConversationHeader({ conversation }: { conversation: ZoomConversation }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0">
      {conversation.type === 'contact' ? (
        <>
          <Avatar name={conversation.name} size={36} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{conversation.name}</p>
            {conversation.presence_status && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${conversation.presence_status.toLowerCase() === 'available' ? 'bg-green-500' : 'bg-gray-300'}`} />
                {conversation.presence_status}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <span className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 shrink-0">
            <Hash size={16} />
          </span>
          <p className="text-sm font-semibold text-gray-900 truncate">{conversation.name}</p>
        </>
      )}
    </div>
  );
}

function Composer({
  conversation, onSend, error, onDismissError,
}: { conversation: ZoomConversation; onSend: (text: string) => Promise<void>; error: string | null; onDismissError: () => void }) {
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setIsSending(true);
    try {
      await onSend(text);
      setDraft('');
    } catch {

    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="px-4 pb-4 pt-2 shrink-0">
      {error && (
        <div className="flex items-center justify-between gap-2 mb-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs">
          <span>{error}</span>
          <button onClick={onDismissError} className="text-red-400 hover:text-red-600">Dismiss</button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${conversation.name}…`}
          rows={1}
          disabled={isSending}
          className="w-full resize-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 disabled:opacity-60"
          style={{ height: 'auto', minHeight: '42px', maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || isSending}
          className="h-[42px] w-[42px] bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 transition-colors shrink-0"
        >
          {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
      <p className="text-[10px] text-gray-300 mt-1 pl-1">Shift+Enter for new line · Enter to send</p>
    </div>
  );
}

function formatTime(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}
