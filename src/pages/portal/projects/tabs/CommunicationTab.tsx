import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, FileText, X, Smile, Reply, Bold, Italic, Code, ChevronDown, ChevronRight, AtSign } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useMyPermissions } from '@/services/permissionsService';
import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';
import { TableSkeleton } from '@/components/skeletons';
import EmojiPicker from '@/pages/chat/EmojiPicker';
import { getSocket } from '@/lib/socket';
import { RichText } from '../richText';
import { PortalMessage } from '../types';
import ProfileSidePanel from '../ProfileSidePanel';

// Small curated set for the one-click "quick react" row — the full picker
// (search + categories) is still reachable via the "+" button for anything
// else, same two-tier pattern the internal chat already uses.
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🙏', '👀'];

function aggregateReactions(reactions: PortalMessage['reactions'], myUserId?: string) {
  const byEmoji = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
  for (const r of reactions || []) {
    const entry = byEmoji.get(r.emoji) || { emoji: r.emoji, count: 0, reactedByMe: false };
    entry.count += 1;
    if (r.user_id === myUserId) entry.reactedByMe = true;
    byEmoji.set(r.emoji, entry);
  }
  return Array.from(byEmoji.values());
}

const inputCls =
  'w-full min-h-[70px] px-3 py-2 border border-(--color-border) rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none bg-(--color-surface)';

// Kept broad on purpose — project materials can legitimately be almost any
// common file type, including installers/disk images (an explicit product
// decision, not an oversight); the backend re-validates its own allow-list
// regardless of what this attribute permits client-side.
const ATTACHMENT_ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.odt,.rtf,.txt,.csv,.xls,.xlsx,.ods,.zip,.rar,.7z,.tar,.gz,.exe,.dmg,.pkg,.msi,.apk,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.heic,.mp4,.mov,.webm,.mkv,.avi,.m4v,.mp3,.wav,.ogg,.m4a';

function formatBytes(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type PendingAttachment = {
  attachment_file_key: string;
  attachment_file_url: string;
  attachment_file_name: string;
  attachment_mime_type: string;
  attachment_size_bytes: number;
};

type MentionableUser = { id: string; first_name: string; last_name: string };

function senderName(msg: Pick<PortalMessage, 'user'>) {
  return msg.user?.user_type === 'INTERNAL' ? 'TekXAI Team' : `${msg.user?.first_name ?? ''} ${msg.user?.last_name ?? ''}`.trim();
}

// Wraps (or, with no selection, inserts markers around the cursor for) the
// textarea's current selection with a markdown-lite pair — same convention
// RichText.tsx renders back out.
function wrapSelection(el: HTMLTextAreaElement, before: string, after: string, value: string, setValue: (v: string) => void) {
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const selected = value.slice(start, end) || 'text';
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    el.focus();
    el.selectionStart = start + before.length;
    el.selectionEnd = start + before.length + selected.length;
  });
}

// ── Reusable composer — the main box and each thread's inline reply box ────

