import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Plus, Search, Send, X, Users, User, Loader2,
  Hash, Lock, Settings, Paperclip, CornerDownRight, ChevronDown,
  Mic, Square, Trash2, Camera, RotateCcw, Check, Video, VideoOff,
  Pin, Smile, Bold, Italic, Code, AtSign, Link2,
  BarChart3, CheckSquare, AlarmClock, Slash, XCircle,
  Bookmark, Megaphone, FolderOpen, Download, FileText, Home, ShieldCheck,
  PanelRight,
} from 'lucide-react';
import { apiRequest, BASE_URL } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import { useMyPermissions } from '@/services/permissionsService';
import ActionModal from '@/components/ui/ActionModal';
import { uploadFile, type UploadFileResult } from '@/lib/upload';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { renderMessageContent, extractMentionedUserIds, toPlainText } from './messageContent';
import EmojiPicker from './EmojiPicker';
import { QUICK_REACTION_EMOJIS } from './emojiData';
import {
  useGetServersQuery, useGetServerQuery, useGetServerChannelsQuery,
  useCreateServerMutation, useAddServerMemberMutation, useRemoveServerMemberMutation,
  type Server as ChatServer,
} from '@/services/serversService';
import { useUpdateMyPublicKeyMutation, useGetUserPublicKeyQuery } from '@/services/userService';
import { getOrCreateKeyPair, importPublicKey, deriveSharedKey, encryptMessage, decryptMessage } from '@/lib/e2eCrypto';
import { useChatTopbarStore } from '@/stores/chatTopbarStore';
import { getSocket } from '@/lib/socket';
import ZoomChatPanel from './ZoomChatPanel';
import MemberSidebar from './components/MemberSidebar';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface ChatUser {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  avatar?: string;
  designation?: string;
  last_active_at?: string | null;
}

interface ChannelMember {
  id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joined_at: string;
  last_read_at?: string;
  user: ChatUser;
}

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

interface PollVote {
  user_id: string;
  option_index: number;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  is_closed: boolean;
  closes_at: string | null;
  created_by_id: string;
  votes: PollVote[];
}

interface SavedMessageEntry {
  saved_at: string;
  message: ChatMessage & { channel?: { id: string; name: string; type: string } };
}

interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  parent_id?: string | null;
  file_url?: string | null;
  file_key?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  is_edited: boolean;
  edited_at?: string | null;
  created_at: string;
  deleted_at?: string | null;
  user: ChatUser;
  reactions?: Array<{ emoji: string; user?: { id: string; first_name: string } }>;
  _count?: { replies: number };
  mentions?: string[];
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by?: { id: string; first_name: string; last_name: string } | null;
  link_preview?: LinkPreview | null;
  poll?: Poll | null;
  is_encrypted?: boolean;
  iv?: string | null;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DM' | 'ANNOUNCEMENT';
  is_archived: boolean;
  entity_type?: string | null;
  entity_id?: string | null;
  unread_count?: number;
  mention_count?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  members: ChannelMember[];
  messages: ChatMessage[];
  _count?: { messages: number; members: number };
  server_id?: string | null;
}

function getOtherMember(channel: Channel, currentUserId: string): ChatUser | undefined {
  return channel.members?.find((m) => m.user_id !== currentUserId)?.user;
}

