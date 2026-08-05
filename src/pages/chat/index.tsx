import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Plus, Search, Send, X, Users, User, Loader2,
  Hash, Lock, Settings, Paperclip, CornerDownRight, ChevronDown,
  Mic, Square, Trash2, Camera, RotateCcw, Check, Video, VideoOff,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import ActionModal from '@/components/ui/ActionModal';
import { uploadFile, type UploadFileResult } from '@/lib/upload';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';

// ─── Types ───────────────────────────────────────────────────────────────────

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
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DM' | 'GROUP';
  is_archived: boolean;
  entity_type?: string | null;
  entity_id?: string | null;
  unread_count?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  members: ChannelMember[];
  messages: ChatMessage[];
  _count?: { messages: number; members: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOtherMember(channel: Channel, currentUserId: string): ChatUser | undefined {
  return channel.members?.find((m) => m.user_id !== currentUserId)?.user;
}

function getChannelDisplayName(channel: Channel, currentUserId: string): string {
  if (channel.type === 'DM') {
    const other = getOtherMember(channel, currentUserId);
    // first_name/last_name are optional in the DB — some seeded accounts
    // have no last_name at all, and unconditionally interpolating both
    // rendered the literal string "null" next to the first name.
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

// "Online" derived client-side from a heartbeat (users.last_active_at,
// bumped by the auth middleware on any request, throttled to 1/min) — there's
// no WebSocket in this app, so this is presence-by-recency, not true push.
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
function isOnline(user?: ChatUser | null): boolean {
  if (!user?.last_active_at) return false;
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
  PUBLIC:  { label: 'Public',  cls: 'bg-green-50 text-green-700' },
  PRIVATE: { label: 'Private', cls: 'bg-yellow-50 text-yellow-700' },
  DM:      { label: 'Direct',  cls: 'bg-blue-50 text-blue-700' },
  GROUP:   { label: 'Group',   cls: 'bg-purple-50 text-purple-700' },
};

const ROLE_BADGE: Record<string, string> = {
  OWNER:  'bg-purple-100 text-purple-700',
  ADMIN:  'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-600',
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

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

// ─── Members Modal ────────────────────────────────────────────────────────────

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
  // Mirrors the backend's is_global_admin(req) bypass on add_member/
  // remove_member — a SUPER_ADMIN/ADMIN can manage membership even for a
  // channel they aren't a member (or OWNER/ADMIN member) of themselves.
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
  // A channel_members row can outlive the user it points to (account
  // deleted/deactivated without a cleanup pass) — its `user` include comes
  // back null and the row list below skips it, so the header count must use
  // this same filtered set or it shows a member count nothing on screen
  // backs up (e.g. "3 members" with only 2 rows visible).
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

// ─── Channel Settings Modal ───────────────────────────────────────────────────

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
  // Mirrors the backend's is_global_admin(req) bypass on update_channel/
  // archive_channel/delete_channel — a SUPER_ADMIN/ADMIN can act on any
  // channel even if they hold no role in it (or aren't a member at all),
  // same as the backend already allows. Without this, currentUserRole is
  // undefined for a channel the admin never joined, and every one of these
  // stayed hidden regardless of global role.
  const canEdit = isGlobalAdmin || ['OWNER', 'ADMIN'].includes(currentUserRole || '');
  const canArchive = isGlobalAdmin || currentUserRole === 'OWNER';
  const canDelete = isGlobalAdmin || currentUserRole === 'OWNER';
  // A project channel's roster follows the project team (project-chat sync
  // on the backend) — leaving would just fight that on the next project
  // update, so the backend rejects it and this button is hidden to match.
  // DMs have no "leave" concept either.
  // Global admins can now open Settings for a channel they were never added
  // to (see canDelete/canArchive above) — "Leave" only makes sense if you
  // actually hold a role in the channel to begin with.
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
                  // Retyping to PUBLIC is Super Admin/Admin/HR only on the
                  // backend (update_channel) — same gate as creating one
                  // public in the first place. Hide the option rather than
                  // let someone pick it and hit a 403 on save.
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

// ─── Search Modal ─────────────────────────────────────────────────────────────

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

// ─── New Channel Modal ────────────────────────────────────────────────────────

type NewChatTab = 'direct' | 'group' | 'private' | 'public';

function NewChannelModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const currentGlobalRole = useAuthStore((s) => s.role);
  // Group/Private/Public channel creation is admin/HR-only server-side (see
  // chat.routes.js CAN_CREATE_CHANNEL) — regular employees can only start
  // Direct messages. Hide the tabs rather than let someone pick one and hit
  // a 403 on submit.
  const canCreateChannels = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(currentGlobalRole || '');
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

  const groupMutation = useMutation({
    mutationFn: ({ name, member_ids }: { name: string; member_ids: string[] }) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.GROUP, { method: 'POST', body: JSON.stringify({ name, member_ids }) }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      onCreated(data?.payload?.id);
    },
  });

  const privateMutation = useMutation({
    mutationFn: ({ name, description, member_ids }: { name: string; description: string; member_ids: string[] }) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.PRIVATE, { method: 'POST', body: JSON.stringify({ name, description, member_ids }) }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      onCreated(data?.payload?.id);
    },
  });

  const publicMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      apiRequest<any>(API_ENDPOINTS.CHAT.CHANNELS, { method: 'POST', body: JSON.stringify({ name, description }) }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      onCreated(data?.payload?.id);
    },
  });

  const toggleMember = (uid: string) =>
    setSelectedMembers((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);

  const TABS: { key: NewChatTab; label: string; icon: React.ReactNode }[] = [
    { key: 'direct',  label: 'Direct',  icon: <User size={13} /> },
    ...(canCreateChannels ? [
      { key: 'group' as NewChatTab, label: 'Group', icon: <Users size={13} /> },
      { key: 'private' as NewChatTab, label: 'Private', icon: <Lock size={13} /> },
      { key: 'public' as NewChatTab, label: 'Public', icon: <Hash size={13} /> },
    ] : []),
  ];

  const needsName = tab === 'group' || tab === 'private' || tab === 'public';
  const needsMembers = tab === 'direct' || tab === 'group' || tab === 'private';
  const isLoading = dmMutation.isPending || groupMutation.isPending || privateMutation.isPending || publicMutation.isPending;

  const handleCreate = () => {
    if (tab === 'group') groupMutation.mutate({ name: channelName.trim(), member_ids: selectedMembers });
    else if (tab === 'private') privateMutation.mutate({ name: channelName.trim(), description: channelDesc.trim(), member_ids: selectedMembers });
    else if (tab === 'public') publicMutation.mutate({ name: channelName.trim(), description: channelDesc.trim() });
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
              placeholder={tab === 'group' ? 'Group name…' : 'Channel name…'}
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              autoFocus
            />
          )}
          {(tab === 'private' || tab === 'public') && (
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
              disabled={!channelName.trim() || (tab !== 'public' && selectedMembers.length === 0) || isLoading}
              className="w-full h-10 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              {tab === 'group' && `Create Group (${selectedMembers.length} selected)`}
              {tab === 'private' && `Create Private Channel`}
              {tab === 'public' && `Create Public Channel`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Channel Section ──────────────────────────────────────────────────────────

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
        // Server-computed (channel_members.last_read_at vs messages.created_at,
        // excluding your own messages) — replaces a client-side date heuristic
        // that couldn't tell "1 unread" from "40 unread".
        const unreadCount = ch.unread_count || 0;
        const hasUnread = unreadCount > 0;
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
            ) : ch.type === 'GROUP' ? (
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                isSelected ? 'bg-primary-200' : 'bg-gray-200')}>
                <Users size={13} className={isSelected ? 'text-primary-700' : 'text-gray-500'} />
              </div>
            ) : ch.type === 'PRIVATE' ? (
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                isSelected ? 'bg-yellow-200' : 'bg-yellow-50')}>
                <Lock size={12} className={isSelected ? 'text-yellow-700' : 'text-yellow-500'} />
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
                    ? `${lastMsg.user_id === currentUserId ? 'You' : (lastMsg.user?.first_name || '')}: ${lastMsg.content || (lastMsg as any).file_name || 'Attachment'}`
                    : 'No messages yet'}
                </p>
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

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg, isOwn, showSenderName, currentUserId, channelId, isGlobalAdmin,
  onDelete, onReply, onOpenThread, onEdit, onImageClick, seenBy,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  isGlobalAdmin?: boolean;
  showSenderName: boolean;
  currentUserId: string;
  channelId: string;
  onDelete: () => void;
  onReply: () => void;
  onOpenThread: () => void;
  onEdit: (msg: ChatMessage) => void;
  onImageClick?: (url: string, name?: string | null) => void;
  // Only computed/passed for the sender's own most recent message — other
  // members whose channel_members.last_read_at is on/after this message's
  // created_at (see chat.controller.js's send_message/get_messages
  // last_read_at upsert). Undefined everywhere else, matching typical chat
  // "seen by" UX (you only see who's read what YOU sent).
  seenBy?: ChatUser[];
}) {
  const qc = useQueryClient();
  const [hovered, setHovered] = useState(false);

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

  const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏'];

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
      className={cn('flex gap-2 group', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isOwn && <Avatar user={msg.user} size="sm" />}
      <div className={cn('flex flex-col max-w-[68%]', isOwn ? 'items-end' : 'items-start')}>
        {showSenderName && (
          <p className="text-[10px] font-semibold text-gray-500 mb-0.5 px-1">
            {msg.user?.first_name} {msg.user?.last_name}
          </p>
        )}
        <div className="relative">
          {/* Hover actions */}
          {hovered && (
            <div className={cn(
              'absolute -top-8 flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-sm px-1.5 py-1 z-10',
              isOwn ? 'right-0' : 'left-0',
            )}>
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => reactionMutation.mutate(e)}
                  className="text-sm hover:scale-125 transition-transform"
                  title={e}
                >{e}</button>
              ))}
              <span className="w-px h-4 bg-gray-200 mx-0.5" />
              <button
                onClick={onReply}
                className="p-0.5 text-gray-400 hover:text-primary-600 rounded"
                title="Reply in thread"
              >
                <CornerDownRight size={13} />
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

          <div className={cn(
            'px-3 py-2 rounded-2xl text-sm',
            isOwn ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm',
          )}>
            {/* File attachment */}
            {msg.file_url && (
              <div className="mb-1">
                {isImage ? (
                  <img
                    src={msg.file_url}
                    alt={msg.file_name || 'image'}
                    className="max-h-48 rounded-xl object-contain cursor-zoom-in"
                    onClick={() => onImageClick?.(msg.file_url!, msg.file_name)}
                  />
                ) : isAudio ? (
                  <audio src={msg.file_url} controls className="h-9 max-w-[220px]" />
                ) : isVideo ? (
                  <video src={msg.file_url} controls className="max-h-48 rounded-xl" />
                ) : (
                  <a
                    href={msg.file_url}
                    download={msg.file_name}
                    className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold',
                      isOwn ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-700')}
                  >
                    <Paperclip size={12} />
                    <span className="truncate">{msg.file_name}</span>
                    {msg.file_size != null && <span className="shrink-0 opacity-70">{fmtSize(msg.file_size)}</span>}
                  </a>
                )}
              </div>
            )}
            {msg.content && <span>{msg.content}</span>}
            {msg.is_edited && (
              <span className={cn('text-[10px] ml-1 opacity-60', isOwn ? 'text-primary-100' : 'text-gray-400')}>(edited)</span>
            )}
          </div>
        </div>

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

        <span className="text-[10px] text-gray-400 mt-0.5 px-1">{fmtTime(msg.created_at)}</span>

        {isOwn && seenBy && seenBy.length > 0 && <SeenByIndicator users={seenBy} />}
      </div>
    </div>
  );
}

