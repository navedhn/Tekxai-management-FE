import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, FileText, X, Smile, Reply, Bold, Italic, Code, Link2, Loader2, ChevronDown, ChevronRight, Pencil, Trash2, Check, Copy, Pin, Link as LinkIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useMyPermissions } from '@/services/permissionsService';
import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';
import { TableSkeleton } from '@/components/skeletons';
import EmojiPicker from '@/pages/chat/EmojiPicker';
import { getSocket } from '@/lib/socket';
import { RichText, MessageLinkPreviews } from '../richText';
import { PortalMessage, messageAttachments } from '../types';
import ProfileSidePanel from '../ProfileSidePanel';
import MentionTextarea, { extractMentionIds, useMentionableUsers } from '../MentionTextarea';

// Small curated set for the one-click "quick react" row — the full picker
// (search + categories) is still reachable via the "+" button for anything
// else, same two-tier pattern the internal chat already uses.
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🙏', '👀'];

function aggregateReactions(reactions: PortalMessage['reactions'], myUserId?: string) {
  const byEmoji = new Map<string, { emoji: string; count: number; reactedByMe: boolean; names: string[] }>();
  for (const r of reactions || []) {
    const entry = byEmoji.get(r.emoji) || { emoji: r.emoji, count: 0, reactedByMe: false, names: [] };
    entry.count += 1;
    if (r.user_id === myUserId) entry.reactedByMe = true;
    const name = `${r.user?.first_name ?? ''} ${r.user?.last_name ?? ''}`.trim();
    if (r.user_id === myUserId) entry.names.push('You');
    else if (name) entry.names.push(name);
    else entry.names.push('Someone');
    byEmoji.set(r.emoji, entry);
  }
  return Array.from(byEmoji.values());
}

const MAX_TEXTAREA_HEIGHT = 200;

const inputCls =
  'communication-composer-input w-full min-h-[70px] px-3 py-2 border border-(--color-border) rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none bg-(--color-surface)';

// The composer's text box sits borderless inside the composer card (the card
// draws the border and focus ring).
const composerInputCls =
  'communication-composer-input w-full min-h-[44px] px-2 py-1.5 border-0 text-[15px] leading-relaxed focus:outline-none resize-none bg-transparent';

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