function getChannelDisplayName(channel: Channel, currentUserId: string): string {
  if (channel.type === 'DM') {
    const other = getOtherMember(channel, currentUserId);
    const name = other ? [other.first_name, other.last_name].filter(Boolean).join(' ').trim() : '';
    return name || 'Direct Message';
  }
  return channel.name || 'Channel';
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const onlineUserIds = new Set<string>();

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
function isOnline(user?: ChatUser | null): boolean {
  if (!user?.id) return false;
  if (onlineUserIds.has(user.id)) return true;
  if (!user.last_active_at) return false;
  return Date.now() - new Date(user.last_active_at).getTime() < ONLINE_WINDOW_MS;
}

function fmtLastSeen(user?: ChatUser | null): string {
  if (!user?.last_active_at) return '';
  if (isOnline(user)) return 'Online';
  const mins = Math.floor((Date.now() - new Date(user.last_active_at).getTime()) / 60000);
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${new Date(user.last_active_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PRIVACY_BADGE: Record<string, { label: string; cls: string }> = {
  PUBLIC:       { label: 'Public',       cls: 'bg-green-50 text-green-700' },
  PRIVATE:      { label: 'Private',      cls: 'bg-yellow-50 text-yellow-700' },
  DM:           { label: 'Direct',       cls: 'bg-blue-50 text-blue-700' },
  ANNOUNCEMENT: { label: 'Announcement', cls: 'bg-amber-50 text-amber-700' },
};

const ROLE_BADGE: Record<string, string> = {
  OWNER:  'bg-purple-100 text-purple-700',
  ADMIN:  'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-600',
};

const SLASH_COMMANDS: Array<{ command: string; icon: React.ReactNode; usage: string; description: string }> = [
  { command: '/poll',   icon: <BarChart3 size={13} />,   usage: '/poll Question? | Option 1 | Option 2',       description: 'Start a quick vote' },
  { command: '/task',   icon: <CheckSquare size={13} />, usage: '/task Title of the task',                     description: 'Create a task in this project' },
  { command: '/remind', icon: <AlarmClock size={13} />,  usage: '/remind Message in 2 hours',                  description: 'Get pinged later' },
];

const Avatar: React.FC<{ user?: ChatUser; size?: 'xs' | 'sm' | 'md'; active?: boolean; showStatus?: boolean }> = ({
  user, size = 'md', active = false, showStatus = false,
}) => {
  const dim = size === 'xs' ? 'w-5 h-5 text-[8px]' : size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  const dotDim = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const online = showStatus && isOnline(user);
  const statusDot = showStatus && (
    <span className={cn(
      dotDim, 'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-white',
      online ? 'bg-emerald-500' : 'bg-gray-300',
    )} title={fmtLastSeen(user) || 'Offline'} />
  );
  if (user?.avatar) {
    return (
      <div className="relative shrink-0">
        <img src={user.avatar} className={cn(dim, 'rounded-full object-cover shrink-0')} alt="" />
        {statusDot}
      </div>
    );
  }
  const name = user ? `${user.first_name} ${user.last_name}` : '?';
  return (
    <div className="relative shrink-0">
      <div className={cn(
        dim, 'rounded-full flex items-center justify-center font-black shrink-0',
        active ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-600',
      )}>
        {getInitials(name)}
      </div>
      {statusDot}
    </div>
  );
};

function MembersModal({
  channelId, currentUserId, currentUserRole, isGlobalAdmin, onClose,
}: {
  channelId: string;
  currentUserId: string;
  currentUserRole?: string;
  isGlobalAdmin?: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToastContext();
  const [addSearch, setAddSearch] = useState('');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [selectedDesignationId, setSelectedDesignationId] = useState('');
  const canManage = isGlobalAdmin || ['OWNER', 'ADMIN'].includes(currentUserRole || '');

  const { data: members = [] } = useQuery<ChannelMember[]>({
    queryKey: ['chat-members', channelId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.MEMBERS(channelId));
      return r?.payload?.records || [];
    },
  });

  const { data: searchUsers = [] } = useQuery<ChatUser[]>({
    queryKey: ['chat-users-add', addSearch],
    queryFn: async () => {
      const r = await apiRequest<any>(`${API_ENDPOINTS.CHAT.USERS}?search=${encodeURIComponent(addSearch)}`);
      return r?.payload || [];
    },
    enabled: showAddDropdown && addSearch.length > 0,
  });

  const addMutation = useMutation({
    mutationFn: (user_id: string) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.MEMBERS(channelId), {
        method: 'POST',
        body: JSON.stringify({ user_id }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-members', channelId] });
      setAddSearch('');
      setShowAddDropdown(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (uid: string) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.MEMBER(channelId, uid), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-members', channelId] }),
  });

  const { data: designations = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['designations-for-chat'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.DESIGNATION.LIST);
      return r?.payload?.records || r?.payload || [];
    },
    enabled: canManage,
    staleTime: 5 * 60 * 1000,
  });

  const addByDesignationMutation = useMutation({
    mutationFn: (designation_id: string) =>
      apiRequest<any>(`${API_ENDPOINTS.CHAT.MEMBERS(channelId)}/by-designation`, {
        method: 'POST',
        body: JSON.stringify({ designation_id }),
      }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['chat-members', channelId] });
      setSelectedDesignationId('');
      toast.success(`Added ${r?.payload?.members_added ?? 0} member(s) — new hires with "${r?.payload?.designation}" will auto-join too`);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to add designation'),
  });

  const existingIds = new Set(members.map((m) => m.user_id));
  const visibleMembers = members.filter((m) => m.user);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">Members ({visibleMembers.length})</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {canManage && (
          <div className="px-5 py-3 border-b border-gray-100 relative">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full h-10 pl-8 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                placeholder="Add member by name…"
                value={addSearch}
                onChange={(e) => { setAddSearch(e.target.value); setShowAddDropdown(true); }}
                onFocus={() => setShowAddDropdown(true)}
              />
            </div>
            {showAddDropdown && searchUsers.length > 0 && (
              <div className="absolute left-5 right-5 top-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                {searchUsers.filter((u) => !existingIds.has(u.id)).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => addMutation.mutate(u.id)}
                    disabled={addMutation.isPending}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                  >
                    <Avatar user={u} size="sm" />
                    <span className="text-sm font-semibold text-gray-900">{u.first_name} {u.last_name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{u.designation}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Add a whole designation — bulk-adds every current holder AND
                remembers the link so future hires/reassignments into that
                designation auto-join this channel (channel_designation_links). */}
            <div className="flex items-center gap-2 mt-2">
              <select
                value={selectedDesignationId}
                onChange={(e) => setSelectedDesignationId(e.target.value)}
                className="flex-1 h-9 px-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-primary-400"
              >
                <option value="">Add a designation…</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button
                onClick={() => selectedDesignationId && addByDesignationMutation.mutate(selectedDesignationId)}
                disabled={!selectedDesignationId || addByDesignationMutation.isPending}
                className="h-9 px-3 bg-primary-600 text-white text-xs font-bold rounded-xl disabled:opacity-40"
              >
                {addByDesignationMutation.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50">
              <Avatar user={m.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{m.user?.first_name} {m.user?.last_name}</p>
                <p className="text-xs text-gray-400 truncate">{m.user?.designation}</p>
              </div>
              <span className={cn('px-2 py-0.5 rounded-md text-xs font-bold', ROLE_BADGE[m.role])}>{m.role}</span>
              {canManage && m.user_id !== currentUserId && (
                <button
                  onClick={() => removeMutation.mutate(m.user_id)}
                  disabled={removeMutation.isPending}
                  className="p-1 text-gray-300 hover:text-red-400 rounded"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SavedMessagesPanel({
  onClose,
  onJumpToChannel,
}: {
  onClose: () => void;
  onJumpToChannel: (channelId: string) => void;
}) {
  const qc = useQueryClient();
  const { data: saved = [], isLoading } = useQuery<SavedMessageEntry[]>({
    queryKey: ['chat-saved'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.SAVED);
      return r?.payload?.records || r?.payload || [];
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (msgId: string) => apiRequest<any>(API_ENDPOINTS.CHAT.SAVE('_', msgId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-saved'] }),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900 flex items-center gap-2"><Bookmark size={16} className="text-blue-500" /> Saved messages ({saved.length})</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : saved.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <Bookmark size={28} className="mb-2" />
              <p className="text-sm font-semibold text-gray-400">Nothing saved yet</p>
              <p className="text-xs text-gray-300">Bookmark a message from its hover menu</p>
            </div>
          ) : (
            saved.map(({ message, saved_at }) => (
              <button
                key={message.id}
                onClick={() => { onJumpToChannel(message.channel_id); onClose(); }}
                className="w-full text-left p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Avatar user={message.user} size="xs" />
                  <span className="text-xs font-bold text-gray-800">{message.user?.first_name} {message.user?.last_name}</span>
                  {message.channel && (
                    <span className="text-[10px] text-gray-400 truncate">in {message.channel.type === 'DM' ? 'DM' : `#${message.channel.name}`}</span>
                  )}
                  <span className="ml-auto text-[10px] text-gray-400 shrink-0">{fmtTime(message.created_at)}</span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); unsaveMutation.mutate(message.id); }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded shrink-0"
                    title="Remove from Saved"
                  >
                    <X size={13} />
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">
                  {renderMessageContent(message.content) || <span className="italic text-gray-400">Attachment</span>}
                </p>
                <p className="text-[10px] text-gray-300 mt-1">Saved {fmtTime(saved_at)}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PinnedMessagesPanel({
  channelId,
  onClose,
}: {
  channelId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: pinned = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat-pinned', channelId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.PINNED(channelId));
      return r?.payload?.records || r?.payload || [];
    },
  });

  const unpinMutation = useMutation({
    mutationFn: (msgId: string) => apiRequest<any>(API_ENDPOINTS.CHAT.PIN(channelId, msgId), { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-pinned', channelId] });
      qc.invalidateQueries({ queryKey: ['chat-messages', channelId] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900 flex items-center gap-2"><Pin size={16} className="text-amber-500" /> Pinned messages ({pinned.length})</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : pinned.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <Pin size={28} className="mb-2" />
              <p className="text-sm font-semibold text-gray-400">No pinned messages</p>
              <p className="text-xs text-gray-300">Pin key messages from the hover menu</p>
            </div>
          ) : (
            pinned.map((msg) => (
              <div key={msg.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar user={msg.user} size="xs" />
                  <span className="text-xs font-bold text-gray-800">{msg.user?.first_name} {msg.user?.last_name}</span>
                  <span className="text-[10px] text-gray-400">{fmtTime(msg.created_at)}</span>
                  <button
                    onClick={() => unpinMutation.mutate(msg.id)}
                    className="ml-auto p-1 text-gray-400 hover:text-red-500 rounded"
                    title="Unpin"
                  >
                    <X size={13} />
                  </button>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{renderMessageContent(msg.content) || <span className="italic text-gray-400">Attachment</span>}</p>
                {msg.pinned_by && (
                  <p className="text-[10px] text-amber-600 mt-1">Pinned by {msg.pinned_by.first_name}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelSettingsModal({
  channel, currentUserRole, isGlobalAdmin, canMakePublic, onClose, onSaved, onLeftOrDeleted,
}: {
  channel: Channel;
  currentUserRole?: string;
  isGlobalAdmin?: boolean;
  canMakePublic: boolean;
  onClose: () => void;
  onSaved: () => void;
  onLeftOrDeleted: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [type, setType] = useState<'PUBLIC' | 'PRIVATE'>(channel.type === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC');
  const canEdit = isGlobalAdmin || ['OWNER', 'ADMIN'].includes(currentUserRole || '');
  const canArchive = isGlobalAdmin || currentUserRole === 'OWNER';
  const canDelete = isGlobalAdmin || currentUserRole === 'OWNER';
  const canLeave = !!currentUserRole && channel.type !== 'DM' && channel.entity_type !== 'PROJECT';
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.CHAT.CHANNEL(channel.id), {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), description: description.trim(), type }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      onSaved();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.CHAT.ARCHIVE(channel.id), { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.CHAT.CHANNEL(channel.id), { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      onLeftOrDeleted();
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.CHAT.LEAVE(channel.id), { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      onLeftOrDeleted();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">Channel Settings</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Channel Name</label>
            <input
              disabled={!canEdit}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Description</label>
            <textarea
              disabled={!canEdit}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none disabled:bg-gray-50"
            />
          </div>
          {canEdit && (canMakePublic || channel.type !== 'PUBLIC') && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Privacy</label>
              <div className="flex gap-2">
                {(['PUBLIC', 'PRIVATE'] as const)
                  .filter((t) => t !== 'PUBLIC' || canMakePublic)
                  .map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-bold border transition-colors',
                      type === t ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-gray-300')}
                  >
                    {t === 'PUBLIC' ? <Hash size={13} className="inline mr-1" /> : <Lock size={13} className="inline mr-1" />}
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {canEdit && (
            <button
              onClick={() => updateMutation.mutate()}
              disabled={!name.trim() || updateMutation.isPending}
              className="w-full h-10 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
              Save Changes
            </button>
          )}
          {(canArchive || canDelete || canLeave) && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Danger Zone</p>
              {canArchive && (
                <button
                  onClick={() => setConfirmArchive(true)}
                  disabled={archiveMutation.isPending}
                  className="w-full h-10 border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  {archiveMutation.isPending ? 'Archiving…' : 'Archive Channel'}
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteMutation.isPending}
                  className="w-full h-10 border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete Channel'}
                </button>
              )}
              {canLeave && (
                <button
                  onClick={() => setConfirmLeave(true)}
                  disabled={leaveMutation.isPending}
                  className="w-full h-10 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  {leaveMutation.isPending ? 'Leaving…' : 'Leave Channel'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ActionModal
        isOpen={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => { setConfirmArchive(false); archiveMutation.mutate(); }}
        title="Archive Channel"
        description="Members will lose access to this channel. This cannot be undone."
        confirmText="Archive"
        confirmVariant="danger"
        icon="delete"
        loading={archiveMutation.isPending}
      />

      <ActionModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); deleteMutation.mutate(); }}
        title="Delete Channel"
        description="This permanently deletes the channel, all its messages, and all memberships. This cannot be undone."
        confirmText="Delete Permanently"
        confirmVariant="danger"
        icon="delete"
        loading={deleteMutation.isPending}
      />

      <ActionModal
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => { setConfirmLeave(false); leaveMutation.mutate(); }}
        title="Leave Channel"
        description="You'll lose access to this channel's messages unless someone adds you back."
        confirmText="Leave"
        confirmVariant="danger"
        icon="delete"
        loading={leaveMutation.isPending}
      />
    </div>
  );
}

interface SearchResults {
  channels: Array<{ id: string; name: string; type: string; is_archived: boolean; entity_type?: string | null }>;
  messages: Array<ChatMessage & { channel: { id: string; name: string; type: string } }>;
}

function SearchModal({
  onClose, onJumpToChannel, currentUserId,
}: {
  onClose: () => void;
  onJumpToChannel: (channelId: string) => void;
  currentUserId: string;
}) {
  const [q, setQ] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedQ = useDebounce(q, 350);

  const enabled = !!debouncedQ.trim() || hasAttachment || !!dateFrom || !!dateTo;

  const { data, isLoading } = useQuery<SearchResults>({
    queryKey: ['chat-search', debouncedQ, hasAttachment, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
      if (hasAttachment) params.set('has_attachment', 'true');
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const r = await apiRequest<any>(`${API_ENDPOINTS.CHAT.SEARCH}?${params.toString()}`);
      return r?.payload || { channels: [], messages: [] };
    },
    enabled,
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">Search Chat</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search messages or channels…"
              className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
              <input type="checkbox" checked={hasAttachment} onChange={(e) => setHasAttachment(e.target.checked)} />
              Has attachment
            </label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 px-2 border border-gray-200 rounded-lg text-xs" title="From date" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 px-2 border border-gray-200 rounded-lg text-xs" title="To date" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {!enabled && (
            <p className="text-sm text-gray-300 text-center py-8">Type to search, or pick a filter above</p>
          )}
          {enabled && isLoading && (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          )}
          {enabled && !isLoading && data && (
            <>
              {data.channels.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 mb-1">Channels</p>
                  {data.channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => onJumpToChannel(ch.id)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-gray-50 text-left"
                    >
                      <Hash size={13} className="text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-800 truncate">{ch.name}</span>
                      {ch.entity_type === 'PROJECT' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">Project</span>}
                    </button>
                  ))}
                </div>
              )}
              {data.messages.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 mb-1">Messages</p>
                  {data.messages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => onJumpToChannel(msg.channel.id)}
                      className="w-full flex flex-col gap-0.5 px-2 py-2 rounded-xl hover:bg-gray-50 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-800">{msg.user.first_name} {msg.user.last_name}</span>
                        <span className="text-[10px] text-gray-400">in {msg.channel.name}</span>
                        <span className="text-[10px] text-gray-300 ml-auto shrink-0">{fmtTime(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{msg.content || msg.file_name || 'Attachment'}</p>
                    </button>
                  ))}
                </div>
              )}
              {data.channels.length === 0 && data.messages.length === 0 && (
                <p className="text-sm text-gray-300 text-center py-8">No results</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const SERVER_COLORS = [
  'from-[#005CDA] to-[#001F4A]', 'from-emerald-500 to-emerald-800', 'from-orange-500 to-orange-800',
  'from-fuchsia-500 to-fuchsia-800', 'from-cyan-500 to-cyan-800', 'from-rose-500 to-rose-800',
];
function serverColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return SERVER_COLORS[hash % SERVER_COLORS.length];
}

// Sentinel activeServerId value for the Zoom Team Chat section — not a real
// server id, never sent to any API; ServerRail/ChatPage just branch on it
// to swap the whole right-hand pane for <ZoomChatPanel /> instead of the
// native channel/message pipeline (see ChatPage's render below). Kept
// completely separate from real server ids/channels/messages so a Zoom
// conversation can never be confused with, sent as, or deleted as a native
// TekXAI chat message.
const ZOOM_SECTION_ID = '__zoom__';

function ServerRail({
  servers, activeServerId, onSelectHome, onSelectServer, onSelectZoom, onAddServer, canCreate,
}: {
  servers: ChatServer[];
  activeServerId: string | null;
  onSelectHome: () => void;
  onSelectServer: (id: string) => void;
  onSelectZoom: () => void;
  onAddServer: () => void;
  canCreate: boolean;
}) {
  const RailIcon: React.FC<{ active: boolean; onClick: () => void; title: string; children: React.ReactNode; className?: string }> = ({
    active, onClick, title, children, className,
  }) => (
    <div className="relative group w-full flex items-center justify-center">
      <span className={cn(
        'absolute left-0 w-1 rounded-r-full bg-gray-900 transition-all duration-200',
        active ? 'h-8' : 'h-0 group-hover:h-4',
      )} />
      <button
        onClick={onClick}
        title={title}
        className={cn(
          'w-11 h-11 flex items-center justify-center text-white font-black text-xs transition-all duration-200 active:scale-95',
          active ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl',
          className,
        )}
      >
        {children}
      </button>
    </div>
  );

  return (
    <div className="w-[64px] bg-[#EAECF0] flex flex-col items-center py-3 gap-2 shrink-0 h-full overflow-y-auto no-scrollbar">
      <RailIcon active={activeServerId === null} onClick={onSelectHome} title="Home — DMs" className="bg-gradient-to-b from-[#005CDA] to-[#001F4A]">
        <Home size={18} />
      </RailIcon>

      <RailIcon active={activeServerId === ZOOM_SECTION_ID} onClick={onSelectZoom} title="Zoom Team Chat" className="bg-gradient-to-b from-[#0B5CFF] to-[#0047AB]">
        <Video size={18} />
      </RailIcon>

      <div className="w-8 h-[2px] rounded-full bg-[#D7DADC] my-0.5" />

      {servers.map((s) => (
        <RailIcon
          key={s.id}
          active={activeServerId === s.id}
          onClick={() => onSelectServer(s.id)}
          title={s.name}
          className={cn('bg-gradient-to-b', serverColor(s.id))}
        >
          {getInitials(s.name) || '#'}
        </RailIcon>
      ))}

      {canCreate && (
        <>
          <div className="w-8 h-[2px] rounded-full bg-[#D7DADC] my-0.5" />
          <button
            onClick={onAddServer}
            title="Create a server"
            className="w-11 h-11 rounded-full bg-white hover:bg-green-50 hover:rounded-2xl border-2 border-dashed border-gray-300 hover:border-green-500 flex items-center justify-center transition-all duration-200 active:scale-95"
          >
            <Plus size={18} className="text-green-600" />
          </button>
        </>
      )}
    </div>
  );
}

function CreateServerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const toast = useToastContext();
  const createMutation = useCreateServerMutation();

  const handleCreate = () => {
    if (!name.trim()) return;
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (data: any) => {
          toast.success('Server created');
          onCreated(data?.payload?.id);
          onClose();
        },
        onError: (e: any) => toast.error(e?.message || 'Failed to create server'),
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">Create a Server</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Server name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Engineering"
              className="w-full mt-1 h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this server for?"
              className="w-full mt-1 h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || createMutation.isPending}
            className="mt-2 w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-40 transition-colors"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Server'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ServerMembersModal({ serverId, isGlobalAdmin, onClose }: { serverId: string; isGlobalAdmin?: boolean; onClose: () => void }) {
  const [addSearch, setAddSearch] = useState('');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const { data: server } = useGetServerQuery(serverId);
  const addMutation = useAddServerMemberMutation(serverId);
  const removeMutation = useRemoveServerMemberMutation(serverId);

  const { data: searchUsers = [] } = useQuery<ChatUser[]>({
    queryKey: ['chat-users-add-server', addSearch],
    queryFn: async () => {
      const r = await apiRequest<any>(`${API_ENDPOINTS.CHAT.USERS}?search=${encodeURIComponent(addSearch)}`);
      return r?.payload || [];
    },
    enabled: showAddDropdown && addSearch.length > 0,
  });

  const members = server?.members || [];
  const existingIds = new Set(members.map((m) => m.user_id));
  const canManage = true;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">{server?.name || 'Server'} · Members ({members.length})</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {canManage && (
          <div className="px-5 py-3 border-b border-gray-100 relative">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full h-10 pl-8 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                placeholder="Add member by name…"
                value={addSearch}
                onChange={(e) => { setAddSearch(e.target.value); setShowAddDropdown(true); }}
                onFocus={() => setShowAddDropdown(true)}
              />
            </div>
            {showAddDropdown && searchUsers.length > 0 && (
              <div className="absolute left-5 right-5 top-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                {searchUsers.filter((u) => !existingIds.has(u.id)).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { addMutation.mutate({ user_id: u.id }); setAddSearch(''); setShowAddDropdown(false); }}
                    disabled={addMutation.isPending}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                  >
                    <Avatar user={u} size="sm" />
                    <span className="text-sm font-semibold text-gray-900">{u.first_name} {u.last_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50">
              <Avatar user={m.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.user?.first_name} {m.user?.last_name}</p>
              </div>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', ROLE_BADGE[m.role])}>{m.role}</span>
              {canManage && (
                <button
                  onClick={() => removeMutation.mutate(m.user_id)}
                  className="p-1 text-gray-300 hover:text-red-500 rounded"
                  title="Remove from server"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type NewChatTab = 'direct' | 'private' | 'public' | 'announcement';

function NewChannelModal({
  onClose,
  onCreated,
  serverId,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
  serverId?: string | null;
}) {
  const qc = useQueryClient();
  const invalidateChannelLists = () => {
    qc.invalidateQueries({ queryKey: ['chat-channels'] });
    if (serverId) qc.invalidateQueries({ queryKey: ['server-channels', serverId] });
  };
  const { data: myPerms } = useMyPermissions();
  const canCreateChannels = !!myPerms?.is_super_admin || (myPerms?.roles || []).some((r) => ['ADMIN', 'HR'].includes(r));
  const [tab, setTab] = useState<NewChatTab>('direct');
  const [userSearch, setUserSearch] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { data: chatUsers = [] } = useQuery<ChatUser[]>({
    queryKey: ['chat-users', userSearch],
    queryFn: async () => {
      const r = await apiRequest<any>(`${API_ENDPOINTS.CHAT.USERS}?search=${encodeURIComponent(userSearch)}`);
      return r?.payload || [];
    },
  });

  const dmMutation = useMutation({
    mutationFn: (target_user_id: string) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.DM, { method: 'POST', body: JSON.stringify({ target_user_id }) }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      onCreated(data?.payload?.id);
    },
  });

  const privateMutation = useMutation({
    mutationFn: ({ name, description, member_ids }: { name: string; description: string; member_ids: string[] }) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.PRIVATE, { method: 'POST', body: JSON.stringify({ name, description, member_ids, server_id: serverId || undefined }) }),
    onSuccess: (data: any) => {
      invalidateChannelLists();
      onCreated(data?.payload?.id);
    },
  });

  const publicMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.CHANNELS, { method: 'POST', body: JSON.stringify({ name, description, server_id: serverId || undefined }) }),
    onSuccess: (data: any) => {
      invalidateChannelLists();
      onCreated(data?.payload?.id);
    },
  });

  const announcementMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.CHANNELS, { method: 'POST', body: JSON.stringify({ name, description, type: 'ANNOUNCEMENT', server_id: serverId || undefined }) }),
    onSuccess: (data: any) => {
      invalidateChannelLists();
      onCreated(data?.payload?.id);
    },
  });

  const toggleMember = (uid: string) =>
    setSelectedMembers((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);

  const TABS: { key: NewChatTab; label: string; icon: React.ReactNode }[] = [
    { key: 'direct',  label: 'Direct',  icon: <User size={13} /> },
    ...(canCreateChannels ? [
      { key: 'private' as NewChatTab, label: 'Private', icon: <Lock size={13} /> },
      { key: 'public' as NewChatTab, label: 'Public', icon: <Hash size={13} /> },
      { key: 'announcement' as NewChatTab, label: 'Announcement', icon: <Megaphone size={13} /> },
    ] : []),
  ];

  const needsName = tab === 'private' || tab === 'public' || tab === 'announcement';
  const needsMembers = tab === 'direct' || tab === 'private';
  const isLoading = dmMutation.isPending || privateMutation.isPending || publicMutation.isPending || announcementMutation.isPending;

  const handleCreate = () => {
    if (tab === 'private') privateMutation.mutate({ name: channelName.trim(), description: channelDesc.trim(), member_ids: selectedMembers });
    else if (tab === 'public') publicMutation.mutate({ name: channelName.trim(), description: channelDesc.trim() });
    else if (tab === 'announcement') announcementMutation.mutate({ name: channelName.trim(), description: channelDesc.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelectedMembers([]); setChannelName(''); }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors',
                  tab === t.key ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-100')}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {needsName && (
            <input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Channel name…"
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              autoFocus
            />
          )}
          {(tab === 'private' || tab === 'public' || tab === 'announcement') && (
            <input
              value={channelDesc}
              onChange={(e) => setChannelDesc(e.target.value)}
              placeholder="Description (optional)…"
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            />
          )}

          {needsMembers && (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full h-10 pl-8 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                  placeholder="Search people…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  autoFocus={tab === 'direct'}
                />
              </div>
              {selectedMembers.length > 0 && tab !== 'direct' && (
                <div className="flex flex-wrap gap-1">
                  {selectedMembers.map((uid) => {
                    const u = chatUsers.find((u) => u.id === uid);
                    if (!u) return null;
                    return (
                      <span key={uid} className="flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs font-semibold">
                        {u.first_name} {u.last_name}
                        <button onClick={() => toggleMember(uid)}><X size={10} /></button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {chatUsers.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">Type to search people</p>
                )}
                {chatUsers.map((u) => {
                  const isSelected = selectedMembers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => tab === 'direct' ? dmMutation.mutate(u.id) : toggleMember(u.id)}
                      disabled={isLoading}
                      className={cn('w-full flex items-center gap-3 p-2.5 text-left rounded-xl transition-colors',
                        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50')}
                    >
                      <Avatar user={u} active={isSelected} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.designation || u.email}</p>
                      </div>
                      {tab !== 'direct' && isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {tab !== 'direct' && (
            <button
              onClick={handleCreate}
              disabled={!channelName.trim() || (needsMembers && selectedMembers.length === 0) || isLoading}
              className="w-full h-10 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              {tab === 'private' && `Create Private Channel`}
              {tab === 'public' && `Create Public Channel`}
              {tab === 'announcement' && `Create Announcement Channel`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const CHANNEL_GROUPS: Array<{ key: string; label: string; icon: React.ReactNode; match: (ch: Channel) => boolean }> = [
  { key: 'dm',       label: 'Direct Messages', icon: <User size={11} />,      match: (ch) => ch.type === 'DM' },
  { key: 'projects', label: 'Projects',        icon: <FolderOpen size={11} />, match: (ch) => ch.type !== 'DM' && ch.entity_type === 'PROJECT' },
  { key: 'channels', label: 'Channels',        icon: <Hash size={11} />,      match: (ch) => ch.type !== 'DM' && ch.entity_type !== 'PROJECT' },
];
const COLLAPSED_GROUPS_KEY = 'tekxai-chat-collapsed-groups';

function loadCollapsedGroups(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(COLLAPSED_GROUPS_KEY) || '{}'); } catch { return {}; }
}

function GroupedChannelList({
  channels, currentUserId, selectedId, onSelect,
}: {
  channels: Channel[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsedGroups);

  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div>
      {CHANNEL_GROUPS.map((group) => {
        const groupChannels = channels.filter(group.match);
        if (groupChannels.length === 0) return null;
        const isCollapsed = !!collapsed[group.key];
        return (
          <div key={group.key}>
            <button
              onClick={() => toggle(group.key)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-gray-50"
            >
              <ChevronDown size={12} className={cn('text-gray-300 transition-transform', isCollapsed && '-rotate-90')} />
              <span className="text-gray-400">{group.icon}</span>
              <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase flex-1">{group.label}</span>
              <span className="text-[10px] text-gray-300">{groupChannels.length}</span>
            </button>
            {!isCollapsed && (
              <ChannelSection channels={groupChannels} currentUserId={currentUserId} selectedId={selectedId} onSelect={onSelect} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChannelSection({
  channels, currentUserId, selectedId, onSelect,
}: {
  channels: Channel[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (channels.length === 0) return null;
  return (
    <div>
      {channels.map((ch) => {
        const isSelected = ch.id === selectedId;
        const name = getChannelDisplayName(ch, currentUserId);
        const lastMsg = ch.messages?.[0];
        const otherUser = ch.type === 'DM' ? getOtherMember(ch, currentUserId) : undefined;
        const unreadCount = ch.unread_count || 0;
        const hasUnread = unreadCount > 0;
        const mentionCount = ch.mention_count || 0;
        const hasMention = mentionCount > 0;
        return (
          <button
            key={ch.id}
            onClick={() => onSelect(ch.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-gray-50/60',
              isSelected ? 'bg-primary-50 border-l-2 border-l-primary-500' : 'hover:bg-gray-50',
            )}
          >
            {ch.type === 'DM' ? (
              <Avatar user={otherUser} active={isSelected} size="sm" showStatus />
            ) : ch.type === 'PRIVATE' ? (
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                isSelected ? 'bg-yellow-200' : 'bg-yellow-50')}>
                <Lock size={12} className={isSelected ? 'text-yellow-700' : 'text-yellow-500'} />
              </div>
            ) : ch.type === 'ANNOUNCEMENT' ? (
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                isSelected ? 'bg-amber-200' : 'bg-amber-50')}>
                <Megaphone size={12} className={isSelected ? 'text-amber-700' : 'text-amber-500'} />
              </div>
            ) : (
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                isSelected ? 'bg-primary-200' : 'bg-gray-100')}>
                <Hash size={13} className={isSelected ? 'text-primary-700' : 'text-gray-400'} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className={cn('text-sm font-semibold truncate', isSelected ? 'text-primary-800' : hasUnread ? 'text-gray-900 font-black' : 'text-gray-800')}>
                  {name}
                </p>
                {lastMsg && <span className="text-[10px] text-gray-400 shrink-0">{fmtTime(lastMsg.created_at)}</span>}
              </div>
              <div className="flex items-center gap-1">
                <p className={cn('text-xs truncate flex-1', hasUnread ? 'text-gray-700 font-semibold' : 'text-gray-400')}>
                  {lastMsg
                    ? `${lastMsg.user_id === currentUserId ? 'You' : (lastMsg.user?.first_name || '')}: ${toPlainText(lastMsg.content) || (lastMsg as any).file_name || 'Attachment'}`
                    : 'No messages yet'}
                </p>
                {/* Mentions get their own distinct badge — "someone tagged me"
                    reads very differently from "channel got busy", and the
                    plain unread count couldn't tell them apart before. */}
                {hasMention && (
                  <span title={`${mentionCount} mention${mentionCount === 1 ? '' : 's'}`} className="min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-black rounded-full shrink-0 flex items-center justify-center gap-0.5">
                    <AtSign size={9} strokeWidth={3} />{mentionCount > 99 ? '99+' : mentionCount}
                  </span>
                )}
                {hasUnread && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-primary-500 text-white text-[10px] font-black rounded-full shrink-0 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PollCard({ poll, channelId, currentUserId, isGlobalAdmin }: {
  poll: Poll;
  channelId: string;
  currentUserId: string;
  isGlobalAdmin?: boolean;
}) {
  const qc = useQueryClient();
  const toast = useToastContext();

  const voteMutation = useMutation({
    mutationFn: (option_index: number) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.POLL_VOTE(channelId, poll.id), {
        method: 'POST',
        body: JSON.stringify({ option_index }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-messages', channelId] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to vote'),
  });

  const closeMutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.CHAT.POLL_CLOSE(channelId, poll.id), { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-messages', channelId] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to close poll'),
  });

  const myVote = poll.votes.find((v) => v.user_id === currentUserId);
  const totalVotes = poll.votes.length;
  const canClose = !poll.is_closed && (poll.created_by_id === currentUserId || isGlobalAdmin);

  return (
    <div className="w-64 bg-white border border-gray-200 rounded-xl p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
        <BarChart3 size={11} />
        {poll.is_closed ? 'Poll · Closed' : 'Poll'}
      </p>
      <p className="text-sm font-bold text-gray-900 mb-2">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((option, i) => {
          const count = poll.votes.filter((v) => v.option_index === i).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const mine = myVote?.option_index === i;
          return (
            <button
              key={i}
              disabled={poll.is_closed || voteMutation.isPending}
              onClick={() => voteMutation.mutate(i)}
              className={cn(
                'relative w-full text-left px-2.5 py-1.5 rounded-lg border text-xs overflow-hidden disabled:cursor-default',
                mine ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300',
              )}
            >
              <div
                className={cn('absolute inset-y-0 left-0 transition-all', mine ? 'bg-primary-100' : 'bg-gray-100')}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className={cn('font-semibold truncate', mine ? 'text-primary-800' : 'text-gray-700')}>
                  {mine && <Check size={11} className="inline mr-1 -mt-0.5" />}
                  {option}
                </span>
                <span className="shrink-0 text-gray-400 font-bold">{count}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-gray-400">{totalVotes} vote{totalVotes === 1 ? '' : 's'}</p>
        {canClose && (
          <button
            onClick={() => closeMutation.mutate()}
            className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-red-500"
          >
            <XCircle size={11} /> Close poll
          </button>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  msg, isOwn, showSenderName, currentUserId, channelId, isGlobalAdmin, isSaved,
  onDelete, onReply, onOpenThread, onEdit, onImageClick, seenBy, dmSharedKey,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  isGlobalAdmin?: boolean;
  isSaved?: boolean;
  showSenderName: boolean;
  currentUserId: string;
  channelId: string;
  onDelete: () => void;
  onReply: () => void;
  onOpenThread: () => void;
  onEdit: (msg: ChatMessage) => void;
  onImageClick?: (url: string, name?: string | null) => void;
  seenBy?: ChatUser[];
  dmSharedKey?: CryptoKey;
}) {
  const qc = useQueryClient();
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [decrypted, setDecrypted] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!msg.is_encrypted) return;
    if (!dmSharedKey || !msg.iv) { setDecrypted(undefined); return; }
    let cancelled = false;
    decryptMessage(dmSharedKey, msg.content, msg.iv).then((plain) => {
      if (!cancelled) setDecrypted(plain);
    });
    return () => { cancelled = true; };
  }, [msg.is_encrypted, msg.content, msg.iv, dmSharedKey]);

  const reactionMutation = useMutation({
    mutationFn: (emoji: string) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.REACTION(channelId, msg.id), {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-messages', channelId] }),
  });

  const removeReactionMutation = useMutation({
    mutationFn: (emoji: string) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.REACTION(channelId, msg.id), {
        method: 'DELETE',
        body: JSON.stringify({ emoji }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-messages', channelId] }),
  });

  const pinMutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.CHAT.PIN(channelId, msg.id), { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-messages', channelId] });
      qc.invalidateQueries({ queryKey: ['chat-pinned', channelId] });
    },
  });
  const unpinMutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.CHAT.PIN(channelId, msg.id), { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-messages', channelId] });
      qc.invalidateQueries({ queryKey: ['chat-pinned', channelId] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.CHAT.SAVE(channelId, msg.id), { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-saved'] }),
  });
  const unsaveMutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.CHAT.SAVE(channelId, msg.id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-saved'] }),
  });

  const reactionMap = (msg.reactions || []).reduce((acc: Record<string, { count: number; mine: boolean; names: string[] }>, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false, names: [] };
    acc[r.emoji].count++;
    if (r.user?.id === currentUserId) acc[r.emoji].mine = true;
    if (r.user?.first_name) acc[r.emoji].names.push(r.user.first_name);
    return acc;
  }, {});

  const isImage = msg.mime_type?.startsWith('image/');
  const isAudio = msg.mime_type?.startsWith('audio/');
  const isVideo = msg.mime_type?.startsWith('video/');

  return (
    <div
      className="flex gap-3 group px-2 -mx-2 py-0.5 rounded-lg hover:bg-gray-50 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar user={msg.user} size="md" />
      <div className="flex flex-col items-start flex-1 min-w-0">
        {showSenderName && (
          <p className="flex items-baseline gap-2 mb-0.5 px-1">
            <span className={cn('text-[13px] font-bold', isOwn ? 'text-primary-700' : 'text-gray-900')}>
              {isOwn ? 'You' : `${msg.user?.first_name || ''} ${msg.user?.last_name || ''}`.trim()}
            </span>
            <span className="text-[10px] text-gray-400">{fmtTime(msg.created_at)}</span>
          </p>
        )}
        {msg.is_pinned && (
          <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 mb-0.5 px-1">
            <Pin size={10} fill="currentColor" />
            Pinned{msg.pinned_by ? ` by ${msg.pinned_by.first_name}` : ''}
          </p>
        )}
        <div className="relative max-w-[85%]">
          {/* Hover actions */}
          {hovered && (
            <div className="absolute -top-8 left-0 flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-sm px-1.5 py-1 z-10">
              {QUICK_REACTION_EMOJIS.slice(0, 5).map((e) => (
                <button
                  key={e}
                  onClick={() => reactionMutation.mutate(e)}
                  className="text-sm hover:scale-125 transition-transform"
                  title={e}
                >{e}</button>
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="p-0.5 text-gray-400 hover:text-amber-500 rounded"
                  title="More reactions"
                >
                  <Smile size={13} />
                </button>
                {showEmojiPicker && (
                  <EmojiPicker
                    align={isOwn ? 'right' : 'left'}
                    onSelect={(emoji) => { reactionMutation.mutate(emoji); setShowEmojiPicker(false); }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              <span className="w-px h-4 bg-gray-200 mx-0.5" />
              <button
                onClick={onReply}
                className="p-0.5 text-gray-400 hover:text-primary-600 rounded"
                title="Reply in thread"
              >
                <CornerDownRight size={13} />
              </button>
              <button
                onClick={() => (msg.is_pinned ? unpinMutation.mutate() : pinMutation.mutate())}
                className={cn('p-0.5 rounded', msg.is_pinned ? 'text-amber-600 hover:text-amber-700' : 'text-gray-400 hover:text-amber-600')}
                title={msg.is_pinned ? 'Unpin message' : 'Pin message'}
              >
                <Pin size={13} fill={msg.is_pinned ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => (isSaved ? unsaveMutation.mutate() : saveMutation.mutate())}
                className={cn('p-0.5 rounded', isSaved ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 hover:text-blue-600')}
                title={isSaved ? 'Remove from Saved' : 'Save message'}
              >
                <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
              {isOwn && (
                <button onClick={() => onEdit(msg)} className="p-0.5 text-gray-400 hover:text-blue-500 rounded text-xs font-bold" title="Edit">✏️</button>
              )}
              {/* Delete: message owner, or any global admin (mirrors the
                  backend's already-existing owner-or-ADMIN/SUPER_ADMIN gate
                  on DELETE /chat/channels/:id/messages/:msgId — this button
                  was previously only ever shown to the owner, so an admin
                  had no way to actually reach a capability the API already
                  granted them). */}
              {(isOwn || isGlobalAdmin) && (
                <button onClick={onDelete} className="p-0.5 text-gray-400 hover:text-red-500 rounded" title="Delete">
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {msg.poll ? (
            <PollCard poll={msg.poll} channelId={channelId} currentUserId={currentUserId} isGlobalAdmin={isGlobalAdmin} />
          ) : (
            <div className="text-sm text-gray-800 leading-relaxed">
              {/* File attachment */}
              {msg.file_url && (
                <div className="mb-1">
                  {isImage ? (
                    <img
                      src={msg.file_url}
                      alt={msg.file_name || 'image'}
                      className="max-h-64 rounded-xl object-contain cursor-zoom-in border border-gray-100"
                      onClick={() => onImageClick?.(msg.file_url!, msg.file_name)}
                    />
                  ) : isAudio ? (
                    <audio src={msg.file_url} controls className="h-9 max-w-[220px]" />
                  ) : isVideo ? (
                    <video src={msg.file_url} controls className="max-h-64 rounded-xl" />
                  ) : (
                    <a
                      href={msg.file_url}
                      download={msg.file_name}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 w-fit"
                    >
                      <Paperclip size={12} />
                      <span className="truncate">{msg.file_name}</span>
                      {msg.file_size != null && <span className="shrink-0 opacity-70">{fmtSize(msg.file_size)}</span>}
                    </a>
                  )}
                </div>
              )}
              {msg.is_encrypted ? (
                decrypted === undefined ? (
                  <span className="italic text-gray-400 flex items-center gap-1 text-xs">
                    <Lock size={11} /> Decrypting…
                  </span>
                ) : decrypted === null ? (
                  <span className="italic text-gray-400 flex items-center gap-1 text-xs">
                    🔒 Unable to decrypt this message
                  </span>
                ) : (
                  <span>{renderMessageContent(decrypted)}</span>
                )
              ) : (
                msg.content && <span>{renderMessageContent(msg.content)}</span>
              )}
              {msg.is_edited && (
                <span className="text-[10px] ml-1 opacity-60 text-gray-400">(edited)</span>
              )}
            </div>
          )}
        </div>

        {/* Link preview — mutually exclusive with a real attachment
            server-side (send_message never bothers unfurling alongside a
            file), same "one or the other" rule reflected here. */}
        {msg.link_preview && !msg.file_url && (
          <a
            href={msg.link_preview.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 flex gap-2 max-w-[280px] bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
          >
            {msg.link_preview.image && (
              <img src={msg.link_preview.image} alt="" className="w-16 h-16 object-cover shrink-0" />
            )}
            <div className="py-1.5 pr-2 min-w-0">
              <p className="flex items-center gap-1 text-[10px] text-gray-400 truncate">
                <Link2 size={9} />
                {(() => { try { return new URL(msg.link_preview.url).hostname; } catch { return msg.link_preview.url; } })()}
              </p>
              {msg.link_preview.title && (
                <p className="text-xs font-bold text-gray-800 line-clamp-1">{msg.link_preview.title}</p>
              )}
              {msg.link_preview.description && (
                <p className="text-[11px] text-gray-500 line-clamp-2">{msg.link_preview.description}</p>
              )}
            </div>
          </a>
        )}

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(reactionMap).map(([emoji, { count, mine, names }]) => (
              <button
                key={emoji}
                onClick={() => mine ? removeReactionMutation.mutate(emoji) : reactionMutation.mutate(emoji)}
                title={names.join(', ')}
                className={cn('text-xs px-2 py-0.5 rounded-full font-medium border transition-colors',
                  mine ? 'bg-primary-100 border-primary-300 text-primary-700' : 'bg-gray-100 border-transparent text-gray-700 hover:border-gray-300')}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        {/* Thread reply count */}
        {(msg._count?.replies ?? 0) > 0 && (
          <button
            onClick={onOpenThread}
            className="flex items-center gap-1 text-xs text-primary-600 font-semibold mt-0.5 hover:underline px-1"
          >
            <CornerDownRight size={11} />
            {msg._count!.replies} {msg._count!.replies === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {isOwn && seenBy && seenBy.length > 0 && <SeenByIndicator users={seenBy} />}
      </div>
    </div>
  );
}

function SeenByIndicator({ users }: { users: ChatUser[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative px-1 mt-0.5"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center -space-x-1.5"
        title={users.map((u) => `${u.first_name} ${u.last_name}`).join(', ')}
      >
        {users.slice(0, 3).map((u) => (
          <span key={u.id} className="ring-2 ring-white rounded-full">
            <Avatar user={u} size="xs" />
          </span>
        ))}
        {users.length > 3 && (
          <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[8px] font-black flex items-center justify-center ring-2 ring-white">
            +{users.length - 3}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 pb-1">Seen by</p>
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-2 px-3 py-1.5">
              <Avatar user={u} size="sm" />
              <span className="text-xs font-semibold text-gray-700 truncate">{u.first_name} {u.last_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadPanel({
  channelId, msgId, currentUserId, onClose,
}: {
  channelId: string;
  msgId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: thread } = useQuery<{ parent: ChatMessage; replies: ChatMessage[] }>({
    queryKey: ['chat-thread', channelId, msgId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.THREAD(channelId, msgId));
      return r?.payload;
    },
    enabled: !!channelId && !!msgId,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const invalidate = (payload: { channel_id?: string; channelId?: string; parent_id?: string }) => {
      const eventChannelId = payload.channel_id ?? payload.channelId;
      if (eventChannelId !== channelId || payload.parent_id !== msgId) return;
      qc.invalidateQueries({ queryKey: ['chat-thread', channelId, msgId] });
    };
    socket.on('message:new', invalidate);
    socket.on('message:edited', invalidate);
    socket.on('message:deleted', invalidate);
    return () => {
      socket.off('message:new', invalidate);
      socket.off('message:edited', invalidate);
      socket.off('message:deleted', invalidate);
    };
  }, [channelId, msgId, qc]);

  const sendReplyMutation = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.CHAT.MESSAGES(channelId), {
        method: 'POST',
        body: JSON.stringify({ content: reply.trim(), parent_id: msgId }),
      }),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['chat-thread', channelId, msgId] });
      qc.invalidateQueries({ queryKey: ['chat-messages', channelId] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.replies]);

  return (
    <div className="w-80 border-l border-gray-100 flex flex-col shrink-0">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <p className="font-black text-gray-900 text-sm">Thread</p>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <X size={16} />
        </button>
      </div>

      {/* Parent message */}
      {thread?.parent && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-start gap-2">
            <Avatar user={thread.parent.user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-gray-900">{thread.parent.user?.first_name} {thread.parent.user?.last_name}</p>
              <p className="text-xs text-gray-700 mt-0.5">{thread.parent.content}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{fmtTime(thread.parent.created_at)}</p>
            </div>
          </div>
          {thread.replies.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-2 pl-9">{thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}</p>
          )}
        </div>
      )}

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {(thread?.replies || []).map((r) => {
          const isOwn = r.user_id === currentUserId;
          return (
            <div key={r.id} className="flex items-start gap-2">
              <Avatar user={r.user} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs font-black text-gray-900">{r.user?.first_name} {r.user?.last_name}</p>
                  <p className="text-[10px] text-gray-400">{fmtTime(r.created_at)}</p>
                </div>
                <p className={cn('text-xs mt-0.5 px-2.5 py-1.5 rounded-xl inline-block',
                  isOwn ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800')}>
                  {r.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex gap-2 items-end">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (reply.trim()) sendReplyMutation.mutate(); }
            }}
            placeholder="Reply…"
            rows={1}
            className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            style={{ minHeight: '38px', maxHeight: '80px' }}
          />
          <button
            onClick={() => sendReplyMutation.mutate()}
            disabled={!reply.trim() || sendReplyMutation.isPending}
            className="h-[38px] w-[38px] bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 shrink-0"
          >
            {sendReplyMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function CameraCaptureModal({
  onClose,
  onCapture,
}: {
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startStream = async () => {
    setError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setError(e?.name === 'NotAllowedError' ? 'Camera access denied. Allow camera permission and try again.' : 'Could not access camera.');
    }
  };

  useEffect(() => {
    if (!photoDataUrl) startStream();
    return () => stopStream();
  }, [facingMode, photoDataUrl]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.92));
    stopStream();
  };

  const handleRetake = () => setPhotoDataUrl(null);

  const handleUsePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      onClose();
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900 text-sm flex items-center gap-2"><Camera size={16} /> Take a photo</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
          {error ? (
            <div className="text-center text-gray-300 p-6">
              <VideoOff size={28} className="mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          ) : photoDataUrl ? (
            <img src={photoDataUrl} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} muted playsInline className="w-full h-full object-contain scale-x-[-1]" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 flex items-center justify-center gap-3">
          {photoDataUrl ? (
            <>
              <button
                onClick={handleRetake}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50"
              >
                <RotateCcw size={14} /> Retake
              </button>
              <button
                onClick={handleUsePhoto}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700"
              >
                <Check size={14} /> Use photo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                title="Switch camera"
                className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                <Video size={16} />
              </button>
              <button
                onClick={handleCapture}
                disabled={!!error}
                className="w-14 h-14 rounded-full border-4 border-primary-600 flex items-center justify-center hover:bg-primary-50 disabled:opacity-40"
              >
                <div className="w-10 h-10 rounded-full bg-primary-600" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id || '';
  const { data: myPerms } = useMyPermissions();
  const isGlobalAdmin = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.chat.manage');
  const qc = useQueryClient();
  const toast = useToastContext();

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(() => searchParams.get('channel'));
  const [showMemberPanel, setShowMemberPanel] = useState(true);
  const isMobileView = useIsMobile();
  const [threadMsgId, setThreadMsgId] = useState<string | null>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadedAttachment, setUploadedAttachment] = useState<UploadFileResult | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string | null } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showComposerEmoji, setShowComposerEmoji] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [activeServerId, setActiveServerId] = useState<string | null>(() => searchParams.get('server'));
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [showServerMembersModal, setShowServerMembersModal] = useState(false);
  const canCreateServer = !!myPerms?.is_super_admin || (myPerms?.roles || []).some((r) => ['ADMIN', 'HR'].includes(r));
  const { data: servers = [] } = useGetServersQuery();
  const { data: serverChannels = [] } = useGetServerChannelsQuery(activeServerId);

  const privateKeyRef = useRef<CryptoKey | null>(null);
  const sharedKeyCacheRef = useRef<Map<string, CryptoKey>>(new Map());
  const decryptedCacheRef = useRef<Map<string, string | null>>(new Map());
  const [, forceDecryptRerender] = useState(0);
  const updateMyPublicKeyMutation = useUpdateMyPublicKeyMutation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { privateKey, publicKeySpkiB64 } = await getOrCreateKeyPair();
        if (cancelled) return;
        privateKeyRef.current = privateKey;
        updateMyPublicKeyMutation.mutate(publicKeySpkiB64);
      } catch (e) {
        console.error('E2E keypair bootstrap failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingCancelledRef = useRef(false);
  const speechRecognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const isNearBottomRef = useRef(true);
  const lastTypingSentAtRef = useRef(0);

  const { data: channels = [], isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ['chat-channels'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.CHANNELS);
      return r?.payload?.records || r?.payload || [];
    },
  });

  const otherDmMemberId = useMemo(() => {
    if (!selectedChannelId) return null;
    const ch = channels.find((c) => c.id === selectedChannelId);
    if (!ch || ch.type !== 'DM') return null;
    return getOtherMember(ch, currentUserId)?.id || null;
  }, [selectedChannelId, channels, currentUserId]);

  const { data: peerPublicKey } = useGetUserPublicKeyQuery(otherDmMemberId);

  useEffect(() => {
    if (!otherDmMemberId || !peerPublicKey?.public_key || !privateKeyRef.current) return;
    if (sharedKeyCacheRef.current.has(otherDmMemberId)) return;
    (async () => {
      try {
        const peerKey = await importPublicKey(peerPublicKey.public_key);
        const shared = await deriveSharedKey(privateKeyRef.current!, peerKey);
        sharedKeyCacheRef.current.set(otherDmMemberId, shared);
        forceDecryptRerender((n) => n + 1);
      } catch (e) {
        console.error('Failed to derive shared DM key', e);
      }
    })();
  }, [otherDmMemberId, peerPublicKey]);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat-messages', selectedChannelId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.MESSAGES(selectedChannelId!));
      return r?.payload?.records || r?.payload || [];
    },
    enabled: !!selectedChannelId,
  });

  const [, setPresenceTick] = useState(0);

  const [socketConnected, setSocketConnected] = useState(true);

  const selectedChannelIdRef = useRef(selectedChannelId);
  useEffect(() => { selectedChannelIdRef.current = selectedChannelId; }, [selectedChannelId]);
  const activeServerIdRef = useRef(activeServerId);
  useEffect(() => { activeServerIdRef.current = activeServerId; }, [activeServerId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    setSocketConnected(socket.connected);
    let hasConnectedBefore = socket.connected;
    const handleConnect = () => {
      setSocketConnected(true);
      if (hasConnectedBefore) {
        const channelId = selectedChannelIdRef.current;
        const serverId = activeServerIdRef.current;
        qc.invalidateQueries({ queryKey: ['chat-channels'] });
        if (channelId) {
          qc.invalidateQueries({ queryKey: ['chat-messages', channelId] });
          qc.invalidateQueries({ queryKey: ['chat-members', channelId] });
          qc.invalidateQueries({ queryKey: ['chat-pinned', channelId] });
        }
        qc.invalidateQueries({ queryKey: ['servers'] });
        if (serverId) qc.invalidateQueries({ queryKey: ['server-channels', serverId] });
      }
      hasConnectedBefore = true;
    };
    const handleDisconnect = () => setSocketConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const handleNewMessage = (msg: ChatMessage & { channel_id: string }) => {
      if (!msg.parent_id) {
        qc.setQueryData<ChatMessage[]>(['chat-messages', msg.channel_id], (prev) => {
          if (!prev) return prev;
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
    };
    socket.on('message:new', handleNewMessage);

    const handleMessageEdited = (msg: ChatMessage & { channel_id: string }) => {
      qc.setQueryData<ChatMessage[]>(['chat-messages', msg.channel_id], (prev) =>
        prev?.map((m) => (m.id === msg.id ? msg : m))
      );
      qc.invalidateQueries({ queryKey: ['chat-pinned', msg.channel_id] });
    };
    socket.on('message:edited', handleMessageEdited);

    const handleMessageDeleted = ({ id, channelId }: { id: string; channelId: string }) => {
      qc.setQueryData<ChatMessage[]>(['chat-messages', channelId], (prev) =>
        prev?.filter((m) => m.id !== id)
      );
    };
    socket.on('message:deleted', handleMessageDeleted);

    const handleMessageRead = ({ channelId }: { channelId: string }) => {
      qc.invalidateQueries({ queryKey: ['chat-members', channelId] });
    };
    socket.on('message:read', handleMessageRead);

    const handleConversationUpdate = ({ channelId }: { channelId: string } = {} as any) => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      if (channelId) qc.invalidateQueries({ queryKey: ['chat-members', channelId] });
    };
    socket.on('conversation:update', handleConversationUpdate);

    // Another user's profile (avatar/name/etc) changed — payload is
    // deliberately not trusted as the new data, just a signal to refetch
    // the real thing instead of waiting out these queries' staleTime.
    const handleProfileUpdated = () => {
      qc.invalidateQueries({ queryKey: ['chat-members'] });
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
    };
    socket.on('user:profile-updated', handleProfileUpdated);

    const handleServerUpdate = ({ serverId }: { serverId: string }) => {
      qc.invalidateQueries({ queryKey: ['servers'] });
      if (serverId) qc.invalidateQueries({ queryKey: ['server-channels', serverId] });
    };
    socket.on('server:update', handleServerUpdate);

    const handlePresenceUpdate = ({ userId, online }: { userId: string; online: boolean }) => {
      if (online) onlineUserIds.add(userId);
      else onlineUserIds.delete(userId);
      setPresenceTick((t) => t + 1);
    };
    socket.on('presence:update', handlePresenceUpdate);

    const handleNotificationNew = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };
    socket.on('notification:new', handleNotificationNew);

    const handleTypingUpdate = ({ channelId }: { channelId: string }) => {
      qc.invalidateQueries({ queryKey: ['chat-typing', channelId] });
    };
    socket.on('typing:update', handleTypingUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('message:new', handleNewMessage);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:read', handleMessageRead);
      socket.off('conversation:update', handleConversationUpdate);
      socket.off('user:profile-updated', handleProfileUpdated);
      socket.off('server:update', handleServerUpdate);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('notification:new', handleNotificationNew);
      socket.off('typing:update', handleTypingUpdate);
    };
  }, [qc]);

  useEffect(() => {
    if (!selectedChannelId) return;
    const socket = getSocket();
    socket?.emit('channel:join', selectedChannelId);
  }, [selectedChannelId]);

  const { data: channelMembers = [], isLoading: membersLoading, isError: membersError } = useQuery<ChannelMember[]>({
    queryKey: ['chat-members', selectedChannelId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.MEMBERS(selectedChannelId!));
      return r?.payload?.records || r?.payload || [];
    },
    enabled: !!selectedChannelId,
  });

  const { data: typingUsers = [] } = useQuery<ChatUser[]>({
    queryKey: ['chat-typing', selectedChannelId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.TYPING(selectedChannelId!));
      return r?.payload?.records || r?.payload || [];
    },
    enabled: !!selectedChannelId,
  });

  const { data: mentionResults = [] } = useQuery<ChatUser[]>({
    queryKey: ['chat-mention-users', mentionQuery],
    queryFn: async () => {
      const r = await apiRequest<any>(`${API_ENDPOINTS.CHAT.USERS}?search=${encodeURIComponent(mentionQuery || '')}`);
      return r?.payload || [];
    },
    enabled: mentionQuery !== null,
  });

  const { data: pinnedMessages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['chat-pinned', selectedChannelId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.PINNED(selectedChannelId!));
      return r?.payload?.records || r?.payload || [];
    },
    enabled: !!selectedChannelId,
  });

  const { data: savedEntries = [] } = useQuery<SavedMessageEntry[]>({
    queryKey: ['chat-saved'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.SAVED);
      return r?.payload?.records || r?.payload || [];
    },
  });
  const savedMessageIds = useMemo(() => new Set(savedEntries.map((s) => s.message.id)), [savedEntries]);

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      content: string;
      file_url?: string;
      file_key?: string;
      file_name?: string;
      file_size?: number;
      mime_type?: string;
      mentioned_user_ids?: string[];
      iv?: string;
      is_encrypted?: boolean;
    }) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.MESSAGES(selectedChannelId!), {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setDraft('');
      setAttachmentFile(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      qc.invalidateQueries({ queryKey: ['chat-messages', selectedChannelId] });
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ msgId, content }: { msgId: string; content: string }) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.MESSAGE(selectedChannelId!, msgId), {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setEditingMsg(null);
      setEditDraft('');
      qc.invalidateQueries({ queryKey: ['chat-messages', selectedChannelId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (msgId: string) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.MESSAGE(selectedChannelId!, msgId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-messages', selectedChannelId] }),
  });

  const joinMutation = useMutation({
    mutationFn: (channelId: string) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.JOIN(channelId), { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-channels'] }),
  });

  const typingMutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.CHAT.TYPING(selectedChannelId!), { method: 'POST' }),
  });

  const createPollMutation = useMutation({
    mutationFn: (payload: { question: string; options: string[] }) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.POLLS(selectedChannelId!), { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      setDraft('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      qc.invalidateQueries({ queryKey: ['chat-messages', selectedChannelId] });
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to create poll'),
  });

  const createTaskMutation = useMutation({
    mutationFn: (title: string) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.TASKS(selectedChannelId!), { method: 'POST', body: JSON.stringify({ title }) }),
    onSuccess: () => {
      setDraft('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      qc.invalidateQueries({ queryKey: ['chat-messages', selectedChannelId] });
      toast.success('Task created');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to create task — /task only works in a project-linked channel'),
  });

  const createReminderMutation = useMutation({
    mutationFn: (text: string) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.REMINDERS(selectedChannelId!), { method: 'POST', body: JSON.stringify({ text }) }),
    onSuccess: (r: any) => {
      setDraft('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      toast.success(r?.message || 'Reminder set');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to set reminder — try "/remind Message in 2 hours"'),
  });

  const handleSlashCommand = (): boolean => {
    const trimmed = draft.trim();
    if (!trimmed.startsWith('/')) return false;
    const spaceIdx = trimmed.indexOf(' ');
    const command = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
    const rest = (spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1)).trim();

    if (command === '/poll') {
      const parts = rest.split('|').map((p) => p.trim()).filter(Boolean);
      if (parts.length < 3) { toast.error('Usage: /poll Question? | Option 1 | Option 2'); return true; }
      const [question, ...options] = parts;
      createPollMutation.mutate({ question, options });
      return true;
    }
    if (command === '/task') {
      if (!rest) { toast.error('Usage: /task Title of the task'); return true; }
      createTaskMutation.mutate(rest);
      return true;
    }
    if (command === '/remind') {
      if (!rest) { toast.error('Usage: /remind Message in 2 hours'); return true; }
      createReminderMutation.mutate(rest);
      return true;
    }
    toast.error(`Unknown command "${command}". Try /poll, /task, or /remind.`);
    return true;
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    isNearBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [selectedChannelId]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 120;
  };

  // Keeps ?server=&channel= in sync with the selected context so a
  // refresh (or a shared link) restores the same conversation instead of
  // always landing back on the default DM. Preserves any other existing
  // query params (e.g. Zoom's own ?zoom_chat= return params).
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (activeServerId) next.set('server', activeServerId); else next.delete('server');
      if (selectedChannelId) next.set('channel', selectedChannelId); else next.delete('channel');
      return next;
    }, { replace: true });
  }, [activeServerId, selectedChannelId, setSearchParams]);

  // A server id restored from the URL that this user can't actually
  // access (removed, or never a member) must never be trusted blindly —
  // fall back to Home once the real, authorized server list has loaded.
  useEffect(() => {
    if (!activeServerId || activeServerId === ZOOM_SECTION_ID) return;
    if (servers.length === 0) return;
    if (!servers.some((s) => s.id === activeServerId)) {
      setActiveServerId(null);
      setSelectedChannelId(null);
    }
  }, [activeServerId, servers]);

  useEffect(() => {
    if (activeServerId !== null) return;
    if (channels.length === 0) return;
    // A channel id restored from the URL that isn't in this user's real,
    // authorized channel list (deleted, or never accessible) falls back
    // to the existing default rather than trusting the persisted id.
    if (selectedChannelId && !channels.some((ch) => ch.id === selectedChannelId)) {
      setSelectedChannelId(null);
      return;
    }
    const homeDmChannels = channels.filter((ch) => ch.type === 'DM');
    if (!selectedChannelId && homeDmChannels.length > 0) {
      setSelectedChannelId(homeDmChannels[0].id);
    }
  }, [channels, selectedChannelId, activeServerId]);

  const lastChannelByServerRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (activeServerId === null) return;
    const list = serverChannels as Channel[];
    if (list.length === 0) return;
    if (selectedChannelId && list.some((ch) => ch.id === selectedChannelId)) return;

    const remembered = lastChannelByServerRef.current[activeServerId];
    const rememberedChannel = remembered ? list.find((ch) => ch.id === remembered) : null;
    const generalChannel = list.find((ch) => ch.name?.toLowerCase() === 'general');
    const target = rememberedChannel || generalChannel || list[0];
    if (target) setSelectedChannelId(target.id);
  }, [activeServerId, serverChannels, selectedChannelId]);

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    if (activeServerId !== null) {
      lastChannelByServerRef.current[activeServerId] = channelId;
    }
  };

  const prevLastMessageIdRef = useRef<Record<string, string>>({});
  const hasSeenFirstChannelsLoadRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  useEffect(() => {
    const supportsNotifications = typeof window !== 'undefined' && 'Notification' in window;
    const prevIds = prevLastMessageIdRef.current;
    const nextIds: Record<string, string> = {};

    channels.forEach((ch) => {
      const lastMsg = ch.messages?.[0];
      nextIds[ch.id] = lastMsg?.id || '';

      if (!hasSeenFirstChannelsLoadRef.current) return;
      if (!supportsNotifications || Notification.permission !== 'granted') return;
      if (!lastMsg || lastMsg.user_id === currentUserId) return;
      const prevId = prevIds[ch.id];
      if (prevId === undefined || prevId === lastMsg.id) return;

      const isOpenAndFocused = ch.id === selectedChannelId
        && document.visibilityState === 'visible'
        && document.hasFocus();
      if (isOpenAndFocused) return;

      const senderName = lastMsg.user
        ? `${lastMsg.user.first_name || ''} ${lastMsg.user.last_name || ''}`.trim() || 'Someone'
        : 'Someone';
      const channelLabel = ch.type === 'DM' ? '' : ` in #${ch.name}`;
      try {
        const n = new Notification(`${senderName}${channelLabel}`, {
          body: lastMsg.content || (lastMsg as any).file_name || 'Sent an attachment',
          icon: '/src/assets/icons/tekxai-logo.svg',
          tag: `chat-${ch.id}`,
        });
        n.onclick = () => { window.focus(); setSelectedChannelId(ch.id); n.close(); };
      } catch {
      }
    });

    prevLastMessageIdRef.current = nextIds;
    hasSeenFirstChannelsLoadRef.current = true;
  }, [channels, currentUserId, selectedChannelId]);

  const handleAttachmentSelect = async (file: File | null) => {
    setAttachmentFile(file);
    setUploadedAttachment(null);
    if (!file) return;
    setIsUploadingAttachment(true);
    try {
      const uploaded = await uploadFile(file);
      setUploadedAttachment(uploaded);
    } catch (e: any) {
      toast.error(e?.message || 'Attachment upload failed');
      setAttachmentFile(null);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setUploadedAttachment(null);
    setIsUploadingAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!selectedChannelId || sendMutation.isPending || isUploadingAttachment) return;
    if (!draft.trim() && !attachmentFile) return;
    if (!attachmentFile && handleSlashCommand()) return;
    if (attachmentFile && !uploadedAttachment) return;

    const mentioned_user_ids = extractMentionedUserIds(draft);
    let payload = uploadedAttachment
      ? {
          content: draft.trim(),
          file_url: uploadedAttachment.file_url,
          file_key: uploadedAttachment.file_key,
          file_name: attachmentFile!.name,
          file_size: attachmentFile!.size,
          mime_type: attachmentFile!.type,
          mentioned_user_ids,
        }
      : { content: draft.trim(), mentioned_user_ids };

    const dmChannel = channels.find((c) => c.id === selectedChannelId);
    if (dmChannel?.type === 'DM' && !uploadedAttachment && draft.trim()) {
      const sharedKey = otherDmMemberId ? sharedKeyCacheRef.current.get(otherDmMemberId) : null;
      if (sharedKey) {
        try {
          const { ciphertextB64, ivB64 } = await encryptMessage(sharedKey, draft.trim());
          payload = { content: ciphertextB64, iv: ivB64, is_encrypted: true, mentioned_user_ids: [] } as typeof payload;
        } catch (e) {
          console.error('DM encryption failed, message not sent', e);
          toast.error('Could not encrypt this message — try again');
          return;
        }
      }
    }

    sendMutation.mutate(payload);
    setUploadedAttachment(null);
    setMentionQuery(null);
  };

  const insertMention = (user: ChatUser) => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? draft.length;
    const before = draft.slice(0, cursor);
    const after = draft.slice(cursor);
    const atIndex = before.lastIndexOf('@');
    if (atIndex === -1) return;
    const token = `@[${user.first_name} ${user.last_name}](user:${user.id}) `;
    const next = before.slice(0, atIndex) + token + after;
    setDraft(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      textarea?.focus();
      const pos = atIndex + token.length;
      textarea?.setSelectionRange(pos, pos);
    });
  };

  const insertBroadcastMention = (word: 'here' | 'channel') => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? draft.length;
    const before = draft.slice(0, cursor);
    const after = draft.slice(cursor);
    const atIndex = before.lastIndexOf('@');
    if (atIndex === -1) return;
    const token = `@${word} `;
    const next = before.slice(0, atIndex) + token + after;
    setDraft(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      textarea?.focus();
      const pos = atIndex + token.length;
      textarea?.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null) {
      if (e.key === 'Escape') { e.preventDefault(); setMentionQuery(null); return; }
      if (e.key === 'Enter' && mentionResults.length > 0) { e.preventDefault(); insertMention(mentionResults[0]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const wrapSelection = (before: string, after: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.slice(start, end) || placeholder;
    const next = draft.slice(0, start) + before + selected + after + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDraft(value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    const cursor = e.target.selectionStart;
    const uptoCursor = value.slice(0, cursor);
    const mentionMatch = /(?:^|\s)@([a-zA-Z0-9]*)$/.exec(uptoCursor);
    setMentionQuery(mentionMatch ? mentionMatch[1] : null);

    if (selectedChannelId && value.trim()) {
      const now = Date.now();
      if (now - lastTypingSentAtRef.current > 3000) {
        lastTypingSentAtRef.current = now;
        typingMutation.mutate();
        getSocket()?.emit('typing:start', { channelId: selectedChannelId });
      }
    }
  };

  const handleComposerPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items?.length) return;
    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    const blob = imageItem.getAsFile();
    if (!blob) return;
    e.preventDefault();
    const ext = imageItem.type.split('/')[1] || 'png';
    const file = new File([blob], `pasted-image-${Date.now()}.${ext}`, { type: imageItem.type });
    handleAttachmentSelect(file);
  };

  const handleCameraCapture = (file: File) => {
    handleAttachmentSelect(file);
  };

  const downloadChannelExport = async (format: 'csv' | 'pdf') => {
    if (!selectedChannelId || !selectedChannel) return;
    setShowExportMenu(false);
    try {
      const token = localStorage.getItem('tekxai_access_token');
      const res = await fetch(`${BASE_URL}${API_ENDPOINTS.CHAT.EXPORT(selectedChannelId, format)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const safeName = (selectedChannel.name || 'channel').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    }
  };

  const stopRecordingStream = () => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordingStreamRef.current = null;
  };

  const startRecording = async () => {
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
      const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recordingCancelledRef.current = false;
      finalTranscriptRef.current = '';
      setLiveTranscript('');
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stopRecordingStream();
        if (recordingCancelledRef.current || recordedChunksRef.current.length === 0) return;
        const baseMime = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
        const ext = baseMime === 'audio/ogg' ? 'ogg' : baseMime === 'audio/mp4' ? 'm4a' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: baseMime });
        const file = new File([blob], `voice-message-${Date.now()}.${ext}`, { type: baseMime });
        const transcript = finalTranscriptRef.current.trim();
        if (transcript) setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
        handleAttachmentSelect(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);

      const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalTranscriptRef.current += `${text} `;
            else interim += text;
          }
          setLiveTranscript((finalTranscriptRef.current + interim).trim());
        };
        recognition.onerror = () => {};
        speechRecognitionRef.current = recognition;
        try { recognition.start(); } catch { /* unsupported/blocked — audio-only, silently */ }
      }
    } catch (e: any) {
      setRecordingError(e?.name === 'NotAllowedError' ? 'Microphone access denied.' : 'Could not access microphone.');
      stopRecordingStream();
    }
  };

  const stopSpeechRecognition = () => {
    try { speechRecognitionRef.current?.stop(); } catch { /* noop */ }
    speechRecognitionRef.current = null;
  };

  const stopRecording = () => {
    recordingCancelledRef.current = false;
    mediaRecorderRef.current?.stop();
    stopSpeechRecognition();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    mediaRecorderRef.current?.stop();
    stopSpeechRecognition();
    setIsRecording(false);
    recordedChunksRef.current = [];
    finalTranscriptRef.current = '';
    setLiveTranscript('');
  };

  useEffect(() => () => { stopRecordingStream(); mediaRecorderRef.current?.stop(); stopSpeechRecognition(); }, []);

  const selectedChannel = channels.find((ch) => ch.id === selectedChannelId)
    || (serverChannels as Channel[]).find((ch) => ch.id === selectedChannelId)
    || null;
  const isMember = selectedChannel
    ? selectedChannel.members?.some((m) => m.user_id === currentUserId) || selectedChannel.type === 'PUBLIC' || selectedChannel.type === 'ANNOUNCEMENT'
    : false;
  const myMembership = selectedChannel?.members?.find((m) => m.user_id === currentUserId);
  const canPostHere = selectedChannel?.type !== 'ANNOUNCEMENT' || isGlobalAdmin || ['OWNER', 'ADMIN'].includes(myMembership?.role || '');

  const homeChannels = channels.filter((ch) => ch.type === 'DM');
  const sidebarSourceChannels = activeServerId ? (serverChannels as Channel[]) : homeChannels;

  const filteredChannels = sidebarSourceChannels.filter((ch) => {
    if (!channelSearch) return true;
    return getChannelDisplayName(ch, currentUserId).toLowerCase().includes(channelSearch.toLowerCase());
  });

  const sortedChannels = [...filteredChannels].sort((a, b) => {
    const aTime = a.messages?.[0]?.created_at || a.updated_at;
    const bTime = b.messages?.[0]?.created_at || b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const badge = selectedChannel ? PRIVACY_BADGE[selectedChannel.type] : null;

  const lastOwnMsg = [...messages].reverse().find((m) => m.user_id === currentUserId);
  const seenByForLastOwnMsg = lastOwnMsg
    ? channelMembers
        .filter((m) => m.user_id !== currentUserId && m.last_read_at && new Date(m.last_read_at) >= new Date(lastOwnMsg.created_at))
        .map((m) => m.user)
    : [];

  const activeServer = activeServerId ? servers.find((s) => s.id === activeServerId) || null : null;

  const setChatTopbarTitle = useChatTopbarStore((s) => s.setTitle);
  useEffect(() => {
    setChatTopbarTitle(activeServer ? activeServer.name : null);
    return () => setChatTopbarTitle(null);
  }, [activeServer, setChatTopbarTitle]);

  if (activeServerId === ZOOM_SECTION_ID) {
    return (
      <div className="flex h-[calc(100vh-5.5rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <ServerRail
          servers={servers}
          activeServerId={activeServerId}
          onSelectHome={() => { setActiveServerId(null); setSelectedChannelId(null); }}
          onSelectServer={(id) => { setActiveServerId(id); setSelectedChannelId(null); }}
          onSelectZoom={() => setActiveServerId(ZOOM_SECTION_ID)}
          onAddServer={() => setShowCreateServerModal(true)}
          canCreate={canCreateServer}
        />
        <ZoomChatPanel />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5.5rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      <ServerRail
        servers={servers}
        activeServerId={activeServerId}
        onSelectHome={() => { setActiveServerId(null); setSelectedChannelId(null); }}
        onSelectServer={(id) => { setActiveServerId(id); setSelectedChannelId(null); }}
        onSelectZoom={() => setActiveServerId(ZOOM_SECTION_ID)}
        onAddServer={() => setShowCreateServerModal(true)}
        canCreate={canCreateServer}
      />

      {/* ── Left Panel ── */}
      <div className="w-64 border-r border-gray-100 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-end">
          <div className="flex items-center gap-1 shrink-0">
            {activeServer ? (
              <button
                onClick={() => setShowServerMembersModal(true)}
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                title="Server settings — members"
              >
                <Settings size={14} />
              </button>
            ) : (
              <button
                onClick={() => setShowSaved(true)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                title="Saved messages"
              >
                <Bookmark size={14} />
              </button>
            )}
            <button
              onClick={() => setShowNewChat(true)}
              className="p-1.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              title={activeServer ? `New channel in ${activeServer.name}` : 'New chat'}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="px-3 py-2.5 border-b border-gray-50">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full h-8 pl-8 pr-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
              placeholder="Search…"
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {channelsLoading && (
            <div className="flex items-center justify-center h-24 text-gray-300">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
          {!channelsLoading && filteredChannels.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 p-6 text-center">
              <MessageSquare size={28} className="mb-2" />
              <p className="text-sm font-semibold text-gray-400">No conversations yet</p>
              <p className="text-xs text-gray-300 mt-1">Start one with the + button</p>
            </div>
          )}
          <GroupedChannelList channels={sortedChannels} currentUserId={currentUserId} selectedId={selectedChannelId} onSelect={handleSelectChannel} />
        </div>
      </div>

      {/* ── Center Panel ── */}
      {selectedChannel ? (
        <>
        <div className="flex-1 flex flex-col min-w-0">
          {!socketConnected && (
            <div className="px-4 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold text-center border-b border-amber-100">
              Reconnecting…
            </div>
          )}
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
            {selectedChannel.type === 'DM' ? (
              <>
                <Avatar user={getOtherMember(selectedChannel, currentUserId)} showStatus />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900 text-sm truncate">{getChannelDisplayName(selectedChannel, currentUserId)}</p>
                    {badge && <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0', badge.cls)}>{badge.label}</span>}
                    {selectedChannel.entity_type === 'PROJECT' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 bg-indigo-50 text-indigo-700" title="Synced with this project's team automatically">Project</span>
                    )}
                    <ShieldCheck
                      size={13}
                      className="text-emerald-600 shrink-0"
                      title="End-to-end encrypted — messages are only readable on devices where you're logged in"
                    />
                  </div>
                  <p className={cn('text-xs', isOnline(getOtherMember(selectedChannel, currentUserId)) ? 'text-emerald-600 font-semibold' : 'text-gray-400')}>
                    {fmtLastSeen(getOtherMember(selectedChannel, currentUserId)) || getOtherMember(selectedChannel, currentUserId)?.designation || 'Direct Message'}
                  </p>
                </div>
              </>
            ) : selectedChannel.type === 'PRIVATE' ? (
              <>
                <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <Lock size={16} className="text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900 text-sm truncate">{selectedChannel.name}</p>
                    {badge && <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0', badge.cls)}>{badge.label}</span>}
                    {selectedChannel.entity_type === 'PROJECT' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 bg-indigo-50 text-indigo-700" title="Synced with this project's team automatically">Project</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{selectedChannel._count?.members || selectedChannel.members?.length || 0} members</p>
                </div>
              </>
            ) : selectedChannel.type === 'ANNOUNCEMENT' ? (
              <>
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Megaphone size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900 text-sm truncate"># {selectedChannel.name}</p>
                    {badge && <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0', badge.cls)}>{badge.label}</span>}
                  </div>
                  <p className="text-xs text-gray-400">{selectedChannel._count?.members || 0} members · only owners/admins can post</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Hash size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900 text-sm truncate"># {selectedChannel.name}</p>
                    {badge && <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0', badge.cls)}>{badge.label}</span>}
                    {selectedChannel.entity_type === 'PROJECT' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 bg-indigo-50 text-indigo-700" title="Synced with this project's team automatically">Project</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{selectedChannel._count?.members || 0} members</p>
                </div>
              </>
            )}

            {/* Action icons */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              {pinnedMessages.length > 0 && (
                <button
                  onClick={() => setShowPinned(true)}
                  className="relative p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                  title="Pinned messages"
                >
                  <Pin size={16} />
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {pinnedMessages.length}
                  </span>
                </button>
              )}
              <button
                onClick={() => setShowSearch(true)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                title="Search messages"
              >
                <Search size={16} />
              </button>
              <button
                onClick={() => setShowMemberPanel((v) => !v)}
                className={cn('p-1.5 rounded-lg', showMemberPanel ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')}
                title={selectedChannel.type === 'DM' ? 'Participants' : 'Members panel'}
              >
                <PanelRight size={16} />
              </button>
              {selectedChannel.type !== 'DM' && !isMember && (
                <button
                  onClick={() => joinMutation.mutate(selectedChannel.id)}
                  disabled={joinMutation.isPending}
                  className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 disabled:opacity-50"
                >
                  {joinMutation.isPending ? 'Joining…' : 'Join'}
                </button>
              )}
              {(isMember || isGlobalAdmin) && (
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Members"
                >
                  <Users size={16} />
                </button>
              )}
              {/* Global admins (matching the backend's is_global_admin bypass
                  on update/archive/delete_channel) can always reach settings
                  — including Delete — even for a channel they were never
                  added to themselves. Previously gated on isMember alone, so
                  an admin who wasn't a member of a given channel had no way
                  to reach Delete Channel at all. */}
              {(isMember || isGlobalAdmin) && selectedChannel.type !== 'DM' && (
                <button
                  onClick={() => setShowChannelSettings(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
              )}
              {isMember && (
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu((v) => !v)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Export chat history"
                  >
                    <Download size={16} />
                  </button>
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                        <button
                          onClick={() => downloadChannelExport('csv')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <FileText size={13} className="text-gray-400" /> Export as CSV
                        </button>
                        <button
                          onClick={() => downloadChannelExport('pdf')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <FileText size={13} className="text-gray-400" /> Export as PDF
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3"
          >

            {messagesLoading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="animate-spin text-gray-300" size={24} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-300 py-16">
                <MessageSquare size={32} className="mb-2" />
                <p className="text-sm font-semibold text-gray-400">No messages yet</p>
                <p className="text-xs text-gray-300">{isMember ? 'Send the first message' : 'Join to send messages'}</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.user_id === currentUserId;
                const showName = true;
                if (editingMsg?.id === msg.id) {
                  return (
                    <div key={msg.id} className="flex gap-2 items-end">
                      <Avatar user={msg.user} size="sm" />
                      <div className="flex-1 flex gap-2 items-end">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editMutation.mutate({ msgId: msg.id, content: editDraft }); }
                            if (e.key === 'Escape') { setEditingMsg(null); }
                          }}
                          rows={1}
                          autoFocus
                          className="flex-1 resize-none px-3 py-2 border-2 border-primary-400 rounded-xl text-sm focus:outline-none"
                          style={{ minHeight: '36px' }}
                        />
                        <button onClick={() => editMutation.mutate({ msgId: msg.id, content: editDraft })} disabled={editMutation.isPending} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-xl">Save</button>
                        <button onClick={() => setEditingMsg(null)} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl">Cancel</button>
                      </div>
                    </div>
                  );
                }
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={isOwn}
                    showSenderName={showName}
                    currentUserId={currentUserId}
                    channelId={selectedChannelId!}
                    isGlobalAdmin={isGlobalAdmin}
                    isSaved={savedMessageIds.has(msg.id)}
                    onDelete={() => deleteMutation.mutate(msg.id)}
                    onReply={() => setThreadMsgId(msg.id)}
                    onOpenThread={() => setThreadMsgId(msg.id)}
                    onEdit={(m) => { setEditingMsg(m); setEditDraft(m.content); }}
                    onImageClick={(url, name) => setLightboxImage({ url, name: name ?? null })}
                    seenBy={lastOwnMsg?.id === msg.id ? seenByForLastOwnMsg : undefined}
                    dmSharedKey={otherDmMemberId ? sharedKeyCacheRef.current.get(otherDmMemberId) : undefined}
                  />
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-5 pb-1 flex items-center gap-1.5 text-xs text-gray-400 italic">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" />
              </span>
              {typingUsers.length === 1
                ? `${typingUsers[0].first_name} is typing…`
                : typingUsers.length === 2
                ? `${typingUsers[0].first_name} and ${typingUsers[1].first_name} are typing…`
                : `${typingUsers.length} people are typing…`}
            </div>
          )}

          {/* Composer */}
          {isMember && !canPostHere && (
            <div className="px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2 h-[42px] px-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 font-semibold">
                <Megaphone size={14} />
                Only this channel's owners/admins can post here
              </div>
            </div>
          )}
          {isMember && canPostHere && (
            <div className="px-4 py-3 border-t border-gray-100">
              {/* Attachment preview chip */}
              {attachmentFile && !isRecording && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                  {isUploadingAttachment ? <Loader2 size={13} className="text-gray-400 shrink-0 animate-spin" /> : <Paperclip size={13} className="text-gray-400 shrink-0" />}
                  <span className="text-gray-700 truncate flex-1">{attachmentFile.name}</span>
                  {isUploadingAttachment ? (
                    <span className="text-gray-400 text-xs shrink-0">Uploading…</span>
                  ) : (
                    <span className="text-gray-400 text-xs shrink-0">{fmtSize(attachmentFile.size)}</span>
                  )}
                  <button onClick={clearAttachment} className="text-gray-400 hover:text-red-500">
                    <X size={13} />
                  </button>
                </div>
              )}
              {recordingError && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-red-50 rounded-xl border border-red-100 text-xs text-red-600">
                  {recordingError}
                </div>
              )}

              {isRecording ? (
                <div className="flex gap-2 items-center min-h-[42px] px-3 py-2 border border-red-200 bg-red-50 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0 self-start mt-1.5" />
                  <span className="text-sm font-bold text-red-600 tabular-nums shrink-0 self-start">
                    {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                  </span>
                  {/* Live transcript (Web Speech API) if the browser
                      supports it, otherwise the plain fallback label. */}
                  <span className="text-xs text-red-400 flex-1 line-clamp-2">
                    {liveTranscript || 'Recording voice message…'}
                  </span>
                  <button onClick={cancelRecording} title="Cancel" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg shrink-0">
                    <Trash2 size={15} />
                  </button>
                  <button onClick={stopRecording} title="Stop and attach" className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shrink-0">
                    <Square size={13} fill="currentColor" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  {/* Formatting toolbar — wraps the current selection with
                      markdown-lite syntax; messageContent.tsx renders it back
                      out for every reader. */}
                  <div className="flex items-center gap-0.5 mb-1">
                    <button type="button" onClick={() => wrapSelection('**', '**', 'bold text')} title="Bold" className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md">
                      <Bold size={13} />
                    </button>
                    <button type="button" onClick={() => wrapSelection('*', '*', 'italic text')} title="Italic" className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md">
                      <Italic size={13} />
                    </button>
                    <button type="button" onClick={() => wrapSelection('`', '`', 'code')} title="Code" className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md">
                      <Code size={13} />
                    </button>
                  </div>

                  <div className="flex gap-2 items-end">
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleAttachmentSelect(e.target.files?.[0] || null)} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl shrink-0"
                      title="Attach file"
                    >
                      <Paperclip size={16} />
                    </button>
                    <button
                      onClick={() => setShowCamera(true)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl shrink-0"
                      title="Take a photo"
                    >
                      <Camera size={16} />
                    </button>
                    <button
                      onClick={startRecording}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl shrink-0"
                      title="Record a voice message"
                    >
                      <Mic size={16} />
                    </button>
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setShowComposerEmoji((v) => !v)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
                        title="Emoji"
                      >
                        <Smile size={16} />
                      </button>
                      {showComposerEmoji && (
                        <EmojiPicker
                          align="left"
                          onSelect={(emoji) => {
                            const textarea = textareaRef.current;
                            const pos = textarea?.selectionStart ?? draft.length;
                            const next = draft.slice(0, pos) + emoji + draft.slice(pos);
                            setDraft(next);
                            setShowComposerEmoji(false);
                            requestAnimationFrame(() => { textarea?.focus(); textarea?.setSelectionRange(pos + emoji.length, pos + emoji.length); });
                          }}
                          onClose={() => setShowComposerEmoji(false)}
                        />
                      )}
                    </div>
                    <div className="relative flex-1">
                      {/* @-mention autocomplete dropdown — @here/@channel
                          (broadcast to everyone) are offered above the
                          per-person matches whenever they fit what's typed
                          so far. */}
                      {mentionQuery !== null && (() => {
                        const q = mentionQuery.toLowerCase();
                        const broadcasts = (['here', 'channel'] as const).filter((w) => w.startsWith(q));
                        if (broadcasts.length === 0 && mentionResults.length === 0) return null;
                        return (
                          <div className="absolute bottom-full mb-2 left-0 w-64 max-h-56 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl z-20">
                            {broadcasts.map((word) => (
                              <button
                                key={word}
                                onClick={() => insertBroadcastMention(word)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-50"
                              >
                                <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                  <AtSign size={12} className="text-amber-700" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-bold text-gray-800">@{word}</span>
                                  <span className="block text-[11px] text-gray-400">Notify everyone in this channel</span>
                                </span>
                              </button>
                            ))}
                            {mentionResults.map((u) => (
                              <button
                                key={u.id}
                                onClick={() => insertMention(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                              >
                                <Avatar user={u} size="xs" />
                                <span className="text-sm font-semibold text-gray-800 truncate">{u.first_name} {u.last_name}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                      {/* Slash-command hint — shown while still typing the
                          command word itself (before the first space), so
                          it gets out of the way once you're typing the
                          actual question/title/message. */}
                      {mentionQuery === null && draft.startsWith('/') && !draft.includes(' ') && (() => {
                        const matches = SLASH_COMMANDS.filter((c) => c.command.startsWith(draft.toLowerCase()));
                        if (matches.length === 0) return null;
                        return (
                          <div className="absolute bottom-full mb-2 left-0 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-20 overflow-hidden">
                            {matches.map((c) => (
                              <button
                                key={c.command}
                                onClick={() => {
                                  setDraft(`${c.command} `);
                                  requestAnimationFrame(() => textareaRef.current?.focus());
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                              >
                                <span className="text-gray-400 shrink-0">{c.icon}</span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-bold text-gray-800">{c.command}</span>
                                  <span className="block text-[11px] text-gray-400 truncate">{c.description} · {c.usage}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                      <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handleComposerPaste}
                        placeholder={
                          selectedChannel.type === 'DM'
                            ? `Message ${getChannelDisplayName(selectedChannel, currentUserId)}…`
                            : `Message #${selectedChannel.name}…`
                        }
                        rows={1}
                        className="w-full resize-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                        style={{ height: 'auto', minHeight: '42px', maxHeight: '120px' }}
                      />
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={(!draft.trim() && !attachmentFile) || sendMutation.isPending || isUploadingAttachment}
                      className="h-[42px] w-[42px] bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 transition-colors shrink-0"
                    >
                      {sendMutation.isPending || isUploadingAttachment ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    </button>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-gray-300 mt-1 pl-1">Shift+Enter for new line · Enter to send · @ to mention</p>
            </div>
          )}
        </div>
        <MemberSidebar
          isVisible={showMemberPanel}
          conversationId={selectedChannelId}
          isMobile={isMobileView}
          onClose={() => setShowMemberPanel(false)}
          title={selectedChannel.type === 'DM' ? 'Participants' : 'Members'}
          compact={selectedChannel.type === 'DM'}
          isLoading={membersLoading}
          isError={membersError}
          members={channelMembers.filter((m) => m.user).map((m) => ({
            id: m.user.id,
            name: [m.user.first_name, m.user.last_name].filter(Boolean).join(' ') || 'Unknown',
            designation: m.user.designation,
            avatar: m.user.avatar,
            online: isOnline(m.user),
          }))}
        />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
          <MessageSquare size={48} className="mb-3" />
          <p className="font-semibold text-gray-400">Select a conversation</p>
          <p className="text-sm text-gray-300 mt-1">or start a new one with the + button</p>
        </div>
      )}

      {/* Image attachment lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            title="Close"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.name || 'image'}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const res = await fetch(lightboxImage.url);
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = lightboxImage.name || 'image';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(blobUrl);
              } catch {
                toast.error('Download failed');
              }
            }}
            className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <Paperclip size={12} /> Download
          </button>
        </div>
      )}

      {/* ── Thread Panel ── */}
      {threadMsgId && selectedChannelId && (
        <ThreadPanel
          channelId={selectedChannelId}
          msgId={threadMsgId}
          currentUserId={currentUserId}
          onClose={() => setThreadMsgId(null)}
        />
      )}

      {/* ── Modals ── */}
      {showNewChat && (
        <NewChannelModal
          onClose={() => setShowNewChat(false)}
          onCreated={(id) => { setSelectedChannelId(id); setShowNewChat(false); }}
          serverId={activeServerId}
        />
      )}

      {showCreateServerModal && (
        <CreateServerModal
          onClose={() => setShowCreateServerModal(false)}
          onCreated={(id) => setActiveServerId(id)}
        />
      )}

      {showServerMembersModal && activeServerId && (
        <ServerMembersModal
          serverId={activeServerId}
          isGlobalAdmin={isGlobalAdmin}
          onClose={() => setShowServerMembersModal(false)}
        />
      )}

      {showMembersModal && selectedChannelId && (
        <MembersModal
          channelId={selectedChannelId}
          currentUserId={currentUserId}
          currentUserRole={myMembership?.role}
          isGlobalAdmin={isGlobalAdmin}
          onClose={() => setShowMembersModal(false)}
        />
      )}

      {showChannelSettings && selectedChannel && (
        <ChannelSettingsModal
          channel={selectedChannel}
          currentUserRole={myMembership?.role}
          isGlobalAdmin={isGlobalAdmin}
          canMakePublic={!!myPerms?.is_super_admin || (myPerms?.roles || []).some((r) => ['ADMIN', 'HR'].includes(r))}
          onClose={() => setShowChannelSettings(false)}
          onSaved={() => setShowChannelSettings(false)}
          onLeftOrDeleted={() => {
            setShowChannelSettings(false);
            setSelectedChannelId(null);
          }}
        />
      )}

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onJumpToChannel={(id) => { setSelectedChannelId(id); setShowSearch(false); }}
          currentUserId={currentUserId}
        />
      )}

      {showCamera && (
        <CameraCaptureModal
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
        />
      )}

      {showPinned && selectedChannelId && (
        <PinnedMessagesPanel
          channelId={selectedChannelId}
          onClose={() => setShowPinned(false)}
        />
      )}

      {showSaved && (
        <SavedMessagesPanel
          onClose={() => setShowSaved(false)}
          onJumpToChannel={(channelId) => setSelectedChannelId(channelId)}
        />
      )}
    </div>
  );
}
