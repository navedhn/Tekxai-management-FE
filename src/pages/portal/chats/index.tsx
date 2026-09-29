import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MessagesSquare, Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { PageSkeleton } from '@/components/skeletons';
import { cn } from '@/utils/cn';

type PortalProject = {
  id: string;
  title: string;
  status: string;
  client: { id: string; name: string } | null;
};

type UnreadRow = {
  count: number;
  last_message_at: string | null;
  last_message_id?: string | null;
  last_message_preview?: string | null;
  last_message_author?: string | null;
};

function formatChatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PortalChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: projects = [], isLoading: projectsLoading } = useQuery<PortalProject[]>({
    queryKey: ['portal', 'projects'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    select: (r: any) => r?.payload?.records || [],
  });

  const { data: unreadCounts = {}, isLoading: unreadLoading } = useQuery<Record<string, UnreadRow>>({
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
        lastMessageId: unread?.last_message_id || null,
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

  const openChat = (projectId: string, messageId?: string | null) => {
    const q = messageId ? `?message=${encodeURIComponent(messageId)}` : '';
    navigate(`/portal/projects/${projectId}/communication${q}`);
  };

  if (projectsLoading || unreadLoading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-4 lg:gap-6 pb-4 lg:pb-10 max-w-3xl mx-auto w-full">
      <div className="hidden lg:block px-1">
        <h1 className="text-2xl font-black text-(--color-text-primary) tracking-tight">Chats</h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">
          Project conversations — open a thread to read and reply.
        </p>
      </div>

      <div className="relative px-0.5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-secondary)" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats…"
          className="w-full h-11 pl-10 pr-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm font-medium text-(--color-text-primary) placeholder:text-(--color-text-secondary) focus:outline-none focus:border-primary-400"
          aria-label="Search chats"
        />
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
          <MessagesSquare size={36} className="text-(--color-text-secondary) opacity-50" strokeWidth={1.5} />
          <p className="font-bold text-sm text-(--color-text-primary)">
            {search.trim() ? 'No chats match your search' : 'No project chats yet'}
          </p>
          <p className="text-sm text-(--color-text-secondary) max-w-sm">
            {search.trim()
              ? 'Try a different project or client name.'
              : 'When you have access to a project, its conversation will appear here.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-(--color-border) rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
          {conversations.map((c) => {
            const hasUnread = c.unreadCount > 0;
            return (
              <li key={c.project.id}>
                <button
                  type="button"
                  onClick={() => openChat(c.project.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 sm:px-4 py-3.5 text-left transition-colors min-h-[4.5rem]',
                    'hover:bg-(--color-state-hover) active:bg-(--color-state-hover)',
                    hasUnread && 'bg-primary-50/40'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
                      hasUnread ? 'bg-primary-100 text-primary-700' : 'bg-(--color-elevated) text-(--color-text-secondary)'
                    )}
                  >
                    <MessagesSquare size={20} strokeWidth={hasUnread ? 2.4 : 2} />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          'text-[15px] truncate',
                          hasUnread ? 'font-black text-(--color-text-primary)' : 'font-bold text-(--color-text-primary)'
                        )}
                      >
                        {c.displayName}
                      </span>
                      <span className="text-[11px] font-semibold text-(--color-text-secondary) shrink-0 tabular-nums">
                        {formatChatTime(c.lastAt)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-sm truncate',
                          hasUnread ? 'font-semibold text-(--color-text-primary)' : 'text-(--color-text-secondary)'
                        )}
                      >
                        {c.preview
                          ? (c.author ? `${c.author}: ${c.preview}` : c.preview)
                          : 'No messages yet — say hello'}
                      </span>
                      {hasUnread && (
                        <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary-600 text-white text-[11px] font-black flex items-center justify-center">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PortalChatsPage;
