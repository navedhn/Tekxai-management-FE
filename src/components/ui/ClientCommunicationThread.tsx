import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Smile, Reply, AtSign, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';
import Loader from './Loader';

// The REAL two-way Client Communication thread (visibility, reactions,
// mentions) — POST /project/:id/messages, deliberately never
// /project/:id/discussions (that's the separate, internal-only "Add Note"
// feature rendered elsewhere in ClientCommunicationPanel, unchanged by
// this component). Every message sent from THIS composer is always
// CLIENT_VISIBLE — there is no toggle here on purpose, so "a message from
// this composer" and "a note from Add Note" can never be confused with
// each other; the internal-only path stays exclusively on Add Note.
//
// Authorization for every request here is enforced entirely server-side
// (require_project_access — project membership) — nothing about who can
// send is decided in this component.

type ProjectMessage = {
  id: string;
  content: string;
  parent_id: string | null;
  visibility: 'INTERNAL' | 'CLIENT_VISIBLE';
  created_at: string;
  user: { id: string; first_name: string; last_name: string; user_type: 'INTERNAL' | 'CLIENT' };
  reactions: Array<{ id: string; user_id: string; emoji: string }>;
  mentions: string[];
};

type MentionableUser = { id: string; first_name: string; last_name: string; user_type?: 'INTERNAL' | 'CLIENT' };

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🙏', '👀'];

function senderLabel(m: ProjectMessage) {
  if (m.user?.user_type === 'CLIENT') return `${m.user.first_name} ${m.user.last_name}`.trim() || 'Client';
  return `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || 'TekXAI Team';
}

function aggregateReactions(reactions: ProjectMessage['reactions'], myUserId?: string) {
  const byEmoji = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
  for (const r of reactions || []) {
    const entry = byEmoji.get(r.emoji) || { emoji: r.emoji, count: 0, reactedByMe: false };
    entry.count += 1;
    if (r.user_id === myUserId) entry.reactedByMe = true;
    byEmoji.set(r.emoji, entry);
  }
  return Array.from(byEmoji.values());
}

interface ClientCommunicationThreadProps {
  projectId: string;
  canParticipate: boolean;
  highlightMessageId?: string | null;
}

const ClientCommunicationThread: React.FC<ClientCommunicationThreadProps> = ({ projectId, canParticipate, highlightMessageId }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToastContext();

  const { data, isLoading } = useQuery<ProjectMessage[]>({
    queryKey: ['project-communications', 'messages', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PROJECT_COMMUNICATIONS.MESSAGES(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  useEffect(() => {
    if (!highlightMessageId || isLoading) return;
    const el = document.getElementById(`project-message-${highlightMessageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary-400');
    const timer = setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400'), 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightMessageId, isLoading, data?.length]);

  const roots = (data || []).filter((m) => !m.parent_id);
  const repliesByRoot = new Map<string, ProjectMessage[]>();
  (data || []).filter((m) => m.parent_id).forEach((m) => {
    const list = repliesByRoot.get(m.parent_id!) || [];
    list.push(m);
    repliesByRoot.set(m.parent_id!, list);
  });

  const [replyTo, setReplyTo] = useState<ProjectMessage | null>(null);

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center gap-3 p-6 border-b border-gray-100">
        <MessageCircle size={18} strokeWidth={2.5} className="text-primary-500" />
        <div>
          <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Client Communication Thread</h3>
          <p className="text-[11px] text-gray-400 font-semibold">Live, two-way — messages you send here are visible to the client.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 max-h-[520px] overflow-y-auto">
        {isLoading && <div className="flex justify-center py-6"><Loader size={28} /></div>}
        {!isLoading && roots.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-6">No client communication messages yet.</p>
        )}
        {roots.map((root) => (
          <ThreadGroup
            key={root.id}
            root={root}
            replies={repliesByRoot.get(root.id) || []}
            projectId={projectId}
            canParticipate={canParticipate}
            myUserId={user?.id}
            onReply={setReplyTo}
            autoExpand={!!highlightMessageId && (root.id === highlightMessageId || (repliesByRoot.get(root.id) || []).some((r) => r.id === highlightMessageId))}
          />
        ))}
      </div>

      {canParticipate && (
        <div className="p-6 pt-4 border-t border-gray-100">
          <Composer
            projectId={projectId}
            parentId={replyTo?.id || null}
            replyingToPreview={replyTo ? { name: senderLabel(replyTo), text: replyTo.content } : null}
            onCancelReply={() => setReplyTo(null)}
            onSent={() => setReplyTo(null)}
          />
        </div>
      )}
    </div>
  );
};

