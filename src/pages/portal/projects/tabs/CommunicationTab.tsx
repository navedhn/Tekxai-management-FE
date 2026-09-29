import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, FileText, X, Smile, Reply, Bold, Italic, Code, Link2, Loader2, ChevronDown, ChevronRight, Pencil, Trash2, Check, Copy, Pin, Link as LinkIcon, Bookmark, BarChart3, XCircle, MoreHorizontal, Type, MessageSquare } from 'lucide-react';
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
import { PortalMessage, PortalMessageEdit, PortalMessageRead, PortalPoll, messageAttachments } from '../types';
import ProfileSidePanel from '../ProfileSidePanel';
import MentionTextarea, { extractMentionIds, useMentionableUsers } from '../MentionTextarea';

// Small curated set for the one-click "quick react" row — the full picker
// (search + categories) is still reachable via the Smile "+" button for anything
// else, same two-tier pattern the internal chat already uses.
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🙏', '👀'];

function draftStorageKey(userId: string, projectId: string, parentId?: string) {
  return `portal-draft:${userId}:${projectId}:${parentId || 'root'}`;
}

function readDraft(userId: string | undefined, projectId: string, parentId?: string): string {
  if (!userId || typeof localStorage === 'undefined') return '';
  try { return localStorage.getItem(draftStorageKey(userId, projectId, parentId)) || ''; } catch { return ''; }
}

function writeDraft(userId: string | undefined, projectId: string, parentId: string | undefined, value: string) {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    const key = draftStorageKey(userId, projectId, parentId);
    if (!value.trim()) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* ignore quota */ }
}

function clearDraft(userId: string | undefined, projectId: string, parentId?: string) {
  if (!userId || typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(draftStorageKey(userId, projectId, parentId)); } catch { /* ignore */ }
}

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

