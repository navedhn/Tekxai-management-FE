import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { PageSkeleton } from '@/components/skeletons';

type DmUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar?: string | null;
  user_type?: string;
};

type DmMessage = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user?: DmUser | null;
};

type DmChannel = {
  id: string;
  peer?: DmUser | null;
  members?: { user_id: string; user?: DmUser | null }[];
};

function displayName(u?: DmUser | null) {
  return `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || 'Unknown';
}

const PortalDmPage: React.FC = () => {
  const { channelId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: dms = [] } = useQuery<DmChannel[]>({
    queryKey: ['portal', 'dms'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.DMS),
    select: (r: any) => r?.payload || [],
  });

  const channel = dms.find((d) => d.id === channelId) || null;
  const peer =
    channel?.peer ||
    channel?.members?.find((m) => m.user_id !== user?.id)?.user ||
    null;

  const { data: messages = [], isLoading } = useQuery<DmMessage[]>({
    queryKey: ['portal', 'dms', channelId, 'messages'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.DM_MESSAGES(channelId)),
    select: (r: any) => r?.payload || [],
    enabled: !!channelId,
    refetchInterval: 10000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: (content: string) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.DM_MESSAGES(channelId), {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['portal', 'dms', channelId, 'messages'] });
      qc.invalidateQueries({ queryKey: ['portal', 'dms'] });
    },
  });

  if (isLoading && !messages.length) return <PageSkeleton />;

  return (
    <div className="h-[calc(100dvh-3rem-3.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-4rem)] flex flex-col min-h-0 bg-white border border-(--color-border) rounded-none lg:rounded-2xl overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-3 sm:px-4 py-3 border-b border-(--color-border)">
        <button
          type="button"
          onClick={() => navigate('/portal/chats')}
          className="p-1.5 rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover)"
          aria-label="Back to chats"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="font-black text-sm text-(--color-text-primary) truncate">{displayName(peer)}</p>
          <p className="text-[11px] font-semibold text-(--color-text-secondary)">
            Direct message · Super Admin ↔ Client only
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm text-(--color-text-secondary) text-center py-12">
            No messages yet — say hello.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user?.id || m.user?.id === user?.id;
          return (
            <div key={m.id} className={cn('flex flex-col max-w-[85%]', mine ? 'self-end items-end' : 'self-start items-start')}>
              <div
                className={cn(
                  'px-3 py-2 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap break-words',
                  mine ? 'bg-primary-600 text-white rounded-br-md' : 'bg-(--color-elevated) text-(--color-text-primary) rounded-bl-md'
                )}
              >
                {m.content}
              </div>
              <span className="mt-0.5 text-[10px] font-semibold text-(--color-text-secondary) tabular-nums">
                {new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="shrink-0 border-t border-(--color-border) p-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const content = draft.trim();
          if (!content || send.isPending) return;
          send.mutate(content);
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const content = draft.trim();
              if (!content || send.isPending) return;
              send.mutate(content);
            }
          }}
          rows={1}
          placeholder={`Message ${displayName(peer)}`}
          className="flex-1 min-h-[44px] max-h-32 resize-none rounded-xl border border-(--color-border) px-3 py-2.5 text-sm focus:outline-none focus:border-primary-400"
        />
        <button
          type="submit"
          disabled={!draft.trim() || send.isPending}
          className="h-11 w-11 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50"
          aria-label="Send"
        >
          {send.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
};

export default PortalDmPage;