// Unified Portal — an INTERNAL sender is now frequently the actual
// assigned employee (e.g. Farhan) participating as themselves, not just
// an anonymous "company voice" reply, so their real name is shown just
// like a CLIENT sender's — the backend already returns the real person
// (see create_portal_message: "Sender identity must be the real person,
// not anonymized").
function senderName(msg: Pick<PortalMessage, 'user'>) {
  return [msg.user?.first_name, msg.user?.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
}

/** Local calendar day key (YYYY-MM-DD) for grouping messages into date dividers. */
function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** ClickUp-style relative labels: Today / Yesterday / weekday, Mon D, YYYY. */
function formatDateDividerLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startMsg.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/** Centered label with hairline rules on both sides — ClickUp chat date separator. */
const DateDivider: React.FC<{ iso: string }> = ({ iso }) => (
  <div className="flex items-center gap-3 py-1 select-none" role="separator" aria-label={formatDateDividerLabel(iso)}>
    <div className="flex-1 h-px bg-(--color-border)" />
    <span className="shrink-0 px-1 text-[11px] font-semibold tracking-wide text-(--color-text-secondary) bg-white [font-family:var(--font-communication-sans)]">
      {formatDateDividerLabel(iso)}
    </span>
    <div className="flex-1 h-px bg-(--color-border)" />
  </div>
);

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

// Inserts markdown [label](url) — RichText renders both this and bare URLs.
function insertLink(el: HTMLTextAreaElement, value: string, setValue: (v: string) => void) {
  const url = window.prompt('Link URL', 'https://')?.trim();
  if (!url || url === 'https://') return;
  const href = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const selected = value.slice(start, end) || 'link';
  const inserted = `[${selected}](${href})`;
  setValue(value.slice(0, start) + inserted + value.slice(end));
  window.requestAnimationFrame(() => {
    el.focus();
    el.selectionStart = start + 1;
    el.selectionEnd = start + 1 + selected.length;
  });
}

function presenceLabel(u: { first_name: string | null; last_name: string | null }) {
  return [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || 'Someone';
}

function formatTypingLabel(users: { first_name: string | null; last_name: string | null }[]) {
  if (users.length === 0) return null;
  if (users.length === 1) return `${presenceLabel(users[0])} is typing…`;
  if (users.length === 2) return `${presenceLabel(users[0])} and ${presenceLabel(users[1])} are typing…`;
  return `${users.length} people are typing…`;
}

const ToolbarButton: React.FC<{ title: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ title, onClick, disabled, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    disabled={disabled}
    className="flex items-center justify-center h-8 w-8 rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary) disabled:opacity-40 disabled:hover:bg-transparent"
  >
    {children}
  </button>
);

const Composer: React.FC<{
  projectId: string;
  parentId?: string;
  autoFocus?: boolean;
  onSent: () => void;
  onCancel?: () => void;
  replyingToPreview?: { name: string; text: string } | null;
}> = ({ projectId, parentId, autoFocus, onSent, onCancel, replyingToPreview }) => {
  const [content, setContent] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();
  const toast = useToastContext();

  const mentionable = useMentionableUsers(projectId);

  const stopTyping = () => {
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = null;
    }
    getSocket()?.emit('project:typing:stop', { projectId });
  };

  const emitTyping = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('project:typing:start', { projectId });
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      socket.emit('project:typing:stop', { projectId });
      typingStopTimer.current = null;
    }, 2500);
  };

  useEffect(() => () => {
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = null;
    }
    getSocket()?.emit('project:typing:stop', { projectId });
  }, [projectId]);

  const postMessage = (body: Record<string, unknown>) =>
    apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES(projectId), { method: 'POST', body: JSON.stringify(body) });

  // Uploaded one at a time through the single-file upload endpoint, then
  // sent together as one message (see handleSend). A failed file is skipped
  // with a toast rather than discarding the ones that did upload.
  const MAX_ATTACHMENTS = 10;
  const handleFilesChosen = async (files: File[]) => {
    const room = MAX_ATTACHMENTS - pendingAttachments.length;
    if (files.length > room) toast?.error?.(`Up to ${MAX_ATTACHMENTS} files per message`);
    setUploading(true);
    try {
      for (const file of files.slice(0, Math.max(room, 0))) {
        try {
          const form = new FormData();
          form.append('file', file);
          const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_UPLOAD(projectId), { method: 'POST', body: form });
          if (res?.payload) setPendingAttachments((prev) => [...prev, res.payload]);
        } catch {
          toast?.error?.(`Failed to upload ${file.name}`);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  }, [content]);

  // Text, mentions and every picked file go out as ONE message.
  const handleSend = async () => {
    if (!content.trim() && !pendingAttachments.length) return;
    const mentions = extractMentionIds(content, mentionable);
    stopTyping();
    setSending(true);
    try {
      await postMessage({
        content: content.trim(),
        ...(parentId ? { parent_id: parentId } : {}),
        ...(mentions.length ? { mentions } : {}),
        ...(pendingAttachments.length ? { attachments: pendingAttachments } : {}),
      });
      setContent('');
      setPendingAttachments([]);
      onSent();
    } catch {
      toast?.error?.('Failed to send message');
    } finally {
      setSending(false);
      qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] });
    }
  };

  const wrapWith = (before: string, after: string) => {
    const el = textareaRef.current;
    if (el) wrapSelection(el, before, after, content, setContent);
  };
  const handleBold = () => wrapWith('**', '**');
  const handleItalic = () => wrapWith('*', '*');
  const handleCode = () => wrapWith('`', '`');
  const handleLink = () => {
    const el = textareaRef.current;
    if (el) insertLink(el, content, setContent);
  };
  const handleAttachClick = () => fileInputRef.current?.click();

  // Paste a screenshot/image from the clipboard as an attachment (same path
  // as the paperclip picker). Plain-text pastes fall through untouched.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items?.length) return;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));
    if (!imageItems.length) return;
    const files = imageItems
      .map((item) => {
        const blob = item.getAsFile();
        if (!blob) return null;
        const ext = (item.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        return new File([blob], `pasted-image-${Date.now()}.${ext}`, { type: item.type });
      })
      .filter((f): f is File => !!f);
    if (!files.length) return;
    e.preventDefault();
    void handleFilesChosen(files);
  };

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
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingAttachments.map((a) => (
            <div key={a.attachment_file_key} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-(--color-border) bg-(--color-elevated) text-xs font-semibold w-fit max-w-full">
              {a.attachment_mime_type?.startsWith('image/') && a.attachment_file_url ? (
                <img src={a.attachment_file_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
              ) : (
                <FileText size={14} className="shrink-0" />
              )}
              <span className="truncate max-w-[220px]">{a.attachment_file_name}</span>
              <span className="text-(--color-text-secondary)">{formatBytes(a.attachment_size_bytes)}</span>
              <button
                onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.attachment_file_key !== a.attachment_file_key))}
                disabled={sending}
                className="text-(--color-text-secondary) hover:text-red-500 disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) handleFilesChosen(files); }}
      />
      <div className="flex items-stretch rounded-2xl border border-(--color-border) bg-(--color-surface) focus-within:border-primary-400 transition-colors">
        <div className="flex-1 min-w-0 flex flex-col px-3 pt-2 pb-2">
          <div className="flex items-center gap-1">
            <ToolbarButton title="Bold" onClick={handleBold}><Bold size={16} /></ToolbarButton>
            <ToolbarButton title="Italic" onClick={handleItalic}><Italic size={16} /></ToolbarButton>
            <ToolbarButton title="Code" onClick={handleCode}><Code size={16} /></ToolbarButton>
            <ToolbarButton title="Insert link" onClick={handleLink}><Link2 size={16} /></ToolbarButton>
            <ToolbarButton
              title={uploading ? 'Uploading…' : pendingAttachments.length >= MAX_ATTACHMENTS ? `Up to ${MAX_ATTACHMENTS} files per message` : 'Attach files'}
              onClick={handleAttachClick}
              disabled={uploading || sending || pendingAttachments.length >= MAX_ATTACHMENTS}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            </ToolbarButton>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                title="Insert emoji"
                className="flex items-center justify-center h-8 w-8 rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary)"
              >
                <Smile size={16} />
              </button>
              {showEmojiPicker && (
                <EmojiPicker onSelect={(emoji) => setContent((c) => c + emoji)} onClose={() => setShowEmojiPicker(false)} />
              )}
            </div>
          </div>

          <MentionTextarea
            ref={textareaRef}
            projectId={projectId}
            className={composerInputCls}
            placeholder="Write a message... (@ to mention, @everyone for all, Enter to send, Ctrl+Enter for new line)"
            value={content}
            onChange={(v) => {
              setContent(v);
              if (v.trim()) emitTyping();
              else stopTyping();
            }}
            onPaste={handlePaste}
            onSubmit={() => { if (!sending && !uploading) void handleSend(); }}
            autoFocus={autoFocus}
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />
        </div>

        <div className="flex items-center pl-3 pr-3 my-3 border-l border-(--color-border)">
          <button
            onClick={handleSend}
            disabled={(!content.trim() && !pendingAttachments.length) || sending || uploading}
            title="Send (Enter)"
            aria-label="Send"
            className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary-600 text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Inline image preview for image attachments (everything else keeps the
// file-chip treatment below) — the stored file has no public URL, so the
// same signed view_url the file chip fetches on click is fetched once here
// to use as the <img> src.
const AttachmentImagePreview: React.FC<{ projectId: string; messageId: string; attachmentId: string | null; alt: string; onOpenFull: () => void }> = ({ projectId, messageId, attachmentId, alt, onOpenFull }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'messages', projectId, messageId, 'attachment-view-url', attachmentId],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_VIEW_URL(projectId, messageId, attachmentId));
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
  canDeleteAny?: boolean;
  myUserId?: string;
  onReply: () => void;
  onOpenProfile: (userId: string) => void;
  mentionMap: Map<string, string>;
}> = ({ message: m, projectId, canCompose, canDeleteAny, myUserId, onReply, onOpenProfile, mentionMap }) => {
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(m.content);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState('attachment');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const qc = useQueryClient();
  const toast = useToastContext();
  const isOwn = m.user?.id === myUserId;
  const isRoot = !m.parent_id;

  const toggleReaction = useMutation({
    mutationFn: ({ emoji, remove }: { emoji: string; remove: boolean }) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_REACTIONS(projectId, m.id), {
        method: remove ? 'DELETE' : 'POST',
        body: JSON.stringify({ emoji }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] }),
    onError: () => toast?.error?.('Failed to update reaction'),
  });

  const pinMessage = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_PIN(projectId, m.id), {
        method: m.is_pinned ? 'DELETE' : 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] });
      qc.invalidateQueries({ queryKey: ['portal', 'messages-pinned', projectId] });
    },
    onError: () => toast?.error?.(m.is_pinned ? 'Failed to unpin' : 'Failed to pin'),
  });

  const mentionable = useMentionableUsers(projectId);
  // Mentions are re-derived from the edited text (same as a new message),
  // so adding a name notifies them and removing one drops it.
  const editMessage = useMutation({
    mutationFn: (content: string) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE(projectId, m.id), {
        method: 'PATCH',
        body: JSON.stringify({ content, mentions: extractMentionIds(content, mentionable) }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] }); setEditing(false); },
    onError: () => toast?.error?.('Failed to update message'),
  });

  const deleteMessage = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE(projectId, m.id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] }),
    onError: () => toast?.error?.('Failed to delete message'),
  });

  const handleToggleReaction = (emoji: string) => {
    const alreadyReacted = (m.reactions || []).some((r) => r.emoji === emoji && r.user_id === myUserId);
    toggleReaction.mutate({ emoji, remove: alreadyReacted });
    setReactionPickerOpen(false);
  };

  const attachments = messageAttachments(m);

  const handleViewAttachment = async (attachmentId: string | null) => {
    try {
      const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_VIEW_URL(projectId, m.id, attachmentId));
      const url = res?.payload?.view_url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast?.error?.('Failed to open attachment');
    }
  };

  // Image attachments open in an in-chat lightbox instead of a new tab —
  // a document/other file still uses handleViewAttachment above (a new
  // tab is the right behavior there — it's a download/viewer handoff,
  // not something worth a custom in-app viewer for every file type).
  const handleViewImage = async (attachmentId: string | null, name: string | null) => {
    try {
      const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_VIEW_URL(projectId, m.id, attachmentId));
      const url = res?.payload?.view_url;
      if (url) { setLightboxUrl(url); setLightboxAlt(name || 'attachment'); }
    } catch {
      toast?.error?.('Failed to open attachment');
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this message? This cannot be undone.')) deleteMessage.mutate();
  };

  const reactionChips = aggregateReactions(m.reactions, myUserId);
  const canCopy = !!(m.content && m.content.trim());
  // Always show the action strip — copy-link is available on every message.
  const showActions = !editing;

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast?.error?.('Failed to copy message');
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/portal/projects/${projectId}/communication?message=${m.id}`;
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      toast?.error?.('Failed to copy link');
    }
  };

  return (
    <div
      id={`portal-message-${m.id}`}
      className="group relative flex items-start gap-3 px-2 py-2 -mx-1 rounded-lg hover:bg-(--color-state-hover)/60 transition-colors"
    >
      <button
        type="button"
        onClick={() => onOpenProfile(m.user.id)}
        className="shrink-0 mt-0.5"
        title="View profile"
      >
        {m.user?.avatar ? (
          <img src={m.user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="h-9 w-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-semibold">
            {senderName(m).slice(0, 1).toUpperCase() || '?'}
          </span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenProfile(m.user.id)}
            className="text-[15px] font-semibold! text-(--color-text-primary) hover:underline"
          >
            {senderName(m)}
          </button>
          <span className="text-[12px] text-(--color-text-secondary)">
            {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            {m.updated_at && m.updated_at !== m.created_at && <span className="italic"> (edited)</span>}
          </span>
          {m.is_pinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
              <Pin size={11} fill="currentColor" /> Pinned
            </span>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-1.5 mt-1">
            <MentionTextarea
              projectId={projectId}
              autoFocus
              value={editValue}
              onChange={setEditValue}
              className={inputCls}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (editValue.trim()) editMessage.mutate(editValue.trim()); }}
                disabled={editMessage.isPending || !editValue.trim()}
                className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-primary-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                <Check size={12} /> Save
              </button>
              <button
                onClick={() => { setEditing(false); setEditValue(m.content); }}
                className="px-2.5 h-7 rounded-lg text-xs font-semibold text-(--color-text-secondary) hover:bg-(--color-state-hover)"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          m.content && (
            <>
              <RichText
                content={m.content}
                className="text-[15px] leading-relaxed text-(--color-text-primary) mt-0.5 [overflow-wrap:anywhere]"
                mentionMap={mentionMap}
                onMentionClick={onOpenProfile}
              />
              <MessageLinkPreviews content={m.content} />
            </>
          )
        )}

        {attachments.some((a) => a.mime_type?.startsWith('image/')) && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {attachments.filter((a) => a.mime_type?.startsWith('image/')).map((a) => (
              <AttachmentImagePreview
                key={a.id ?? a.file_key}
                projectId={projectId}
                messageId={m.id}
                attachmentId={a.id}
                alt={a.file_name || 'attachment'}
                onOpenFull={() => handleViewImage(a.id, a.file_name)}
              />
            ))}
          </div>
        )}
        {attachments.filter((a) => !a.mime_type?.startsWith('image/')).map((a) => (
          <button
            key={a.id ?? a.file_key}
            onClick={() => handleViewAttachment(a.id)}
            className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-(--color-text-primary) hover:underline"
          >
            <FileText size={14} className="shrink-0 text-(--color-text-secondary)" />
            <span className="truncate max-w-[280px]">{a.file_name}</span>
            {!!a.size_bytes && <span className="text-(--color-text-secondary) shrink-0 font-medium">{formatBytes(a.size_bytes)}</span>}
          </button>
        ))}

        {reactionChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {reactionChips.map((r) => (
              <div key={r.emoji} className="relative group/reaction">
                <button
                  type="button"
                  onClick={() => canCompose && handleToggleReaction(r.emoji)}
                  aria-label={`${r.emoji} reaction from ${r.names.join(', ') || `${r.count} people`}`}
                  className={cn(
                    'flex items-center gap-1 px-1.5 h-6 rounded-md text-xs border',
                    r.reactedByMe
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-(--color-elevated) border-transparent text-(--color-text-secondary) hover:border-(--color-border)'
                  )}
                >
                  <span>{r.emoji}</span>
                  <span className="font-semibold">{r.count}</span>
                </button>
                {r.names.length > 0 && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 hidden group-hover/reaction:block group-focus-within/reaction:block"
                  >
                    {/* w-max + overflow-wrap:normal: abspos over a narrow chip otherwise
                        shrink-wraps names into a 1-char-wide vertical strip. */}
                    <div className="w-max max-w-[220px] px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-semibold leading-snug shadow-lg whitespace-normal text-center [overflow-wrap:normal] break-words">
                      {r.names.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showActions && !editing && (
        <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-(--color-border) bg-(--color-surface) shadow-sm relative">
            {canCopy && (
              <button
                onClick={handleCopy}
                className="flex items-center justify-center h-7 w-7 rounded-md text-(--color-text-secondary) hover:bg-(--color-state-hover)"
                title={copied ? 'Copied' : 'Copy message'}
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center h-7 w-7 rounded-md text-(--color-text-secondary) hover:bg-(--color-state-hover)"
              title={linkCopied ? 'Link copied' : 'Copy message link'}
            >
              {linkCopied ? <Check size={14} className="text-emerald-600" /> : <LinkIcon size={14} />}
            </button>
            {canCompose && (
              <>
                <button
                  onClick={() => setReactionPickerOpen((v) => !v)}
                  className="flex items-center justify-center h-7 w-7 rounded-md text-(--color-text-secondary) hover:bg-(--color-state-hover)"
                  title="Add reaction"
                >
                  <Smile size={14} />
                </button>
                <button
                  onClick={onReply}
                  className="flex items-center justify-center h-7 w-7 rounded-md text-(--color-text-secondary) hover:bg-(--color-state-hover)"
                  title="Reply"
                >
                  <Reply size={14} />
                </button>
                {isRoot && (
                  <button
                    onClick={() => pinMessage.mutate()}
                    disabled={pinMessage.isPending}
                    className={cn(
                      'flex items-center justify-center h-7 w-7 rounded-md hover:bg-(--color-state-hover) disabled:opacity-50',
                      m.is_pinned ? 'text-amber-600' : 'text-(--color-text-secondary)'
                    )}
                    title={m.is_pinned ? 'Unpin message' : 'Pin message'}
                  >
                    <Pin size={14} fill={m.is_pinned ? 'currentColor' : 'none'} />
                  </button>
                )}
              </>
            )}
            {isOwn && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center justify-center h-7 w-7 rounded-md text-(--color-text-secondary) hover:bg-(--color-state-hover)"
                title="Edit"
              >
                <Pencil size={14} />
              </button>
            )}
            {(isOwn || canDeleteAny) && (
              <button
                onClick={handleDelete}
                disabled={deleteMessage.isPending}
                className="flex items-center justify-center h-7 w-7 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
            {reactionPickerOpen && (
              <div className="absolute top-full right-0 mt-1 z-20 flex items-center gap-1 p-1.5 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg">
                {QUICK_REACTIONS.map((e) => (
                  <button key={e} onClick={() => handleToggleReaction(e)} className="text-lg h-8 w-8 flex items-center justify-center rounded-lg hover:bg-(--color-state-hover)">
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            title="Close"
          >
            <X size={18} />
          </button>
          <img
            src={lightboxUrl}
            alt={lightboxAlt}
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
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
  canDeleteAny?: boolean;
  myUserId?: string;
  initiallyExpanded?: boolean;
  onOpenProfile: (userId: string) => void;
  mentionMap: Map<string, string>;
}> = ({ root, replies, projectId, canCompose, canDeleteAny, myUserId, initiallyExpanded, onOpenProfile, mentionMap }) => {
  const [expanded, setExpanded] = useState(!!initiallyExpanded);
  const [replying, setReplying] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <MessageBubble message={root} projectId={projectId} canCompose={canCompose} canDeleteAny={canDeleteAny} myUserId={myUserId} onReply={() => { setExpanded(true); setReplying(true); }} onOpenProfile={onOpenProfile} mentionMap={mentionMap} />

      {replies.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="self-start ml-5 flex items-center gap-1.5 text-[13px] font-semibold text-(--color-text-secondary) hover:text-primary-600"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {expanded && (
        <div className="flex flex-col gap-2 ml-5 pl-4 border-l-2 border-(--color-border)">
          {replies.map((r) => (
            <MessageBubble key={r.id} message={r} projectId={projectId} canCompose={canCompose} canDeleteAny={canDeleteAny} myUserId={myUserId} onReply={() => setReplying(true)} onOpenProfile={onOpenProfile} mentionMap={mentionMap} />
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
            <button onClick={() => setReplying(true)} className="self-start text-[13px] font-semibold text-primary-600 hover:text-primary-700">
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
  // An INTERNAL viewer only ever reaches this tab because the backend's
  // assertClientProjectAccess already confirmed they're a member/owner/
  // leader of this exact project — for them that membership IS the
  // authorization boundary (see can_client_or_portal_member on the
  // backend, which skips the client.communication.create permission
  // check entirely for INTERNAL callers). Gating compose on that raw
  // permission here would block a normal assigned employee who was never
  // granted a CLIENT-only permission key, even though the backend would
  // accept their message.
  const canCompose = user?.user_type === 'INTERNAL' || !!myPerms?.permissions?.includes('client.communication.create');
  // Deleting someone ELSE's message (a message's own sender can always
  // delete their own, handled separately per-bubble) — Super Admin gets
  // this via is_super_admin, anyone else only with the real permission,
  // matching the backend's check_permission() precedence exactly.
  const canDeleteAny = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('client.communication.delete');
  const qc = useQueryClient();
  // Mention/notification deep link: .../communication?message=:id — scroll
  // to and briefly highlight the specific message once loaded. Follows the
  // URL, so opening another message from the topbar search while already
  // on this thread scrolls to it too. This is navigation only, unrelated to
  // the authorization that already gated loading this project's
  // Communication tab in the first place.
  const location = useLocation();
  const highlightMessageId = useMemo(() => new URLSearchParams(location.search).get('message'), [location.search]);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [typingUsers, setTypingUsers] = useState<Map<string, { first_name: string | null; last_name: string | null }>>(new Map());
  const [viewingUsers, setViewingUsers] = useState<Map<string, { first_name: string | null; last_name: string | null }>>(new Map());
  const unreadSinceRef = useRef<{ projectId: string; at: string | null } | null>(null);
  const { data: messagesPayload, isLoading } = useQuery<{ records: PortalMessage[]; last_read_at: string | null }>({
    queryKey: ['portal', 'messages', projectId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES(projectId));
      return {
        records: r?.payload?.records || [],
        last_read_at: r?.payload?.last_read_at || null,
      };
    },
  });
  const data = messagesPayload?.records;
  // Capture last_read_at from the first successful fetch for this project so
  // the unread divider survives the subsequent mark-read call.
  if (messagesPayload && unreadSinceRef.current?.projectId !== projectId) {
    unreadSinceRef.current = { projectId, at: messagesPayload.last_read_at };
  }
  const effectiveUnreadSince = unreadSinceRef.current?.projectId === projectId
    ? unreadSinceRef.current.at
    : null;

  const pinned = useMemo(() => (data || []).filter((m) => m.is_pinned && !m.parent_id), [data]);

  // Same query/key the Composer's @mention picker already uses (React
  // Query dedupes the request across the two mount points) — needed here
  // too so a rendered "@Full Name" span can be resolved back to a user id
  // to make it clickable, the same way clicking a message author's name
  // already opens their profile.
  const { data: mentionable = [] } = useQuery<{ id: string; first_name: string; last_name: string }[]>({
    queryKey: ['portal', 'mentionable-users', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MENTIONABLE_USERS(projectId)),
    select: (r: any) => r?.payload || [],
  });
  const mentionMap = new Map(
    mentionable.map((u) => [[u.first_name, u.last_name].filter(Boolean).join(' ').trim().toLowerCase(), u.id])
  );
  if (user?.id && !mentionMap.has([user.first_name, user.last_name].filter(Boolean).join(' ').trim().toLowerCase())) {
    mentionMap.set([user.first_name, user.last_name].filter(Boolean).join(' ').trim().toLowerCase(), user.id);
  }

  // Opening a project (or a new message arriving) should land on the most
  // RECENT message, same as any normal chat — not the oldest one just
  // because that's first in the array. Skipped entirely when a deep-linked
  // message id is present (?message=:id) — that scroll-to-target below
  // takes priority and shouldn't be immediately overridden by this one.
  useEffect(() => {
    if (highlightMessageId || isLoading) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isLoading, data?.length, highlightMessageId]);

  // Opening this tab marks the thread read up to now; also refresh the
  // dashboard's unread badge so it drops immediately rather than on next
  // full reload.
  useEffect(() => {
    apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES_READ(projectId), { method: 'POST' })
      .then(() => qc.invalidateQueries({ queryKey: ['portal', 'unread-counts'] }))
      .catch(() => {});
  }, [projectId, qc]);

  // Typing + who's-viewing presence for this project Communication tab.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('project:viewing:start', { projectId });
    const onTyping = (payload: {
      projectId?: string;
      userId: string;
      first_name?: string | null;
      last_name?: string | null;
      typing: boolean;
    }) => {
      if (payload.projectId && payload.projectId !== projectId) return;
      if (payload.userId === user?.id) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (payload.typing) next.set(payload.userId, { first_name: payload.first_name ?? null, last_name: payload.last_name ?? null });
        else next.delete(payload.userId);
        return next;
      });
    };
    const onViewing = (payload: {
      projectId?: string;
      userId: string;
      first_name?: string | null;
      last_name?: string | null;
      viewing: boolean;
    }) => {
      if (payload.projectId && payload.projectId !== projectId) return;
      if (payload.userId === user?.id) return;
      setViewingUsers((prev) => {
        const next = new Map(prev);
        const wasKnown = next.has(payload.userId);
        if (payload.viewing) next.set(payload.userId, { first_name: payload.first_name ?? null, last_name: payload.last_name ?? null });
        else next.delete(payload.userId);
        // Handshake so a newly joined viewer learns who was already here.
        if (payload.viewing && !wasKnown) {
          socket.emit('project:viewing:start', { projectId });
        }
        return next;
      });
    };
    socket.on('project:typing:update', onTyping);
    socket.on('project:viewing:update', onViewing);
    return () => {
      socket.emit('project:viewing:stop', { projectId });
      socket.emit('project:typing:stop', { projectId });
      socket.off('project:typing:update', onTyping);
      socket.off('project:viewing:update', onViewing);
      setTypingUsers(new Map());
      setViewingUsers(new Map());
    };
  }, [projectId, user?.id]);

  const typingLabel = formatTypingLabel(Array.from(typingUsers.values()));
  const viewingList = Array.from(viewingUsers.values()).map(presenceLabel);

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
    const handleNewMessage = (message: PortalMessage & { project_id?: string; user_id?: string }) => {
      if (message.project_id && message.project_id !== projectId) return;
      const authorId = message.user?.id || message.user_id;
      if (authorId) {
        setTypingUsers((prev) => {
          if (!prev.has(authorId)) return prev;
          const next = new Map(prev);
          next.delete(authorId);
          return next;
        });
      }
      qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] });
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES_READ(projectId), { method: 'POST' })
        .then(() => qc.invalidateQueries({ queryKey: ['portal', 'unread-counts'] }))
        .catch(() => {});
    };
    // Edits/deletes (from any source — another tab, another participant)
    // just need a refetch; no unread-count implications either way.
    const handleChanged = (payload: { project_id?: string }) => {
      if (payload.project_id && payload.project_id !== projectId) return;
      qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] });
    };
    socket.on('project:message:new', handleNewMessage);
    socket.on('project:message:updated', handleChanged);
    socket.on('project:message:deleted', handleChanged);
    return () => {
      socket.off('project:message:new', handleNewMessage);
      socket.off('project:message:updated', handleChanged);
      socket.off('project:message:deleted', handleChanged);
    };
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
    <div className="h-full flex flex-col gap-4 bg-white">
      {pinned.length > 0 && (
        <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-800 mb-1.5">
            <Pin size={12} fill="currentColor" /> Pinned
          </div>
          <div className="flex flex-col gap-1.5">
            {pinned.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`portal-message-${p.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el?.classList.add('ring-2', 'ring-amber-400');
                  window.setTimeout(() => el?.classList.remove('ring-2', 'ring-amber-400'), 2000);
                }}
                className="text-left px-2 py-1.5 rounded-lg hover:bg-amber-100/80 transition-colors"
              >
                <span className="text-xs font-semibold text-(--color-text-primary)">
                  {senderName(p)}
                </span>
                <span className="block text-[13px] text-(--color-text-secondary) truncate">
                  {p.content?.replace(/\s+/g, ' ').trim() || '(attachment)'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-4 pr-1 bg-white">
        {roots.length === 0 && (
          <p className="text-sm text-(--color-text-secondary) py-10 text-center">No messages yet.</p>
        )}
        {roots.map((root, i) => {
          const replies = repliesByRoot.get(root.id) || [];
          const targetIsInThisThread = !!highlightMessageId && (root.id === highlightMessageId || replies.some((r) => r.id === highlightMessageId));
          const prev = i > 0 ? roots[i - 1] : null;
          const showDateDivider = !prev || dayKey(prev.created_at) !== dayKey(root.created_at);
          const watermarkMs = effectiveUnreadSince ? new Date(effectiveUnreadSince).getTime() : 0;
          const rootIsUnread = !!user?.id && root.user?.id !== user.id && new Date(root.created_at).getTime() > watermarkMs;
          const prevWasRead = !prev || !user?.id || prev.user?.id === user.id || new Date(prev.created_at).getTime() <= watermarkMs;
          const showUnreadDivider = rootIsUnread && prevWasRead && watermarkMs > 0;
          return (
            <React.Fragment key={root.id}>
              {showDateDivider && <DateDivider iso={root.created_at} />}
              {showUnreadDivider && (
                <div className="flex items-center gap-3 py-1" role="separator" aria-label="New messages">
                  <div className="flex-1 h-px bg-primary-300" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-primary-600 shrink-0">New messages</span>
                  <div className="flex-1 h-px bg-primary-300" />
                </div>
              )}
              <Thread
                root={root}
                replies={replies}
                projectId={projectId}
                canCompose={canCompose}
                canDeleteAny={canDeleteAny}
                myUserId={user?.id}
                initiallyExpanded={targetIsInThisThread}
                onOpenProfile={setProfileUserId}
                mentionMap={mentionMap}
              />
            </React.Fragment>
          );
        })}
      </div>

      {canCompose && (
        <div className="shrink-0 flex flex-col gap-1.5">
          {(viewingList.length > 0 || typingLabel) && (
            <div className="flex items-center justify-between gap-3 px-1 min-h-[18px] text-[12px] text-(--color-text-secondary)">
              <span className="truncate">
                {viewingList.length > 0
                  ? viewingList.length === 1
                    ? `${viewingList[0]} is here`
                    : viewingList.length <= 3
                      ? `${viewingList.join(', ')} are here`
                      : `${viewingList.slice(0, 2).join(', ')} +${viewingList.length - 2} are here`
                  : null}
              </span>
              <span className="truncate italic shrink-0">{typingLabel}</span>
            </div>
          )}
          <Composer projectId={projectId} onSent={() => {}} />
        </div>
      )}
      {!canCompose && typingLabel && (
        <p className="shrink-0 text-[12px] italic text-(--color-text-secondary) px-1">{typingLabel}</p>
      )}

      {profileUserId && (
        <ProfileSidePanel projectId={projectId} userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </div>
  );
};

export default CommunicationTab;