// Inserts markdown [label](url) via an inline URL field (no window.prompt — broken on mobile).
function insertLinkMarkdown(el: HTMLTextAreaElement, value: string, setValue: (v: string) => void, url: string) {
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
    className="flex items-center justify-center h-9 w-9 sm:h-8 sm:w-8 rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary) disabled:opacity-40 disabled:hover:bg-transparent"
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
  const { user } = useAuth();
  const [content, setContent] = useState(() => readDraft(user?.id, projectId, parentId));
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFormatTools, setShowFormatTools] = useState(false);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();
  const toast = useToastContext();

  const mentionable = useMentionableUsers(projectId);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarsePointer(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  // Persist draft per user+project (+ thread parent) — restore on mount above.
  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => writeDraft(user?.id, projectId, parentId, content), 300);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [content, user?.id, projectId, parentId]);

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

  const tryHandleSlash = async (raw: string): Promise<boolean> => {
    if (!raw.startsWith('/')) return false;
    const [command, ...rest] = raw.slice(1).split(/\s+/);
    if (command !== 'poll') {
      toast?.error?.(`Unknown command "/${command}". Try /poll Question? | Option 1 | Option 2`);
      return true;
    }
    const body = rest.join(' ');
    const parts = body.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      toast?.error?.('Usage: /poll Question? | Option 1 | Option 2');
      return true;
    }
    const [question, ...options] = parts;
    setSending(true);
    try {
      await apiRequest<any>(API_ENDPOINTS.PORTAL.POLLS(projectId), {
        method: 'POST',
        body: JSON.stringify({ question, options }),
      });
      setContent('');
      clearDraft(user?.id, projectId, parentId);
      onSent();
    } catch {
      toast?.error?.('Failed to create poll');
    } finally {
      setSending(false);
      qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] });
    }
    return true;
  };

  // Text, mentions and every picked file go out as ONE message.
  const handleSend = async () => {
    if (!content.trim() && !pendingAttachments.length) return;
    const trimmed = content.trim();
    if (trimmed.startsWith('/') && !pendingAttachments.length) {
      stopTyping();
      await tryHandleSlash(trimmed);
      return;
    }
    const mentions = extractMentionIds(content, mentionable);
    stopTyping();
    setSending(true);
    try {
      await postMessage({
        content: trimmed,
        ...(parentId ? { parent_id: parentId } : {}),
        ...(mentions.length ? { mentions } : {}),
        ...(pendingAttachments.length ? { attachments: pendingAttachments } : {}),
      });
      setContent('');
      setPendingAttachments([]);
      clearDraft(user?.id, projectId, parentId);
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
  const handleLink = () => setLinkDraft('https://');
  const applyLink = () => {
    const el = textareaRef.current;
    const url = linkDraft?.trim();
    if (!el || !url || url === 'https://') {
      setLinkDraft(null);
      return;
    }
    insertLinkMarkdown(el, content, setContent, url);
    setLinkDraft(null);
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
      <div className="flex items-stretch rounded-2xl border border-(--color-border) bg-(--color-surface) focus-within:border-primary-400 transition-colors overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col px-2 sm:px-3 pt-2 pb-2">
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
            {/* Mobile: collapse markdown tools behind Aa; always show attach + emoji + send. */}
            <ToolbarButton
              title={showFormatTools ? 'Hide formatting' : 'Formatting'}
              onClick={() => setShowFormatTools((v) => !v)}
            >
              <Type size={16} />
            </ToolbarButton>
            <div className={cn('items-center gap-0.5 sm:gap-1', showFormatTools ? 'flex' : 'hidden sm:flex')}>
              <ToolbarButton title="Bold" onClick={handleBold}><Bold size={16} /></ToolbarButton>
              <ToolbarButton title="Italic" onClick={handleItalic}><Italic size={16} /></ToolbarButton>
              <ToolbarButton title="Code" onClick={handleCode}><Code size={16} /></ToolbarButton>
              <ToolbarButton title="Insert link" onClick={handleLink}><Link2 size={16} /></ToolbarButton>
            </div>
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
                className="flex items-center justify-center h-9 w-9 sm:h-8 sm:w-8 rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary)"
              >
                <Smile size={16} />
              </button>
              {showEmojiPicker && (
                <EmojiPicker onSelect={(emoji) => setContent((c) => c + emoji)} onClose={() => setShowEmojiPicker(false)} />
              )}
            </div>
          </div>

          {linkDraft !== null && (
            <div className="flex items-center gap-2 mt-1.5 mb-1">
              <input
                type="url"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                  if (e.key === 'Escape') setLinkDraft(null);
                }}
                placeholder="https://…"
                autoFocus
                className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-(--color-border) text-sm bg-(--color-surface) focus:outline-none focus:border-primary-400"
              />
              <button type="button" onClick={applyLink} className="h-10 px-3 rounded-lg bg-primary-600 text-white text-xs font-bold shrink-0">
                Add
              </button>
              <button type="button" onClick={() => setLinkDraft(null)} className="h-10 w-10 flex items-center justify-center rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover) shrink-0" aria-label="Cancel link">
                <X size={16} />
              </button>
            </div>
          )}

          <MentionTextarea
            ref={textareaRef}
            projectId={projectId}
            className={composerInputCls}
            placeholder="Write a message"
            value={content}
            onChange={(v) => {
              setContent(v);
              if (v.trim()) emitTyping();
              else stopTyping();
            }}
            onPaste={handlePaste}
            onSubmit={() => { if (!sending && !uploading) void handleSend(); }}
            submitOnEnter={!coarsePointer}
            autoFocus={autoFocus}
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />
        </div>

        <div className="flex items-center pl-2 pr-2 sm:pl-3 sm:pr-3 my-3 border-l border-(--color-border) shrink-0">
          <button
            onClick={handleSend}
            disabled={(!content.trim() && !pendingAttachments.length) || sending || uploading}
            title={coarsePointer ? 'Send' : 'Send (Enter)'}
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

// ── Poll card (mirrors internal chat PollCard, portal endpoints) ───────────

const PollCard: React.FC<{
  poll: PortalPoll;
  projectId: string;
  currentUserId?: string;
  canClose?: boolean;
}> = ({ poll, projectId, currentUserId, canClose }) => {
  const qc = useQueryClient();
  const toast = useToastContext();

  const voteMutation = useMutation({
    mutationFn: (option_index: number) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.POLL_VOTE(projectId, poll.id), {
        method: 'POST',
        body: JSON.stringify({ option_index }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] }),
    onError: (e: any) => toast?.error?.(e?.message || 'Failed to vote'),
  });

  const closeMutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.POLL_CLOSE(projectId, poll.id), { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] }),
    onError: (e: any) => toast?.error?.(e?.message || 'Failed to close poll'),
  });

  const myVote = poll.votes.find((v) => v.user_id === currentUserId);
  const totalVotes = poll.votes.length;
  const showClose = !poll.is_closed && (poll.created_by_id === currentUserId || canClose);

  return (
    <div className="w-64 bg-white border border-(--color-border) rounded-xl p-3 mt-1">
      <p className="flex items-center gap-1.5 text-[10px] font-bold text-(--color-text-secondary) uppercase tracking-wide mb-2">
        <BarChart3 size={11} />
        {poll.is_closed ? 'Poll · Closed' : 'Poll'}
      </p>
      <p className="text-sm font-bold text-(--color-text-primary) mb-2">{poll.question}</p>
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
                mine ? 'border-primary-400 bg-primary-50' : 'border-(--color-border) hover:border-gray-300',
              )}
            >
              <div
                className={cn('absolute inset-y-0 left-0 transition-all', mine ? 'bg-primary-100' : 'bg-gray-100')}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className={cn('font-semibold truncate', mine ? 'text-primary-800' : 'text-(--color-text-primary)')}>
                  {mine && <Check size={11} className="inline mr-1 -mt-0.5" />}
                  {option}
                </span>
                <span className="shrink-0 text-(--color-text-secondary) font-bold">{count}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-(--color-text-secondary)">{totalVotes} vote{totalVotes === 1 ? '' : 's'}</p>
        {showClose && (
          <button
            onClick={() => closeMutation.mutate()}
            className="flex items-center gap-1 text-[10px] font-semibold text-(--color-text-secondary) hover:text-red-500"
          >
            <XCircle size={11} /> Close poll
          </button>
        )}
      </div>
    </div>
  );
};

