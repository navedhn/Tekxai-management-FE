import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Hash, Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

type PortalProject = {
  id: string;
  title: string;
  status: string;
  client: { id: string; name: string } | null;
};

type UnreadRow = {
  count: number;
  total_messages?: number;
  last_message_at: string | null;
  last_message_preview?: string | null;
  last_message_author?: string | null;
};

function formatChatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** ClickUp-style channel list for portal project chats (desktop split + /portal/chats). */
export const PortalChatChannelList: React.FC<{
  activeProjectId?: string;
  className?: string;
  /** Compact density for the in-communication sidebar. */
  compact?: boolean;
}> = ({ activeProjectId, className, compact }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: projects = [] } = useQuery<PortalProject[]>({
    queryKey: ['portal', 'projects'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    select: (r: any) => r?.payload?.records || [],
  });

  const { data: unreadCounts = {} } = useQuery<Record<string, UnreadRow>>({
    queryKey: ['portal', 'unread-counts'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.UNREAD_COUNTS),
    select: (r: any) => r?.payload || {},
    refetchInterval: 15000,
  });

  const conversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = projects.map((p) => {
      const unread = unreadCounts[p.id];
      const displayName = p.client?.name ? `${p.client.name} — ${p.title}` : p.title;
      return {
        project: p,
        displayName,
        unreadCount: unread?.count || 0,
        lastAt: unread?.last_message_at || null,
        preview: unread?.last_message_preview || null,
        author: unread?.last_message_author || null,
      };
    });
    const filtered = q
      ? rows.filter((r) =>
          [r.displayName, r.preview, r.author].some((v) => (v || '').toLowerCase().includes(q))
        )
      : rows;
    return filtered.sort((a, b) => {
      const unreadDiff = Number(b.unreadCount > 0) - Number(a.unreadCount > 0);
      if (unreadDiff !== 0) return unreadDiff;
      const aTime = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const bTime = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [projects, unreadCounts, search]);

  return (
    <div className={cn('flex flex-col min-h-0 h-full bg-(--color-surface)', className)}>
      <div className={cn('shrink-0 border-b border-(--color-border)', compact ? 'px-3 py-2.5' : 'px-3 py-3')}>
        <p className={cn('font-black text-(--color-text-primary) tracking-tight', compact ? 'text-sm' : 'text-base')}>
          Chat
        </p>
        <div className="relative mt-2">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-secondary)" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full h-9 pl-8 pr-2 rounded-lg border border-(--color-border) bg-(--color-elevated)/40 text-[13px] font-medium text-(--color-text-primary) placeholder:text-(--color-text-secondary) focus:outline-none focus:border-primary-400"
            aria-label="Search chats"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <p className="px-3 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-(--color-text-secondary)">
          Channels
        </p>
        <ul className="flex flex-col pb-3">
          {conversations.map((c) => {
            const active = c.project.id === activeProjectId;
            const hasUnread = c.unreadCount > 0;
            return (
              <li key={c.project.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/portal/projects/${c.project.id}/communication`)}
                  className={cn(
                    'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors',
                    active ? 'bg-primary-50 text-primary-800' : 'hover:bg-(--color-state-hover)',
                    hasUnread && !active && 'bg-primary-50/30'
                  )}
                >
                  <Hash
                    size={15}
                    className={cn('mt-0.5 shrink-0', active || hasUnread ? 'text-primary-600' : 'text-(--color-text-secondary)')}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          'text-[13px] truncate',
                          hasUnread || active ? 'font-bold text-(--color-text-primary)' : 'font-semibold text-(--color-text-primary)'
                        )}
                      >
                        {c.displayName}
                      </span>
                      <span className="text-[10px] font-semibold text-(--color-text-secondary) shrink-0 tabular-nums">
                        {formatChatTime(c.lastAt)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 mt-0.5">
                      <span
                        className={cn(
                          'text-[12px] truncate',
                          hasUnread ? 'font-semibold text-(--color-text-primary)' : 'text-(--color-text-secondary)'
                        )}
                      >
                        {c.preview
                          ? (c.author ? `${c.author}: ${c.preview}` : c.preview)
                          : 'No messages yet'}
                      </span>
                      {hasUnread && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-white text-[10px] font-black flex items-center justify-center">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {conversations.length === 0 && (
            <li className="px-3 py-6 text-center text-[12px] text-(--color-text-secondary)">
              {search.trim() ? 'No chats match' : 'No project chats yet'}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default PortalChatChannelList;