const ThreadGroup: React.FC<{
  root: ProjectMessage;
  replies: ProjectMessage[];
  projectId: string;
  canParticipate: boolean;
  myUserId?: string;
  onReply: (m: ProjectMessage) => void;
  autoExpand?: boolean;
}> = ({ root, replies, projectId, canParticipate, myUserId, onReply, autoExpand }) => {
  const [expanded, setExpanded] = useState(!!autoExpand);
  return (
    <div className="flex flex-col gap-2">
      <MessageRow message={root} projectId={projectId} canParticipate={canParticipate} myUserId={myUserId} onReply={() => onReply(root)} />
      {replies.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary-600 ml-11"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </button>
      )}
      {expanded && (
        <div className="flex flex-col gap-2 pl-6 ml-5 border-l-2 border-gray-100">
          {replies.map((r) => (
            <MessageRow key={r.id} message={r} projectId={projectId} canParticipate={canParticipate} myUserId={myUserId} onReply={() => onReply(root)} />
          ))}
        </div>
      )}
    </div>
  );
};

const MessageRow: React.FC<{
  message: ProjectMessage;
  projectId: string;
  canParticipate: boolean;
  myUserId?: string;
  onReply: () => void;
}> = ({ message: m, projectId, canParticipate, myUserId, onReply }) => {
  const qc = useQueryClient();
  const toast = useToastContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggleReaction = useMutation({
    mutationFn: ({ emoji, remove }: { emoji: string; remove: boolean }) =>
      apiRequest<any>(API_ENDPOINTS.PROJECT_COMMUNICATIONS.MESSAGE_REACTIONS(projectId, m.id), {
        method: remove ? 'DELETE' : 'POST',
        body: JSON.stringify({ emoji }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-communications', 'messages', projectId] }),
    onError: () => toast?.error?.('Failed to update reaction'),
  });

  const handleToggleReaction = (emoji: string) => {
    const already = (m.reactions || []).some((r) => r.emoji === emoji && r.user_id === myUserId);
    toggleReaction.mutate({ emoji, remove: already });
    setPickerOpen(false);
  };

  const isClient = m.user?.user_type === 'CLIENT';

  return (
    <div id={`project-message-${m.id}`} className="flex items-start gap-3 rounded-2xl transition-shadow">
      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black text-white', isClient ? 'bg-emerald-500' : 'bg-primary-500')}>
        {senderLabel(m).slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-900">{senderLabel(m)}</span>
          <span className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded', isClient ? 'bg-emerald-50 text-emerald-600' : 'bg-primary-50 text-primary-600')}>
            {isClient ? 'Client' : 'TekXAI'}
          </span>
          {m.visibility === 'INTERNAL' && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500" title="Only visible to internal team — not sent to the client">
              Internal only
            </span>
          )}
          <span className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleString()}</span>
        </div>
        <p className="text-sm text-gray-700 mt-0.5 break-words whitespace-pre-wrap">{m.content}</p>
        {canParticipate && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5 relative">
            {aggregateReactions(m.reactions, myUserId).map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleToggleReaction(r.emoji)}
                className={cn(
                  'flex items-center gap-1 px-2 h-6 rounded-full text-xs border',
                  r.reactedByMe ? 'bg-primary-100 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                )}
              >
                <span>{r.emoji}</span>
                <span className="font-semibold">{r.count}</span>
              </button>
            ))}
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex items-center justify-center h-6 w-6 rounded-full border border-dashed border-gray-200 text-gray-400 hover:bg-gray-50"
              title="Add reaction"
            >
              <Smile size={13} />
            </button>
            <button onClick={onReply} className="flex items-center gap-1 px-2 h-6 rounded-full text-xs text-gray-400 hover:bg-gray-50" title="Reply">
              <Reply size={12} /> Reply
            </button>
            {pickerOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 flex items-center gap-1 p-1.5 rounded-xl border border-gray-200 bg-white shadow-lg">
                {QUICK_REACTIONS.map((e) => (
                  <button key={e} onClick={() => handleToggleReaction(e)} className="text-lg h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-50">
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Composer: React.FC<{
  projectId: string;
  parentId: string | null;
  replyingToPreview: { name: string; text: string } | null;
  onCancelReply: () => void;
  onSent: () => void;
}> = ({ projectId, parentId, replyingToPreview, onCancelReply, onSent }) => {
  const qc = useQueryClient();
  const toast = useToastContext();
  const [content, setContent] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: mentionable = [] } = useQuery<MentionableUser[]>({
    queryKey: ['project-communications', 'mentionable-users', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PROJECT_COMMUNICATIONS.MENTIONABLE_USERS(projectId)),
    select: (r: any) => r?.payload || [],
  });

  const filteredMentionable = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return mentionable.filter((u) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)).slice(0, 8);
  }, [mentionable, mentionQuery]);

  const sendMessage = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.PROJECT_COMMUNICATIONS.MESSAGES(projectId), {
        method: 'POST',
        // visibility is always explicitly CLIENT_VISIBLE from this
        // composer — never left to the backend default (INTERNAL), and
        // never a value the user can change here. Internal-only notes stay
        // exclusively on the separate "Add Note" feature.
        body: JSON.stringify({ content: content.trim(), parent_id: parentId, visibility: 'CLIENT_VISIBLE', mentions: Array.from(mentionedIds) }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-communications', 'messages', projectId] });
      setContent('');
      setMentionedIds(new Set());
      onSent();
    },
    onError: () => toast?.error?.('Failed to send message'),
  });

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    const upToCursor = value.slice(0, e.target.selectionStart || value.length);
    const match = upToCursor.match(/(?:^|\s)@([a-zA-Z]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const selectMention = (u: MentionableUser) => {
    const name = `${u.first_name} ${u.last_name}`.trim();
    setContent((c) => c.replace(/@[a-zA-Z]*$/, `@${name} `));
    setMentionedIds((prev) => new Set(prev).add(u.id));
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const MAX_TEXTAREA_HEIGHT = 200;
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  }, [content]);

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage.mutate();
  };

  return (
    <div className="flex flex-col gap-2">
      {replyingToPreview && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-xs text-gray-500 truncate">
            Replying to <span className="font-bold text-gray-700">{replyingToPreview.name}</span>: {replyingToPreview.text}
          </div>
          <button onClick={onCancelReply} className="text-xs font-bold text-gray-400 hover:text-gray-600 shrink-0">Cancel</button>
        </div>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Write a message the client will see... (type @ to mention someone)"
          rows={3}
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-200"
          style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
        />
        {mentionQuery !== null && filteredMentionable.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 z-20 w-64 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {filteredMentionable.map((u) => (
              <button
                key={u.id}
                onClick={() => selectMention(u)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
              >
                <AtSign size={12} className="text-gray-400" />
                <span className="font-semibold text-gray-700">{u.first_name} {u.last_name}</span>
                {u.user_type === 'CLIENT' && <span className="text-[9px] font-black uppercase text-emerald-500 ml-auto">Client</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={!content.trim() || sendMessage.isPending}
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          <Send size={14} />
          {parentId ? 'Send Reply' : 'Send to Client'}
        </button>
      </div>
    </div>
  );
};

export default ClientCommunicationThread;