const Composer: React.FC<{
  projectId: string;
  parentId?: string;
  autoFocus?: boolean;
  onSent: () => void;
  onCancel?: () => void;
  replyingToPreview?: { name: string; text: string } | null;
}> = ({ projectId, parentId, autoFocus, onSent, onCancel, replyingToPreview }) => {
  const [content, setContent] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const toast = useToastContext();

  const { data: mentionable = [] } = useQuery<MentionableUser[]>({
    queryKey: ['portal', 'mentionable-users', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MENTIONABLE_USERS(projectId)),
    select: (r: any) => r?.payload || [],
  });

  const sendMessage = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES(projectId), { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setContent('');
      setPendingAttachment(null);
      setMentionedIds(new Set());
      qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] });
      onSent();
    },
    onError: () => toast?.error?.('Failed to send message'),
  });

  const handleFileChosen = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_UPLOAD(projectId), { method: 'POST', body: form });
      setPendingAttachment(res?.payload);
    } catch {
      toast?.error?.('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if (!content.trim() && !pendingAttachment) return;
    sendMessage.mutate({
      content: content.trim(),
      ...(parentId ? { parent_id: parentId } : {}),
      ...(mentionedIds.size ? { mentions: Array.from(mentionedIds) } : {}),
      ...(pendingAttachment || {}),
    });
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    const upToCursor = value.slice(0, e.target.selectionStart ?? value.length);
    const match = /(?:^|\s)@([a-zA-Z]*)$/.exec(upToCursor);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (u: MentionableUser) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? content.length;
    const upToCursor = content.slice(0, cursor);
    const replaced = upToCursor.replace(/@([a-zA-Z]*)$/, `@${u.first_name} ${u.last_name} `);
    const next = replaced + content.slice(cursor);
    setContent(next);
    setMentionedIds((prev) => new Set(prev).add(u.id));
    setMentionQuery(null);
    requestAnimationFrame(() => el.focus());
  };

  const filteredMentionable = mentionQuery !== null
    ? mentionable.filter((u) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  const toolbarBtn = (icon: React.ReactNode, title: string, onClick: () => void) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center justify-center h-7 w-7 rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover)"
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      {replyingToPreview && (
        <div className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-(--color-border) bg-(--color-elevated) text-xs">
          <div className="flex items-center gap-1.5 min-w-0 text-(--color-text-secondary)">
            <Reply size={13} className="shrink-0" />
            <span className="font-semibold text-(--color-text-primary) shrink-0">{replyingToPreview.name}</span>
            <span className="truncate">{replyingToPreview.text}</span>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-(--color-text-secondary) hover:text-red-500 shrink-0">
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {pendingAttachment && (
        <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-(--color-border) bg-(--color-elevated) text-xs font-semibold w-fit">
          <FileText size={14} />
          <span className="truncate max-w-[220px]">{pendingAttachment.attachment_file_name}</span>
          <span className="text-(--color-text-secondary)">{formatBytes(pendingAttachment.attachment_size_bytes)}</span>
          <button onClick={() => setPendingAttachment(null)} className="text-(--color-text-secondary) hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 px-1">
        {toolbarBtn(<Bold size={14} />, 'Bold', () => textareaRef.current && wrapSelection(textareaRef.current, '**', '**', content, setContent))}
        {toolbarBtn(<Italic size={14} />, 'Italic', () => textareaRef.current && wrapSelection(textareaRef.current, '*', '*', content, setContent))}
        {toolbarBtn(<Code size={14} />, 'Code', () => textareaRef.current && wrapSelection(textareaRef.current, '`', '`', content, setContent))}
        {toolbarBtn(<AtSign size={14} />, 'Mention someone', () => setContent((c) => c + (c.endsWith(' ') || !c ? '@' : ' @')))}
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          className={inputCls}
          placeholder="Write a message... (type @ to mention someone)"
          value={content}
          onChange={handleTextareaChange}
          autoFocus={autoFocus}
        />
        {mentionQuery !== null && filteredMentionable.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 z-20 w-64 max-h-48 overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg">
            {filteredMentionable.map((u) => (
              <button
                key={u.id}
                onClick={() => insertMention(u)}
                className="w-full flex items-center gap-2 px-3 h-9 text-sm text-left hover:bg-(--color-state-hover)"
              >
                <span className="h-6 w-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {u.first_name?.[0]?.toUpperCase() ?? '?'}
                </span>
                {u.first_name} {u.last_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChosen(f); }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 h-9 rounded-xl border border-(--color-border) text-xs font-semibold text-(--color-text-secondary) hover:bg-(--color-state-hover) disabled:opacity-50"
          >
            <Paperclip size={14} />
            {uploading ? 'Uploading…' : 'Attach'}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-state-hover)"
              title="Insert emoji"
            >
              <Smile size={15} />
            </button>
            {showEmojiPicker && (
              <EmojiPicker onSelect={(emoji) => setContent((c) => c + emoji)} onClose={() => setShowEmojiPicker(false)} />
            )}
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={(!content.trim() && !pendingAttachment) || sendMessage.isPending || uploading}
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          <Send size={14} />
          Send
        </button>
      </div>
    </div>
  );
};

// ── Inline image preview for image attachments (everything else keeps the
// file-chip treatment below) — the stored file has no public URL, so the
// same signed view_url the file chip fetches on click is fetched once here
// to use as the <img> src.
const AttachmentImagePreview: React.FC<{ projectId: string; messageId: string; alt: string; onOpenFull: () => void }> = ({ projectId, messageId, alt, onOpenFull }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'messages', projectId, messageId, 'attachment-view-url'],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_VIEW_URL(projectId, messageId));
      return res?.payload?.view_url as string;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="mt-2 h-40 w-56 rounded-xl bg-(--color-state-hover) animate-pulse" />;
  }
  if (isError || !data) return null;

  return (
    <button onClick={onOpenFull} className="mt-2 block rounded-xl overflow-hidden border border-(--color-border) max-w-[280px]">
      <img src={data} alt={alt} loading="lazy" className="block max-h-64 w-auto object-cover" />
    </button>
  );
};

// ── One message bubble (used for both root messages and thread replies) ────

const MessageBubble: React.FC<{
  message: PortalMessage;
  projectId: string;
  canCompose: boolean;
  myUserId?: string;
  onReply: () => void;
  onOpenProfile: (userId: string) => void;
}> = ({ message: m, projectId, canCompose, myUserId, onReply, onOpenProfile }) => {
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const qc = useQueryClient();
  const toast = useToastContext();

  const toggleReaction = useMutation({
    mutationFn: ({ emoji, remove }: { emoji: string; remove: boolean }) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_REACTIONS(projectId, m.id), {
        method: remove ? 'DELETE' : 'POST',
        body: JSON.stringify({ emoji }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] }),
    onError: () => toast?.error?.('Failed to update reaction'),
  });

  const handleToggleReaction = (emoji: string) => {
    const alreadyReacted = (m.reactions || []).some((r) => r.emoji === emoji && r.user_id === myUserId);
    toggleReaction.mutate({ emoji, remove: alreadyReacted });
    setReactionPickerOpen(false);
  };

  const handleViewAttachment = async () => {
    try {
      const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_VIEW_URL(projectId, m.id));
      const url = res?.payload?.view_url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast?.error?.('Failed to open attachment');
    }
  };

  return (
    <div
      id={`portal-message-${m.id}`}
      className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3',
        m.user?.id === myUserId ? 'self-end bg-primary-50' : 'self-start bg-(--color-elevated)'
      )}
    >
      <div className="flex items-center justify-between gap-4 mb-1">
        <button
          onClick={() => onOpenProfile(m.user.id)}
          className="flex items-center gap-1.5 min-w-0 group"
          title="View profile"
        >
          {m.user?.avatar ? (
            <img src={m.user.avatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
          ) : (
            <span className="h-5 w-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[9px] font-black shrink-0">
              {senderName(m).slice(0, 1).toUpperCase() || '?'}
            </span>
          )}
          <span className="text-xs font-bold text-(--color-text-primary) group-hover:underline truncate">{senderName(m)}</span>
        </button>
        <span className="text-[11px] text-(--color-text-secondary) shrink-0">{new Date(m.created_at).toLocaleString()}</span>
      </div>
      {m.content && <RichText content={m.content} className="text-sm text-(--color-text-primary)" />}
      {m.attachment_file_key && m.attachment_mime_type?.startsWith('image/') ? (
        <AttachmentImagePreview
          projectId={projectId}
          messageId={m.id}
          alt={m.attachment_file_name || 'attachment'}
          onOpenFull={handleViewAttachment}
        />
      ) : m.attachment_file_key && (
        <button
          onClick={handleViewAttachment}
          className="mt-2 flex items-center gap-2 px-3 h-9 rounded-xl border border-(--color-border) bg-(--color-surface) text-xs font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover)"
        >
          <FileText size={14} className="shrink-0" />
          <span className="truncate max-w-[220px]">{m.attachment_file_name}</span>
          {!!m.attachment_size_bytes && <span className="text-(--color-text-secondary) shrink-0">{formatBytes(m.attachment_size_bytes)}</span>}
        </button>
      )}

      {canCompose && (
        <div className="flex flex-wrap items-center gap-1 mt-2 relative">
          {aggregateReactions(m.reactions, myUserId).map((r) => (
            <button
              key={r.emoji}
              onClick={() => handleToggleReaction(r.emoji)}
              className={cn(
                'flex items-center gap-1 px-2 h-6 rounded-full text-xs border',
                r.reactedByMe
                  ? 'bg-primary-100 border-primary-300 text-primary-700'
                  : 'bg-(--color-surface) border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-state-hover)'
              )}
            >
              <span>{r.emoji}</span>
              <span className="font-semibold">{r.count}</span>
            </button>
          ))}
          <button
            onClick={() => setReactionPickerOpen((v) => !v)}
            className="flex items-center justify-center h-6 w-6 rounded-full border border-dashed border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-state-hover)"
            title="Add reaction"
          >
            <Smile size={13} />
          </button>
          <button
            onClick={onReply}
            className="flex items-center gap-1 px-2 h-6 rounded-full text-xs text-(--color-text-secondary) hover:bg-(--color-state-hover)"
            title="Reply"
          >
            <Reply size={12} />
            Reply
          </button>
          {reactionPickerOpen && (
            <div className="absolute top-full left-0 mt-1 z-20 flex items-center gap-1 p-1.5 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg">
              {QUICK_REACTIONS.map((e) => (
                <button key={e} onClick={() => handleToggleReaction(e)} className="text-lg h-8 w-8 flex items-center justify-center rounded-lg hover:bg-(--color-state-hover)">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── One root message + its (one level of) replies ──────────────────────────

const Thread: React.FC<{
  root: PortalMessage;
  replies: PortalMessage[];
  projectId: string;
  canCompose: boolean;
  myUserId?: string;
  initiallyExpanded?: boolean;
  onOpenProfile: (userId: string) => void;
}> = ({ root, replies, projectId, canCompose, myUserId, initiallyExpanded, onOpenProfile }) => {
  const [expanded, setExpanded] = useState(!!initiallyExpanded);
  const [replying, setReplying] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <MessageBubble message={root} projectId={projectId} canCompose={canCompose} myUserId={myUserId} onReply={() => { setExpanded(true); setReplying(true); }} onOpenProfile={onOpenProfile} />

      {replies.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 text-xs font-semibold text-(--color-text-secondary) hover:text-primary-600',
            root.user?.id === myUserId ? 'self-end mr-2' : 'self-start ml-2'
          )}
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {expanded && (
        <div className={cn('flex flex-col gap-2 pl-4 border-l-2 border-(--color-border)', root.user?.id === myUserId ? 'self-end mr-4' : 'self-start ml-4')}>
          {replies.map((r) => (
            <MessageBubble key={r.id} message={r} projectId={projectId} canCompose={canCompose} myUserId={myUserId} onReply={() => setReplying(true)} onOpenProfile={onOpenProfile} />
          ))}
          {canCompose && replying && (
            <Composer
              projectId={projectId}
              parentId={root.id}
              autoFocus
              onSent={() => setReplying(false)}
              onCancel={() => setReplying(false)}
              replyingToPreview={{ name: senderName(root), text: root.content || '(attachment)' }}
            />
          )}
          {canCompose && !replying && (
            <button onClick={() => setReplying(true)} className="self-start text-xs font-semibold text-primary-600 hover:text-primary-700">
              Reply in thread
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Tab root ─────────────────────────────────────────────────────────────

const CommunicationTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: myPerms } = useMyPermissions();
  const { user } = useAuth();
  const canCompose = !!myPerms?.permissions?.includes('client.communication.create');
  const qc = useQueryClient();
  // Mention/notification deep link: .../communication?message=:id — scroll
  // to and briefly highlight the specific message once loaded. Read once;
  // this is navigation only, unrelated to the authorization that already
  // gated loading this project's Communication tab in the first place.
  const location = useLocation();
  const highlightMessageId = useRef<string | null>(new URLSearchParams(location.search).get('message')).current;
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PortalMessage[]>({
    queryKey: ['portal', 'messages', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  // Opening this tab marks the thread read up to now; also refresh the
  // dashboard's unread badge so it drops immediately rather than on next
  // full reload.
  useEffect(() => {
    apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES_READ(projectId), { method: 'POST' })
      .then(() => qc.invalidateQueries({ queryKey: ['portal', 'unread-counts'] }))
      .catch(() => {});
  }, [projectId, qc]);

  // Real-time — the socket auto-joins every project room this user has
  // access to on connect (see be-work's shared/socket/index.js), so no
  // explicit room:join call is needed here, just the listener. New messages
  // (from either side) refresh the thread instantly instead of waiting for
  // some other action to trigger a refetch. Since this tab is open while
  // listening, re-mark the thread read too — otherwise a message that
  // arrives while you're already looking at it would inflate the unread
  // badge until you left and came back.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNewMessage = (message: PortalMessage & { project_id?: string }) => {
      if (message.project_id && message.project_id !== projectId) return;
      qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] });
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES_READ(projectId), { method: 'POST' })
        .then(() => qc.invalidateQueries({ queryKey: ['portal', 'unread-counts'] }))
        .catch(() => {});
    };
    socket.on('project:message:new', handleNewMessage);
    return () => { socket.off('project:message:new', handleNewMessage); };
  }, [projectId, qc]);

  // Scroll to and briefly highlight the deep-linked message once the
  // thread has rendered (after any auto-expand above has already run).
  useEffect(() => {
    if (!highlightMessageId || isLoading) return;
    const el = document.getElementById(`portal-message-${highlightMessageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary-400');
    const timer = setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400'), 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightMessageId, isLoading, data?.length]);

  if (isLoading) return <TableSkeleton columns={1} rows={5} />;

  const roots = (data || []).filter((m) => !m.parent_id);
  const repliesByRoot = new Map<string, PortalMessage[]>();
  (data || []).filter((m) => m.parent_id).forEach((m) => {
    const list = repliesByRoot.get(m.parent_id!) || [];
    list.push(m);
    repliesByRoot.set(m.parent_id!, list);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 max-h-[560px] overflow-y-auto">
        {roots.length === 0 && (
          <p className="text-sm text-(--color-text-secondary) py-10 text-center">No messages yet.</p>
        )}
        {roots.map((root) => {
          const replies = repliesByRoot.get(root.id) || [];
          const targetIsInThisThread = !!highlightMessageId && (root.id === highlightMessageId || replies.some((r) => r.id === highlightMessageId));
          return (
            <Thread
              key={root.id}
              root={root}
              replies={replies}
              projectId={projectId}
              canCompose={canCompose}
              myUserId={user?.id}
              initiallyExpanded={targetIsInThisThread}
              onOpenProfile={setProfileUserId}
            />
          );
        })}
      </div>

      {canCompose && (
        <div className="pt-4 border-t border-(--color-card-border)">
          <Composer projectId={projectId} onSent={() => {}} />
        </div>
      )}

      {profileUserId && (
        <ProfileSidePanel projectId={projectId} userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </div>
  );
};

export default CommunicationTab;
