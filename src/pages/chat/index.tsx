import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Plus, Search, Send, X, Users, User, Loader2,
  Hash, Lock, Settings, Paperclip, CornerDownRight, ChevronDown,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatUser {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  avatar?: string;
  designation?: string;
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
    return other ? `${other.first_name} ${other.last_name}` : 'Direct Message';
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

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const readAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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

const Avatar: React.FC<{ user?: ChatUser; size?: 'sm' | 'md'; active?: boolean }> = ({
  user, size = 'md', active = false,
}) => {
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  if (user?.avatar) {
    return <img src={user.avatar} className={cn(dim, 'rounded-full object-cover shrink-0')} alt="" />;
  }
  const name = user ? `${user.first_name} ${user.last_name}` : '?';
  return (
    <div className={cn(
      dim, 'rounded-full flex items-center justify-center font-black shrink-0',
      active ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-600',
    )}>
      {getInitials(name)}
    </div>
  );
};

// ─── Members Modal ────────────────────────────────────────────────────────────

function MembersModal({
  channelId, currentUserId, currentUserRole, onClose,
}: {
  channelId: string;
  currentUserId: string;
  currentUserRole?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [addSearch, setAddSearch] = useState('');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const canManage = ['OWNER', 'ADMIN'].includes(currentUserRole || '');

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

  const existingIds = new Set(members.map((m) => m.user_id));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">Members ({members.length})</h3>
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
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50">
              <Avatar user={m.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{m.user.first_name} {m.user.last_name}</p>
                <p className="text-xs text-gray-400 truncate">{m.user.designation}</p>
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
  channel, currentUserRole, onClose, onSaved,
}: {
  channel: Channel;
  currentUserRole?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [type, setType] = useState<'PUBLIC' | 'PRIVATE'>(channel.type === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC');
  const canEdit = ['OWNER', 'ADMIN'].includes(currentUserRole || '');
  const canArchive = currentUserRole === 'OWNER';

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
          {canEdit && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Privacy</label>
              <div className="flex gap-2">
                {(['PUBLIC', 'PRIVATE'] as const).map((t) => (
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
          {canArchive && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Danger Zone</p>
              <button
                onClick={() => { if (confirm('Archive this channel? Members will lose access.')) archiveMutation.mutate(); }}
                disabled={archiveMutation.isPending}
                className="w-full h-10 border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                {archiveMutation.isPending ? 'Archiving…' : 'Archive Channel'}
              </button>
            </div>
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
    { key: 'group',   label: 'Group',   icon: <Users size={13} /> },
    { key: 'private', label: 'Private', icon: <Lock size={13} /> },
    { key: 'public',  label: 'Public',  icon: <Hash size={13} /> },
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
  label, channels, currentUserId, selectedId, onSelect, icon,
}: {
  label: string;
  channels: Channel[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  icon?: React.ReactNode;
}) {
  if (channels.length === 0) return null;
  return (
    <div>
      <div className="pt-3 pb-1 px-4 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      </div>
      {channels.map((ch) => {
        const isSelected = ch.id === selectedId;
        const name = getChannelDisplayName(ch, currentUserId);
        const lastMsg = ch.messages?.[0];
        const otherUser = ch.type === 'DM' ? getOtherMember(ch, currentUserId) : undefined;
        const myMember = ch.members?.find((m) => m.user_id === currentUserId);
        const hasUnread = myMember?.last_read_at && lastMsg
          ? new Date(lastMsg.created_at) > new Date(myMember.last_read_at)
          : false;
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
              <Avatar user={otherUser} active={isSelected} size="sm" />
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
                {hasUnread && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />}
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
  msg, isOwn, showSenderName, currentUserId, channelId,
  onDelete, onReply, onOpenThread, onEdit,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  showSenderName: boolean;
  currentUserId: string;
  channelId: string;
  onDelete: () => void;
  onReply: () => void;
  onOpenThread: () => void;
  onEdit: (msg: ChatMessage) => void;
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

  const reactionMap = (msg.reactions || []).reduce((acc: Record<string, { count: number; mine: boolean }>, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
    acc[r.emoji].count++;
    if (r.user?.id === currentUserId) acc[r.emoji].mine = true;
    return acc;
  }, {});

  const isImage = msg.mime_type?.startsWith('image/');

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
                <>
                  <button onClick={() => onEdit(msg)} className="p-0.5 text-gray-400 hover:text-blue-500 rounded text-xs font-bold" title="Edit">✏️</button>
                  <button onClick={onDelete} className="p-0.5 text-gray-400 hover:text-red-500 rounded" title="Delete">
                    <X size={13} />
                  </button>
                </>
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
                  <img src={msg.file_url} alt={msg.file_name || 'image'} className="max-h-48 rounded-xl object-contain" />
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
            {Object.entries(reactionMap).map(([emoji, { count, mine }]) => (
              <button
                key={emoji}
                onClick={() => mine ? removeReactionMutation.mutate(emoji) : reactionMutation.mutate(emoji)}
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
      </div>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id || '';
  const qc = useQueryClient();

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [threadMsgId, setThreadMsgId] = useState<string | null>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Mutations ─────────────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      content: string;
      file_url?: string;
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

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedChannelId && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!selectedChannelId || sendMutation.isPending) return;
    if (!draft.trim() && !attachmentFile) return;

    let file_url: string | undefined;
    let file_name: string | undefined;
    let file_size: number | undefined;
    let mime_type: string | undefined;

    if (attachmentFile) {
      file_url = await readAsDataURL(attachmentFile);
      file_name = attachmentFile.name;
      file_size = attachmentFile.size;
      mime_type = attachmentFile.type;
    }

    sendMutation.mutate({ content: draft.trim(), file_url, file_name, file_size, mime_type });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

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

  const dmChannels = filteredChannels.filter((ch) => ch.type === 'DM');
  const privateChannels = filteredChannels.filter((ch) => ch.type === 'PRIVATE');
  const groupChannels = filteredChannels.filter((ch) => ch.type === 'GROUP');
  const publicChannels = filteredChannels.filter((ch) => ch.type === 'PUBLIC');

  const badge = selectedChannel ? PRIVACY_BADGE[selectedChannel.type] : null;

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

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
          <ChannelSection label="Direct Messages" channels={dmChannels} currentUserId={currentUserId} selectedId={selectedChannelId} onSelect={setSelectedChannelId} />
          <ChannelSection label="Private" channels={privateChannels} currentUserId={currentUserId} selectedId={selectedChannelId} onSelect={setSelectedChannelId} icon={<Lock size={9} className="text-gray-400" />} />
          <ChannelSection label="Groups" channels={groupChannels} currentUserId={currentUserId} selectedId={selectedChannelId} onSelect={setSelectedChannelId} />
          <ChannelSection label="Channels" channels={publicChannels} currentUserId={currentUserId} selectedId={selectedChannelId} onSelect={setSelectedChannelId} />
        </div>
      </div>

      {/* ── Center Panel ── */}
      {selectedChannel ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
            {selectedChannel.type === 'DM' ? (
              <>
                <Avatar user={getOtherMember(selectedChannel, currentUserId)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900 text-sm truncate">{getChannelDisplayName(selectedChannel, currentUserId)}</p>
                    {badge && <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0', badge.cls)}>{badge.label}</span>}
                  </div>
                  <p className="text-xs text-gray-400">{getOtherMember(selectedChannel, currentUserId)?.designation || 'Direct Message'}</p>
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
                  </div>
                  <p className="text-xs text-gray-400">{selectedChannel._count?.members || 0} members</p>
                </div>
              </>
            )}

            {/* Action icons */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              {selectedChannel.type !== 'DM' && !isMember && (
                <button
                  onClick={() => joinMutation.mutate(selectedChannel.id)}
                  disabled={joinMutation.isPending}
                  className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 disabled:opacity-50"
                >
                  {joinMutation.isPending ? 'Joining…' : 'Join'}
                </button>
              )}
              {isMember && (
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Members"
                >
                  <Users size={16} />
                </button>
              )}
              {isMember && selectedChannel.type !== 'DM' && (
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
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
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
                    onDelete={() => deleteMutation.mutate(msg.id)}
                    onReply={() => setThreadMsgId(msg.id)}
                    onOpenThread={() => setThreadMsgId(msg.id)}
                    onEdit={(m) => { setEditingMsg(m); setEditDraft(m.content); }}
                  />
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          {isMember && (
            <div className="px-4 py-3 border-t border-gray-100">
              {/* Attachment preview chip */}
              {attachmentFile && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                  <Paperclip size={13} className="text-gray-400 shrink-0" />
                  <span className="text-gray-700 truncate flex-1">{attachmentFile.name}</span>
                  <span className="text-gray-400 text-xs shrink-0">{fmtSize(attachmentFile.size)}</span>
                  <button onClick={() => setAttachmentFile(null)} className="text-gray-400 hover:text-red-500">
                    <X size={13} />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl shrink-0"
                  title="Attach file"
                >
                  <Paperclip size={16} />
                </button>
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
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
                  disabled={(!draft.trim() && !attachmentFile) || sendMutation.isPending}
                  className="h-[42px] w-[42px] bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 transition-colors shrink-0"
                >
                  {sendMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
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
          onClose={() => setShowMembersModal(false)}
        />
      )}

      {showChannelSettings && selectedChannel && (
        <ChannelSettingsModal
          channel={selectedChannel}
          currentUserRole={myMembership?.role}
          onClose={() => setShowChannelSettings(false)}
          onSaved={() => setShowChannelSettings(false)}
        />
      )}
    </div>
  );
}
