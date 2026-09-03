import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/queryClient';

const CHAT_CHANNELS_QUERY_KEY = ['chat-channels'];
async function fetch_chat_channels() {
  const r = await apiRequest<any>('api/v1/chat/channels');
  return r?.payload?.records || r?.payload || [];
}

const AUTO_DISMISS_MS = 6000;
const MAX_SEEN_IDS = 500;

interface ChatPopupItem {
  id: string;
  channelId: string;
  serverId: string | null;
  senderName: string;
  senderAvatar?: string | null;
  contextName: string; // channel/group name, empty for a DM
  preview: string;
}

// Global, app-level popup — mounted once in AdminTopbar (shared by every
// authenticated layout: Admin/Employee/Marketing/Chat) so it's visible
// regardless of which page is active, not just while on /chat. Listens to
// the SAME real-time message:new event chat/index.tsx already uses; the
// server only ever emits it to sockets already in that channel's room
// (see be-work's shared/socket/index.js auto-join + emit_to_channel), so
// recipient/RBAC scoping is inherited for free — this component does no
// authorization of its own, only presentation and own-message/redundant-
// view suppression.
const ChatMessagePopup: React.FC = () => {
  const [items, setItems] = useState<ChatPopupItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;
  const qc = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = async (msg: any) => {
      if (!msg?.id || !msg?.channel_id) return;
      if (msg.user_id === currentUserIdRef.current) return; // never popup your own message

      if (seenIds.current.has(msg.id)) return; // duplicate socket delivery
      seenIds.current.add(msg.id);
      if (seenIds.current.size > MAX_SEEN_IDS) {
        const oldest = seenIds.current.values().next().value;
        if (oldest) seenIds.current.delete(oldest);
      }

      // Already actively viewing this exact conversation — no redundant popup.
      const loc = locationRef.current;
      if (loc.pathname === '/chat') {
        const params = new URLSearchParams(loc.search);
        if (params.get('channel') === msg.channel_id) return;
      }

      // Reuse the already-cached, already-authorized channel list (same
      // data the Chat sidebar itself renders from) to get the name/type —
      // no new backend field needed. This popup is global (mounted outside
      // /chat), so the cache may not have been populated yet in this tab —
      // fetch it on-demand in that case, sharing the same query key/cache
      // as chat/index.tsx so there's no duplicate fetch once it exists.
      let channels = qc.getQueryData<any[]>(CHAT_CHANNELS_QUERY_KEY);
      if (!channels) {
        try {
          channels = await qc.fetchQuery({ queryKey: CHAT_CHANNELS_QUERY_KEY, queryFn: fetch_chat_channels });
        } catch {
          return;
        }
      }
      const channel = (channels || []).find((c) => c.id === msg.channel_id);
      if (!channel) return;

      const senderName = [msg.user?.first_name, msg.user?.last_name].filter(Boolean).join(' ') || 'Someone';
      const preview = (msg.content?.trim() || (msg.file_url ? 'Sent an attachment' : '')).slice(0, 120);
      if (!preview) return;

      setItems((prev) => [
        ...prev,
        {
          id: msg.id,
          channelId: msg.channel_id,
          serverId: channel.server_id || null,
          senderName,
          senderAvatar: msg.user?.avatar || null,
          contextName: channel.type === 'DM' ? '' : channel.name,
          preview,
        },
      ]);
    };

    socket.on('message:new', handleNewMessage);
    return () => { socket.off('message:new', handleNewMessage); };
  }, [qc]);

  const dismiss = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const openConversation = (item: ChatPopupItem) => {
    const params = new URLSearchParams();
    if (item.serverId) params.set('server', item.serverId);
    params.set('channel', item.channelId);
    navigate(`/chat?${params.toString()}`);
    dismiss(item.id);
  };

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999999] flex flex-col-reverse gap-2 w-80 max-w-[90vw] pointer-events-none">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <ChatPopupCard
            key={item.id}
            item={item}
            onDismiss={() => dismiss(item.id)}
            onOpen={() => openConversation(item)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

function ChatPopupCard({ item, onDismiss, onOpen }: { item: ChatPopupItem; onDismiss: () => void; onOpen: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arm = () => { timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS); };
  const disarm = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  useEffect(() => {
    arm();
    return disarm;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
      onMouseEnter={disarm}
      onMouseLeave={arm}
      className="pointer-events-auto w-full flex items-start gap-2.5 p-3 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow cursor-pointer"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
    >
      <PopupAvatar name={item.senderName} avatar={item.senderAvatar} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-gray-900 truncate">{item.senderName}</p>
          <span
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="shrink-0 text-gray-300 hover:text-gray-500 -mt-0.5 -mr-0.5 p-0.5"
            aria-label="Dismiss"
          >
            <X size={13} />
          </span>
        </div>
        {item.contextName && (
          <p className="text-[11px] font-semibold text-primary-600 truncate">{item.contextName}</p>
        )}
        <p className="text-xs text-gray-500 truncate mt-0.5">{item.preview}</p>
      </div>
    </motion.div>
  );
}

function PopupAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
      {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

export default ChatMessagePopup;
