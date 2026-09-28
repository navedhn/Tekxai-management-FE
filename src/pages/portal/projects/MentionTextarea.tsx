import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

export type MentionableUser = { id: string; first_name: string; last_name: string };

// A user's first_name/last_name can individually be null/empty (some portal
// accounts only ever captured a single full-name field) — never interpolate
// a null field directly, or it renders the literal "null" into the message.
export const mentionDisplayName = (u: MentionableUser) => [u.first_name, u.last_name].filter(Boolean).join(' ').trim();

export function useMentionableUsers(projectId: string) {
  const { data = [] } = useQuery<{ payload?: MentionableUser[] }, Error, MentionableUser[]>({
    queryKey: ['portal', 'mentionable-users', projectId],
    queryFn: () => apiRequest<{ payload?: MentionableUser[] }>(API_ENDPOINTS.PORTAL.MENTIONABLE_USERS(projectId)),
    select: (r) => r?.payload || [],
  });
  return data;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "@Full Name" for every mentionable user, longest names first so
// "@Muhammad Farhan" wins over a shorter "@Muhammad" at the same spot.
function mentionPattern(users: MentionableUser[]) {
  const names = users.map(mentionDisplayName).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length) return null;
  return new RegExp(`@(${names.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
}

// The ids of everyone still @mentioned in the text — derived from the text
// itself, so deleting a mention while typing (or while editing an old
// message) drops it, and mentions already in a message being edited count.
export function extractMentionIds(text: string, users: MentionableUser[]): string[] {
  const pattern = mentionPattern(users);
  if (!pattern) return [];
  const byName = new Map(users.map((u) => [mentionDisplayName(u).toLowerCase(), u.id]));
  const ids = new Set<string>();
  for (const match of text.matchAll(pattern)) {
    const id = byName.get(match[1].toLowerCase());
    if (id) ids.add(id);
  }
  return [...ids];
}

type Props = {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
};

// A textarea with the @mention picker and in-box highlighting of mentioned
// names. A textarea can't style part of its text, so a mirror layer with
// identical box metrics sits underneath it rendering the same text (names
// highlighted); the textarea's own text is transparent so only the caret,
// selection and placeholder come from it. Both must keep the same font,
// padding, border width and wrapping, or the highlight drifts.
const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ projectId, value, onChange, className, placeholder, autoFocus, style, onPaste }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const mentionable = useMentionableUsers(projectId);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const pattern = useMemo(() => mentionPattern(mentionable), [mentionable]);

    const filtered = mentionQuery !== null
      ? mentionable.filter((u) => mentionDisplayName(u).toLowerCase().includes(mentionQuery.toLowerCase()))
      : [];

    const updateQuery = (text: string, cursor: number) => {
      const match = /(?:^|\s)@([a-zA-Z]*)$/.exec(text.slice(0, cursor));
      setMentionQuery(match ? match[1] : null);
      setActiveIndex(0);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      updateQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
    };

    const insertMention = (u: MentionableUser) => {
      const el = textareaRef.current;
      if (!el) return;
      const cursor = el.selectionStart ?? value.length;
      const before = value.slice(0, cursor).replace(/@([a-zA-Z]*)$/, `@${mentionDisplayName(u)} `);
      onChange(before + value.slice(cursor));
      setMentionQuery(null);
      window.requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = el.selectionEnd = before.length;
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionQuery === null || filtered.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filtered[activeIndex] ?? filtered[0]);
      } else if (e.key === 'Escape') {
        setMentionQuery(null);
      }
    };

    const syncScroll = () => {
      if (mirrorRef.current && textareaRef.current) mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    };

    const mirrorContent = useMemo(() => {
      // Same marker order as RichText: **bold** before *italic*, then @mentions.
      // Markers stay in the mirror (dimmed) so caret/wrapping stay aligned with
      // the transparent textarea — never strip characters here.
      const combined = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(@[A-Z][a-zA-Z'-]*(?:\s[A-Z][a-zA-Z'-]*)?)/g;
      const mentionRe = pattern;
      const parts: React.ReactNode[] = [];
      let last = 0;
      let i = 0;
      for (const match of value.matchAll(combined)) {
        const start = match.index ?? 0;
        if (start > last) parts.push(value.slice(last, start));
        const key = `m-${i++}`;
        if (match[1]) {
          parts.push(
            <span key={key}>
              <span className="text-(--color-text-secondary)/35">**</span>
              <strong className="font-bold!">{match[2]}</strong>
              <span className="text-(--color-text-secondary)/35">**</span>
            </span>
          );
        } else if (match[3]) {
          parts.push(
            <span key={key}>
              <span className="text-(--color-text-secondary)/35">*</span>
              <em className="italic!">{match[4]}</em>
              <span className="text-(--color-text-secondary)/35">*</span>
            </span>
          );
        } else if (match[5]) {
          const isKnown = mentionRe?.test(match[5]);
          // matchAll + global regex advances lastIndex — reset after tests.
          if (mentionRe) mentionRe.lastIndex = 0;
          parts.push(
            isKnown
              ? <span key={key} className="rounded bg-primary-100 text-primary-700 [font-family:var(--font-communication-sans)]!">{match[5]}</span>
              : <span key={key}>{match[5]}</span>
          );
        }
        last = start + match[0].length;
      }
      parts.push(value.slice(last));
      return parts;
    }, [value, pattern]);

    // Mirror + textarea must share every box/font metric. The shared
    // communication-composer-input class locks font/letter-spacing, and
    // communication-mention-input keeps dark-mode from painting opaque
    // text on top of the mirror (see index.css).
    const sharedBoxCls = cn('communication-composer-input', className);

    return (
      <div className="relative">
        <div
          ref={mirrorRef}
          aria-hidden
          className={cn(sharedBoxCls, 'absolute inset-0 overflow-hidden whitespace-pre-wrap break-words pointer-events-none text-(--color-text-primary) [font-family:var(--font-communication-sans)]!')}
        >
          {mirrorContent}
          {/* a trailing newline in a textarea still takes a line */}
          {'\n'}
        </div>
        <textarea
          ref={textareaRef}
          className={cn(
            sharedBoxCls,
            'communication-mention-input relative block bg-transparent! text-transparent! caret-(--color-text-primary) placeholder:text-(--color-text-secondary)'
          )}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          onScroll={syncScroll}
          onClick={(e) => updateQuery(value, e.currentTarget.selectionStart ?? value.length)}
          autoFocus={autoFocus}
          style={style}
        />
        {mentionQuery !== null && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 z-20 w-64 max-h-48 overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg">
            {filtered.map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertMention(u)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 h-9 text-sm text-left',
                  i === activeIndex ? 'bg-(--color-state-hover)' : 'hover:bg-(--color-state-hover)'
                )}
              >
                <span className="h-6 w-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {u.first_name?.[0]?.toUpperCase() ?? '?'}
                </span>
                {mentionDisplayName(u)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);
MentionTextarea.displayName = 'MentionTextarea';

export default MentionTextarea;