const SeenByIndicator: React.FC<{ users: PortalMessageRead['user'][] }> = ({ users }) => {
  const [open, setOpen] = useState(false);
  if (!users.length) return null;
  return (
    <div
      className="relative mt-1"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center -space-x-1.5"
        title={users.map((u) => `${u.first_name} ${u.last_name}`).join(', ')}
      >
        {users.slice(0, 3).map((u) => (
          <span key={u.id} className="ring-2 ring-white rounded-full">
            {u.avatar ? (
              <img src={u.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="h-5 w-5 rounded-full bg-primary-100 text-primary-700 text-[8px] font-black flex items-center justify-center">
                {(u.first_name || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
        ))}
        {users.length > 3 && (
          <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[8px] font-black flex items-center justify-center ring-2 ring-white">
            +{users.length - 3}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 w-52 bg-white rounded-xl shadow-lg border border-(--color-border) py-1.5 z-20">
          <p className="text-[10px] font-black uppercase tracking-widest text-(--color-text-secondary) px-3 pb-1">Seen by</p>
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-2 px-3 py-1.5">
              {u.avatar ? (
                <img src={u.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center">
                  {(u.first_name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="text-xs font-semibold text-(--color-text-primary) truncate">{u.first_name} {u.last_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EditHistoryModal: React.FC<{
  projectId: string;
  messageId: string;
  onClose: () => void;
}> = ({ projectId, messageId, onClose }) => {
  const { data: edits = [], isLoading } = useQuery<PortalMessageEdit[]>({
    queryKey: ['portal', 'message-edits', projectId, messageId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_EDITS(projectId, messageId));
      return r?.payload?.records || [];
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border)">
          <h3 className="font-black text-(--color-text-primary)">Edit history</h3>
          <button type="button" onClick={onClose} className="p-1.5 text-(--color-text-secondary) hover:bg-(--color-state-hover) rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : edits.length === 0 ? (
            <p className="text-sm text-(--color-text-secondary) py-8 text-center">No prior versions</p>
          ) : (
            edits.map((e) => (
              <div key={e.id} className="p-3 rounded-xl border border-(--color-border) bg-(--color-elevated)">
                <p className="text-[11px] text-(--color-text-secondary) mb-1">
                  {e.edited_by?.first_name} {e.edited_by?.last_name} · {new Date(e.created_at).toLocaleString()}
                </p>
                <p className="text-sm text-(--color-text-primary) whitespace-pre-wrap [overflow-wrap:anywhere]">{e.previous_content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const SavedMessagesPanel: React.FC<{
  projectId: string;
  onClose: () => void;
  onJump: (messageId: string) => void;
}> = ({ projectId, onClose, onJump }) => {
  const qc = useQueryClient();
  const { data: saved = [], isLoading } = useQuery<{ saved_at: string; message: PortalMessage }[]>({
    queryKey: ['portal', 'messages-saved', projectId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES_SAVED(projectId));
      return r?.payload?.records || [];
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (msgId: string) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_SAVE(projectId, msgId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages-saved', projectId] }),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border)">
          <h3 className="font-black text-(--color-text-primary) flex items-center gap-2">
            <Bookmark size={16} className="text-blue-500" /> Saved messages ({saved.length})
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-(--color-text-secondary) hover:bg-(--color-state-hover) rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : saved.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <Bookmark size={28} className="mb-2" />
              <p className="text-sm font-semibold text-(--color-text-secondary)">Nothing saved yet</p>
              <p className="text-xs text-gray-300">Bookmark a message from its hover menu</p>
            </div>
          ) : (
            saved.map(({ message, saved_at }) => (
              <button
                key={message.id}
                type="button"
                onClick={() => { onJump(message.id); onClose(); }}
                className="w-full text-left p-3 bg-(--color-elevated) rounded-xl border border-(--color-border) hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-(--color-text-primary)">{senderName(message)}</span>
                  <span className="ml-auto text-[10px] text-(--color-text-secondary) shrink-0">
                    {new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); unsaveMutation.mutate(message.id); }}
                    className="p-1 text-(--color-text-secondary) hover:text-red-500 rounded shrink-0"
                    title="Remove from Saved"
                  >
                    <X size={13} />
                  </span>
                </div>
                <p className="text-sm text-(--color-text-primary) line-clamp-3">
                  {message.content || <span className="italic text-(--color-text-secondary)">Attachment / poll</span>}
                </p>
                <p className="text-[10px] text-gray-300 mt-1">Saved {new Date(saved_at).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/** On narrow viewports, message actions use a bottom sheet instead of an in-thread dropdown. */
function useMobileMessageActionsSheet() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return mobile;
}

const messageActionRowCls =
  'flex items-center gap-3 px-3 h-11 w-full rounded-xl text-sm font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover) text-left';

// ── One message bubble (used for both root messages and thread replies) ────

const MessageBubble: React.FC<{
  message: PortalMessage;
  projectId: string;
  canCompose: boolean;
  canDeleteAny?: boolean;
  myUserId?: string;
  isSaved?: boolean;
  seenBy?: PortalMessageRead['user'][];
  onReply: () => void;
  onOpenProfile: (userId: string) => void;
  mentionMap: Map<string, string>;
}> = ({ message: m, projectId, canCompose, canDeleteAny, myUserId, isSaved, seenBy, onReply, onOpenProfile, mentionMap }) => {
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(m.content);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState('attachment');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [morePos, setMorePos] = useState<{ top: number; right: number } | null>(null);
  const mobileActionsSheet = useMobileMessageActionsSheet();
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const qc = useQueryClient();
  const toast = useToastContext();
  const isOwn = m.user?.id === myUserId;
  const isRoot = !m.parent_id;

  const closeActions = () => {
    setActionsOpen(false);
    setMoreOpen(false);
    setReactionPickerOpen(false);
    setShowFullEmojiPicker(false);
  };

  useEffect(() => {
    if ((!actionsOpen && !moreOpen) || (!mobileActionsSheet && !moreOpen)) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeActions(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actionsOpen, moreOpen, mobileActionsSheet]);

  useEffect(() => {
    if (!moreOpen || !moreBtnRef.current) {
      setMorePos(null);
      return;
    }
    const place = () => {
      const r = moreBtnRef.current!.getBoundingClientRect();
      setMorePos({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [moreOpen]);

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

  const saveMessage = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_SAVE(projectId, m.id), {
        method: isSaved ? 'DELETE' : 'POST',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages-saved', projectId] }),
    onError: () => toast?.error?.(isSaved ? 'Failed to unsave' : 'Failed to save'),
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
    setShowFullEmojiPicker(false);
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
  const canCopy = !!(m.content && m.content.trim()) && !m.poll;
  // Always show the action strip — copy-link is available on every message.
  const showActions = !editing;
  const isEdited = !!(m.is_edited || (m.updated_at && m.updated_at !== m.created_at));

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

  const renderMessageActionItems = (onDone: () => void, opts?: { includeQuick?: boolean }) => (
    <>
      {opts?.includeQuick && canCompose && (
        <button
          type="button"
          onClick={() => {
            setReactionPickerOpen(true);
            setShowFullEmojiPicker(false);
          }}
          className={messageActionRowCls}
        >
          <Smile size={16} /> React
        </button>
      )}
      {opts?.includeQuick && canCompose && (
        <button
          type="button"
          onClick={() => { onReply(); onDone(); }}
          className={messageActionRowCls}
        >
          <Reply size={16} /> Reply
        </button>
      )}
      {opts?.includeQuick && canCompose && isRoot && (
        <button
          type="button"
          onClick={() => { pinMessage.mutate(); onDone(); }}
          disabled={pinMessage.isPending}
          className={cn(messageActionRowCls, 'disabled:opacity-50')}
        >
          <Pin size={16} fill={m.is_pinned ? 'currentColor' : 'none'} />
          {m.is_pinned ? 'Unpin' : 'Pin'}
        </button>
      )}
      {opts?.includeQuick && (
        <button
          type="button"
          onClick={() => { saveMessage.mutate(); onDone(); }}
          disabled={saveMessage.isPending}
          className={cn(messageActionRowCls, 'disabled:opacity-50')}
        >
          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved ? 'Unsave' : 'Save'}
        </button>
      )}
      {canCopy && (
        <button
          type="button"
          onClick={() => { void handleCopy(); onDone(); }}
          className={messageActionRowCls}
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy text'}
        </button>
      )}
      <button
        type="button"
        onClick={() => { void handleCopyLink(); onDone(); }}
        className={messageActionRowCls}
      >
        {linkCopied ? <Check size={16} className="text-emerald-600" /> : <LinkIcon size={16} />}
        {linkCopied ? 'Link copied' : 'Copy link'}
      </button>
      {isOwn && !m.poll && (
        <button
          type="button"
          onClick={() => { setEditing(true); onDone(); }}
          className={messageActionRowCls}
        >
          <Pencil size={16} /> Edit
        </button>
      )}
      {(isOwn || canDeleteAny) && (
        <button
          type="button"
          onClick={() => { handleDelete(); onDone(); }}
          disabled={deleteMessage.isPending}
          className={cn(messageActionRowCls, 'text-red-600 hover:bg-red-50 disabled:opacity-50')}
        >
          <Trash2 size={16} /> Delete
        </button>
      )}
    </>
  );

  const toolbarIconCls =
    'h-8 w-8 flex items-center justify-center rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary) transition-colors disabled:opacity-50';

  const reactionPickerRow = (
    <div className="flex items-center gap-1 p-2 rounded-xl border border-(--color-border) bg-(--color-elevated) mb-2">
      {QUICK_REACTIONS.map((e) => (
        <button key={e} type="button" onClick={() => { handleToggleReaction(e); closeActions(); }} className="text-lg h-10 w-10 flex items-center justify-center rounded-lg hover:bg-(--color-state-hover)">
          {e}
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowFullEmojiPicker((v) => !v)}
          className="h-10 w-10 flex items-center justify-center rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-amber-500"
          title="More reactions"
        >
          <Smile size={16} />
        </button>
        {showFullEmojiPicker && (
          <EmojiPicker
            align="right"
            onSelect={(emoji) => { handleToggleReaction(emoji); closeActions(); }}
            onClose={() => setShowFullEmojiPicker(false)}
          />
        )}
      </div>
    </div>
  );

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
            {isEdited && (
              <button
                type="button"
                onClick={() => setShowEditHistory(true)}
                className="italic ml-1 hover:underline hover:text-primary-600"
                title="View edit history"
              >
                (edited)
              </button>
            )}
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
        ) : m.poll ? (
          <PollCard
            poll={m.poll}
            projectId={projectId}
            currentUserId={myUserId}
            canClose={canDeleteAny}
          />
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

        {isOwn && seenBy && seenBy.length > 0 && <SeenByIndicator users={seenBy} />}
      </div>

      {showActions && !editing && (
        <>
          {/* Mobile: tap ⋯ → bottom sheet */}
          {mobileActionsSheet && (
            <div className="absolute top-1 right-2 z-10">
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(true);
                  setReactionPickerOpen(false);
                  setShowFullEmojiPicker(false);
                }}
                aria-label="Message actions"
                aria-expanded={actionsOpen}
                className="flex items-center justify-center h-9 w-9 rounded-lg border border-(--color-border) bg-(--color-surface) text-(--color-text-secondary) shadow-sm hover:bg-(--color-state-hover)"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          )}

          {/* Desktop: ClickUp-style hover toolbar */}
          {!mobileActionsSheet && (
            <div
              className={cn(
                'absolute -top-2 right-1 z-20 flex items-center gap-0.5 px-1 py-0.5 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-md',
                'opacity-0 pointer-events-none transition-opacity',
                'group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto',
                (moreOpen || showFullEmojiPicker) && 'opacity-100 pointer-events-auto'
              )}
            >
              {canCompose && (
                <>
                  {QUICK_REACTIONS.slice(0, 3).map((e) => (
                    <button
                      key={e}
                      type="button"
                      title={`React ${e}`}
                      onClick={() => handleToggleReaction(e)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-base hover:bg-(--color-state-hover)"
                    >
                      {e}
                    </button>
                  ))}
                  <div className="relative">
                    <button
                      type="button"
                      title="More reactions"
                      onClick={() => setShowFullEmojiPicker((v) => !v)}
                      className={toolbarIconCls}
                    >
                      <Smile size={16} />
                    </button>
                    {showFullEmojiPicker && (
                      <EmojiPicker
                        align="right"
                        onSelect={(emoji) => { handleToggleReaction(emoji); setShowFullEmojiPicker(false); }}
                        onClose={() => setShowFullEmojiPicker(false)}
                      />
                    )}
                  </div>
                  <span className="mx-0.5 h-5 w-px bg-(--color-border) shrink-0" aria-hidden />
                  <button type="button" title="Reply" onClick={() => onReply()} className={toolbarIconCls}>
                    <Reply size={16} />
                  </button>
                  {isRoot && (
                    <button
                      type="button"
                      title={m.is_pinned ? 'Unpin' : 'Pin'}
                      onClick={() => pinMessage.mutate()}
                      disabled={pinMessage.isPending}
                      className={toolbarIconCls}
                    >
                      <Pin size={16} fill={m.is_pinned ? 'currentColor' : 'none'} />
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                title={isSaved ? 'Unsave' : 'Save'}
                onClick={() => saveMessage.mutate()}
                disabled={saveMessage.isPending}
                className={cn(toolbarIconCls, isSaved && 'text-blue-600')}
              >
                <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                title={linkCopied ? 'Link copied' : 'Copy link'}
                onClick={() => { void handleCopyLink(); }}
                className={toolbarIconCls}
              >
                {linkCopied ? <Check size={16} className="text-emerald-600" /> : <LinkIcon size={16} />}
              </button>
              <button
                ref={moreBtnRef}
                type="button"
                title="More actions"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
                className={cn(toolbarIconCls, moreOpen && 'bg-(--color-state-hover) text-(--color-text-primary)')}
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          )}

          {moreOpen && morePos && typeof document !== 'undefined' && createPortal(
            <>
              <button type="button" className="fixed inset-0 z-[55] cursor-default" aria-label="Close actions" onClick={closeActions} />
              <div
                role="menu"
                className="fixed z-[56] flex flex-col min-w-[180px] max-h-[min(60vh,320px)] overflow-y-auto p-1 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg"
                style={{ top: morePos.top, right: morePos.right }}
              >
                {renderMessageActionItems(closeActions)}
              </div>
            </>,
            document.body,
          )}
        </>
      )}

      {showActions && actionsOpen && mobileActionsSheet && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close actions"
            onClick={closeActions}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Message actions"
            className="relative flex flex-col max-h-[min(70dvh,420px)] rounded-t-2xl border border-(--color-border) bg-(--color-surface) shadow-2xl pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-(--color-border) shrink-0">
              <span className="text-sm font-black text-(--color-text-primary)">Message actions</span>
              <button
                type="button"
                onClick={closeActions}
                aria-label="Close"
                className="h-10 w-10 flex items-center justify-center rounded-full text-(--color-text-secondary) hover:bg-(--color-state-hover)"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-0.5 p-2 overflow-y-auto">
              {reactionPickerOpen && reactionPickerRow}
              {renderMessageActionItems(closeActions, { includeQuick: true })}
            </div>
          </div>
        </div>,
        document.body,
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

      {showEditHistory && (
        <EditHistoryModal projectId={projectId} messageId={m.id} onClose={() => setShowEditHistory(false)} />
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
  savedIds?: Set<string>;
  seenByForMessageId?: string | null;
  seenByUsers?: PortalMessageRead['user'][];
  initiallyExpanded?: boolean;
  onOpenProfile: (userId: string) => void;
  mentionMap: Map<string, string>;
}> = ({ root, replies, projectId, canCompose, canDeleteAny, myUserId, savedIds, seenByForMessageId, seenByUsers, initiallyExpanded, onOpenProfile, mentionMap }) => {
  const [expanded, setExpanded] = useState(!!initiallyExpanded);
  const [replying, setReplying] = useState(false);

  const bubbleProps = { projectId, canCompose, canDeleteAny, myUserId, onOpenProfile, mentionMap };

  return (
    <div className="flex flex-col gap-2">
      <MessageBubble
        message={root}
        {...bubbleProps}
        isSaved={savedIds?.has(root.id)}
        seenBy={seenByForMessageId === root.id ? seenByUsers : undefined}
        onReply={() => { setExpanded(true); setReplying(true); }}
      />

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
            <MessageBubble
              key={r.id}
              message={r}
              {...bubbleProps}
              isSaved={savedIds?.has(r.id)}
              seenBy={seenByForMessageId === r.id ? seenByUsers : undefined}
              onReply={() => setReplying(true)}
            />
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

const CommunicationTab: React.FC<{
  projectId: string;
  /** When provided, Saved panel is controlled by the parent (e.g. tabs bar button). */
  savedPanelOpen?: boolean;
  onSavedPanelOpenChange?: (open: boolean) => void;
}> = ({ projectId, savedPanelOpen: savedPanelOpenProp, onSavedPanelOpenChange }) => {
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
  const toast = useToastContext();
  const missingMessageToastRef = useRef<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [internalSavedPanelOpen, setInternalSavedPanelOpen] = useState(false);
  const showSavedPanel = savedPanelOpenProp ?? internalSavedPanelOpen;
  const setShowSavedPanel = (open: boolean) => {
    onSavedPanelOpenChange?.(open);
    if (savedPanelOpenProp === undefined) setInternalSavedPanelOpen(open);
  };
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  // Keep the composer visible above the mobile soft keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 40 ? inset : 0);
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

  const [typingUsers, setTypingUsers] = useState<Map<string, { first_name: string | null; last_name: string | null }>>(new Map());
  const [viewingUsers, setViewingUsers] = useState<Map<string, { first_name: string | null; last_name: string | null }>>(new Map());
  const unreadSinceRef = useRef<{ projectId: string; at: string | null } | null>(null);
  const { data: messagesPayload, isLoading } = useQuery<{
    records: PortalMessage[];
    last_read_at: string | null;
    message_reads: PortalMessageRead[];
  }>({
    queryKey: ['portal', 'messages', projectId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES(projectId));
      return {
        records: r?.payload?.records || [],
        last_read_at: r?.payload?.last_read_at || null,
        message_reads: r?.payload?.message_reads || [],
      };
    },
  });
  const data = messagesPayload?.records;
  const messageReads = messagesPayload?.message_reads || [];
  // Capture last_read_at from the first successful fetch for this project so
  // the unread divider survives the subsequent mark-read call.
  if (messagesPayload && unreadSinceRef.current?.projectId !== projectId) {
    unreadSinceRef.current = { projectId, at: messagesPayload.last_read_at };
  }
  const effectiveUnreadSince = unreadSinceRef.current?.projectId === projectId
    ? unreadSinceRef.current.at
    : null;

  const { data: savedEntries = [] } = useQuery<{ saved_at: string; message: PortalMessage }[]>({
    queryKey: ['portal', 'messages-saved', projectId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES_SAVED(projectId));
      return r?.payload?.records || [];
    },
  });
  const savedIds = useMemo(() => new Set(savedEntries.map((s) => s.message.id)), [savedEntries]);

  const pinned = useMemo(() => (data || []).filter((m) => m.is_pinned && !m.parent_id), [data]);

  const lastOwnMsg = useMemo(() => {
    if (!user?.id || !data?.length) return null;
    for (let i = data.length - 1; i >= 0; i -= 1) {
      if (data[i].user?.id === user.id) return data[i];
    }
    return null;
  }, [data, user?.id]);

  const seenByUsers = useMemo(() => {
    if (!lastOwnMsg) return [];
    return messageReads
      .filter((r) => r.last_read_at && new Date(r.last_read_at) >= new Date(lastOwnMsg.created_at))
      .map((r) => r.user);
  }, [messageReads, lastOwnMsg]);

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
  // If the message was deleted or is out of the loaded window, surface a
  // clear toast instead of silently dumping the user at the bottom.
  useEffect(() => {
    if (!highlightMessageId || isLoading) return;
    const el = document.getElementById(`portal-message-${highlightMessageId}`);
    if (!el) {
      if (data && missingMessageToastRef.current !== highlightMessageId) {
        missingMessageToastRef.current = highlightMessageId;
        toast.info('That message is no longer available in this conversation.');
      }
      return;
    }
    missingMessageToastRef.current = null;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary-400', 'rounded-xl');
    const timer = setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400', 'rounded-xl'), 3000);
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
    <div className="h-full flex flex-col gap-3 sm:gap-4 bg-white min-h-0 overflow-hidden">
      {pinned.length > 0 && (
        <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 mx-1">
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
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-4 px-1 pr-1 bg-white">
        {roots.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            <MessageSquare size={36} className="text-(--color-text-secondary) opacity-50" strokeWidth={1.5} />
            <p className="font-bold text-sm text-(--color-text-primary)">Start the conversation</p>
            <p className="text-sm text-(--color-text-secondary) max-w-sm">
              Ask questions, share feedback, and keep project decisions in one place. Messages here are visible to you and the TekXAI team.
            </p>
          </div>
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
                savedIds={savedIds}
                seenByForMessageId={lastOwnMsg?.id || null}
                seenByUsers={seenByUsers}
                initiallyExpanded={targetIsInThisThread}
                onOpenProfile={setProfileUserId}
                mentionMap={mentionMap}
              />
            </React.Fragment>
          );
        })}
      </div>

      {canCompose && (
        <div
          className="shrink-0 flex flex-col gap-1.5 sticky bottom-0 z-10 bg-white pt-1 border-t border-(--color-border)/60 px-1"
          style={{
            paddingBottom: keyboardInset > 0
              ? `max(0.5rem, ${keyboardInset}px)`
              : 'max(0.5rem, env(safe-area-inset-bottom))',
          }}
        >
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
      {showSavedPanel && (
        <SavedMessagesPanel
          projectId={projectId}
          onClose={() => setShowSavedPanel(false)}
          onJump={(messageId) => {
            const el = document.getElementById(`portal-message-${messageId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.classList.add('ring-2', 'ring-primary-400');
            window.setTimeout(() => el?.classList.remove('ring-2', 'ring-primary-400'), 2000);
          }}
        />
      )}
    </div>
  );
};

export default CommunicationTab;