// Skype-style read receipt: a small overlapping avatar stack under the
// sender's own last message. Hover (desktop) or tap (touch) opens a popover
// listing each viewer's name + picture — matches the "hover or click shows
// the person's name with their profile picture" request rather than a plain
// text "Seen by X" line.
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

// ─── Thread Panel ─────────────────────────────────────────────────────────────

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
    refetchInterval: 3000,
  });

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

// ─── Camera Capture Modal ───────────────────────────────────────────────────
// Standard chat "take a photo" flow: live camera preview → capture a still
// frame to canvas → review/retake → hand the resulting File back to the
// composer, which uploads it through the exact same handleAttachmentSelect
// path a picked file or a pasted screenshot already goes through.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id || '';
  const currentGlobalRole = useAuthStore((s) => s.role);
  const isGlobalAdmin = currentGlobalRole === 'SUPER_ADMIN' || currentGlobalRole === 'ADMIN';
  const qc = useQueryClient();
  const toast = useToastContext();

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Set once a recording is deliberately discarded (Cancel) so the
  // MediaRecorder's onstop handler — which fires either way — knows not to
  // turn the just-cancelled clip into an attachment.
  const recordingCancelledRef = useRef(false);
  // Whether the user is scrolled near the bottom of the message list — only
  // auto-scroll when true, so the 3s message poll (refetchInterval below)
  // doesn't yank someone back to the bottom while they're reading upward.
  const isNearBottomRef = useRef(true);
  // Throttles the typing ping to at most once per 3s of continuous typing —
  // the backend's typing TTL is 6s, so re-sending every 3s keeps it fresh
  // with margin without pinging on every single keystroke.
  const lastTypingSentAtRef = useRef(0);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: channels = [], isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ['chat-channels'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.CHANNELS);
      return r?.payload?.records || r?.payload || [];
    },
    refetchInterval: 5000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat-messages', selectedChannelId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.MESSAGES(selectedChannelId!));
      return r?.payload?.records || r?.payload || [];
    },
    enabled: !!selectedChannelId,
    refetchInterval: 3000,
  });

  // "Seen by" read receipts — reuses channel_members.last_read_at (already
  // bumped on every get_messages call, see chat.controller.js), no new
  // backend endpoint needed. Polled at the same cadence as messages so the
  // indicator updates shortly after someone actually opens the channel.
  const { data: channelMembers = [] } = useQuery<ChannelMember[]>({
    queryKey: ['chat-members', selectedChannelId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.MEMBERS(selectedChannelId!));
      return r?.payload?.records || r?.payload || [];
    },
    enabled: !!selectedChannelId,
    refetchInterval: 3000,
  });

  // Typing indicator — polled independently of (and faster than) messages,
  // since "so-and-so is typing" only reads well with a short, dedicated
  // interval. Backend state is in-memory with a ~6s TTL per user per
  // channel; see set_typing_ctrl/get_typing_ctrl in chat.controller.js.
  const { data: typingUsers = [] } = useQuery<ChatUser[]>({
    queryKey: ['chat-typing', selectedChannelId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.TYPING(selectedChannelId!));
      return r?.payload?.records || r?.payload || [];
    },
    enabled: !!selectedChannelId,
    refetchInterval: 2000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      content: string;
      file_url?: string;
      file_key?: string;
      file_name?: string;
      file_size?: number;
      mime_type?: string;
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

  // Fire-and-forget — no loading/error state needed for a "you're typing"
  // ping, and no query invalidation either (the typing poll above already
  // picks it up on its own interval).
  const typingMutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.CHAT.TYPING(selectedChannelId!), { method: 'POST' }),
  });

  // ── Effects ───────────────────────────────────────────────────────────────

  // Auto-scroll only if the user was already near the bottom — messages
  // polls every 3s (refetchInterval above), and without this guard every
  // poll tick force-scrolled back to the bottom even while someone had
  // scrolled up to read older messages.
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Always snap to bottom on a channel switch or right after sending —
  // "near bottom" tracking only matters while idly reading a channel.
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

  useEffect(() => {
    if (!selectedChannelId && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  // ── Desktop notifications ──────────────────────────────────────────────
  // Popup a browser Notification for a new incoming message — in a DM, a
  // group, or any channel — as long as it isn't the channel currently open
  // and focused (no point popping up for what's already on screen). Driven
  // off the channels list (already polled every 5s and already carries each
  // channel's most recent message for the sidebar preview), so this covers
  // every channel, not just whichever one is open.
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

      // Skip the initial load — only notify for messages that arrive after
      // the page is already open, never for history already sitting there.
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
      const channelLabel = ch.type === 'DM' ? '' : ` in ${ch.type === 'GROUP' ? ch.name : `#${ch.name}`}`;
      try {
        const n = new Notification(`${senderName}${channelLabel}`, {
          body: lastMsg.content || (lastMsg as any).file_name || 'Sent an attachment',
          icon: '/src/assets/icons/tekxai-logo.svg',
          tag: `chat-${ch.id}`,
        });
        n.onclick = () => { window.focus(); setSelectedChannelId(ch.id); n.close(); };
      } catch {
        // Notification constructor can throw in some embedded/iframe contexts —
        // never let a popup failure break the chat page itself.
      }
    });

    prevLastMessageIdRef.current = nextIds;
    hasSeenFirstChannelsLoadRef.current = true;
  }, [channels, currentUserId, selectedChannelId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

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
    // Attachment already uploaded at selection time (handleAttachmentSelect) —
    // if it's still in flight, isUploadingAttachment above already blocks Send.
    if (attachmentFile && !uploadedAttachment) return;

    const payload = uploadedAttachment
      ? {
          content: draft.trim(),
          file_url: uploadedAttachment.file_url,
          file_key: uploadedAttachment.file_key,
          file_name: attachmentFile!.name,
          file_size: attachmentFile!.size,
          mime_type: attachmentFile!.type,
        }
      : { content: draft.trim() };

    sendMutation.mutate(payload);
    setUploadedAttachment(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDraft(value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    if (selectedChannelId && value.trim()) {
      const now = Date.now();
      if (now - lastTypingSentAtRef.current > 3000) {
        lastTypingSentAtRef.current = now;
        typingMutation.mutate();
      }
    }
  };

  // Copy-pasting a screenshot/image (Cmd/Ctrl+V) attaches it the same way
  // the paperclip button does — clipboard image items don't come with a
  // real filename, so one is generated from the mime type.
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

  // Camera capture hands back a File the exact same way a picked/pasted
  // file does — reuses the whole upload → preview chip → Send flow already
  // built for attachments instead of a parallel send path.
  const handleCameraCapture = (file: File) => {
    handleAttachmentSelect(file);
  };

  const stopRecordingStream = () => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordingStreamRef.current = null;
  };

  // Voice message: same idea as camera capture — record to a Blob, wrap it
  // in a File, and feed it into the existing attachment pipeline so it gets
  // uploaded/previewed/sent exactly like any other file (playback on the
  // receiving end already works — MessageBubble renders anything with an
  // audio/* mime type as an <audio> player).
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
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stopRecordingStream();
        if (recordingCancelledRef.current || recordedChunksRef.current.length === 0) return;
        const baseMime = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
        const ext = baseMime === 'audio/ogg' ? 'ogg' : baseMime === 'audio/mp4' ? 'm4a' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: baseMime });
        const file = new File([blob], `voice-message-${Date.now()}.${ext}`, { type: baseMime });
        handleAttachmentSelect(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (e: any) {
      setRecordingError(e?.name === 'NotAllowedError' ? 'Microphone access denied.' : 'Could not access microphone.');
      stopRecordingStream();
    }
  };

  const stopRecording = () => {
    recordingCancelledRef.current = false;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    recordedChunksRef.current = [];
  };

  // Guard against an in-flight recording/stream surviving a channel switch
  // or unmount (e.g. clicking away mid-recording).
  useEffect(() => () => { stopRecordingStream(); mediaRecorderRef.current?.stop(); }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedChannel = channels.find((ch) => ch.id === selectedChannelId) || null;
  const isMember = selectedChannel
    ? selectedChannel.members?.some((m) => m.user_id === currentUserId) || selectedChannel.type === 'PUBLIC'
    : false;
  const myMembership = selectedChannel?.members?.find((m) => m.user_id === currentUserId);

  const filteredChannels = channels.filter((ch) => {
    if (!channelSearch) return true;
    return getChannelDisplayName(ch, currentUserId).toLowerCase().includes(channelSearch.toLowerCase());
  });

  // Flat list, no Direct/Private/Groups/Channels section split — sorted by
  // most recent activity (last message, falling back to the channel's own
  // updated_at) so the sidebar behaves like every other chat app's single
  // conversation list.
  const sortedChannels = [...filteredChannels].sort((a, b) => {
    const aTime = a.messages?.[0]?.created_at || a.updated_at;
    const bTime = b.messages?.[0]?.created_at || b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const badge = selectedChannel ? PRIVACY_BADGE[selectedChannel.type] : null;

  // Find the sender's own most recent message and who's seen it — only that
  // one message shows a "Seen by" line, matching typical chat UX (you only
  // care about read status on the latest thing you sent).
  const lastOwnMsg = [...messages].reverse().find((m) => m.user_id === currentUserId);
  const seenByForLastOwnMsg = lastOwnMsg
    ? channelMembers
        .filter((m) => m.user_id !== currentUserId && m.last_read_at && new Date(m.last_read_at) >= new Date(lastOwnMsg.created_at))
        .map((m) => m.user)
    : [];

  return (
    <div className="flex h-[calc(100vh-5.5rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Left Panel ── */}
      <div className="w-64 border-r border-gray-100 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-black text-gray-900">Messages</h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-1.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            <Plus size={14} />
          </button>
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
          <ChannelSection channels={sortedChannels} currentUserId={currentUserId} selectedId={selectedChannelId} onSelect={setSelectedChannelId} />
        </div>
      </div>

      {/* ── Center Panel ── */}
      {selectedChannel ? (
        <div className="flex-1 flex flex-col min-w-0">
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
                  </div>
                  <p className={cn('text-xs', isOnline(getOtherMember(selectedChannel, currentUserId)) ? 'text-emerald-600 font-semibold' : 'text-gray-400')}>
                    {fmtLastSeen(getOtherMember(selectedChannel, currentUserId)) || getOtherMember(selectedChannel, currentUserId)?.designation || 'Direct Message'}
                  </p>
                </div>
              </>
            ) : selectedChannel.type === 'GROUP' ? (
              <>
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-primary-600" />
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
              <button
                onClick={() => setShowSearch(true)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                title="Search messages"
              >
                <Search size={16} />
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
                const showName = selectedChannel.type !== 'DM' && !isOwn;
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
                    onDelete={() => deleteMutation.mutate(msg.id)}
                    onReply={() => setThreadMsgId(msg.id)}
                    onOpenThread={() => setThreadMsgId(msg.id)}
                    onEdit={(m) => { setEditingMsg(m); setEditDraft(m.content); }}
                    onImageClick={(url, name) => setLightboxImage({ url, name: name ?? null })}
                    seenBy={lastOwnMsg?.id === msg.id ? seenByForLastOwnMsg : undefined}
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
          {isMember && (
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
                <div className="flex gap-2 items-center h-[42px] px-3 border border-red-200 bg-red-50 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-sm font-bold text-red-600 tabular-nums">
                    {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-red-400 flex-1">Recording voice message…</span>
                  <button onClick={cancelRecording} title="Cancel" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                  <button onClick={stopRecording} title="Stop and attach" className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <Square size={13} fill="currentColor" />
                  </button>
                </div>
              ) : (
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
                    className="flex-1 resize-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                    style={{ height: 'auto', minHeight: '42px', maxHeight: '120px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!draft.trim() && !attachmentFile) || sendMutation.isPending || isUploadingAttachment}
                    className="h-[42px] w-[42px] bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 transition-colors shrink-0"
                  >
                    {sendMutation.isPending || isUploadingAttachment ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              )}
              <p className="text-[10px] text-gray-300 mt-1 pl-1">Shift+Enter for new line · Enter to send</p>
            </div>
          )}
        </div>
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
              // Images are presigned without an attachment Content-Disposition
              // (so they render inline in <img>), so a plain `<a download>`
              // is ignored cross-origin — fetch the bytes and force a real
              // client-side download via a blob URL instead.
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
          canMakePublic={['SUPER_ADMIN', 'ADMIN', 'HR'].includes(currentGlobalRole || '')}
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
    </div>
  );
}
