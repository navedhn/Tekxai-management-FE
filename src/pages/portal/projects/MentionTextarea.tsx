import React, { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

export type MentionableUser = { id: string; first_name: string; last_name: string };

// Synthetic picker row — not a real user. Inserting it writes "@everyone "
// into the message; extractMentionIds expands that to every mentionable id.
export const EVERYONE_MENTION_ID = '__everyone__';
const EVERYONE_OPTION: MentionableUser = { id: EVERYONE_MENTION_ID, first_name: 'everyone', last_name: '' };

// A user's first_name/last_name can individually be null/empty (some portal
// accounts only ever captured a single full-name field) — never interpolate
// a null field directly, or it renders the literal "null" into the message.
export const mentionDisplayName = (u: MentionableUser) =>
  u.id === EVERYONE_MENTION_ID ? 'everyone' : [u.first_name, u.last_name].filter(Boolean).join(' ').trim();

export function useMentionableUsers(projectId: string) {
  const { data = [] } = useQuery<{ payload?: MentionableUser[] }, Error, MentionableUser[]>({
    queryKey: ['portal', 'mentionable-users', projectId],
    queryFn: () => apiRequest<{ payload?: MentionableUser[] }>(API_ENDPOINTS.PORTAL.MENTIONABLE_USERS(projectId)),
    select: (r) => (Array.isArray(r?.payload) ? r.payload : []),
    // Prior 500s left an empty list while @everyone still rendered from a
    // local synthetic row — always revalidate when the composer mounts so a
    // recovered API is picked up without waiting on the global 5m staleTime.
    staleTime: 30_000,
    refetchOnMount: 'always',
    retry: 2,
  });
  return data;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "@Full Name" for every mentionable user, longest names first so
// "@Muhammad Farhan" wins over a shorter "@Muhammad" at the same spot.
// "@everyone" is always included so the stored token highlights / extracts.
function mentionPattern(users: MentionableUser[]) {
  const names = ['everyone', ...users.map(mentionDisplayName).filter(Boolean)]
    .sort((a, b) => b.length - a.length);
  if (!names.length) return null;
  return new RegExp(`@(${names.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
}

const EVERYONE_IN_TEXT = /(?:^|[\s([{])@everyone(?![\p{L}\p{N}])/iu;

// The ids of everyone still @mentioned in the text — derived from the text
// itself, so deleting a mention while typing (or while editing an old
// message) drops it, and mentions already in a message being edited count.
// "@everyone" expands to every currently-mentionable user on the project.
export function extractMentionIds(text: string, users: MentionableUser[]): string[] {
  if (EVERYONE_IN_TEXT.test(text)) return users.map((u) => u.id);
  const pattern = mentionPattern(users);
  if (!pattern) return [];
  const byName = new Map(users.map((u) => [mentionDisplayName(u).toLowerCase(), u.id]));
  const ids = new Set<string>();
  for (const match of text.matchAll(pattern)) {
    const id = byName.get(match[1].toLowerCase());
    if (id && id !== EVERYONE_MENTION_ID) ids.add(id);
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
  /** When set: Enter sends (desktop). On touch, prefer false so Enter inserts a newline. */
  onSubmit?: () => void;
  /** Default true. When false, Enter inserts a newline instead of submitting. */
  submitOnEnter?: boolean;
};

// A textarea with the @mention picker and in-box highlighting of mentioned
// names. A textarea can't style part of its text, so a mirror layer with
// identical box metrics sits underneath it rendering the same text (names
// highlighted); the textarea's own text is transparent so only the caret,
// selection and placeholder come from it. Both must keep the same font,
// padding, border width and wrapping, or the highlight drifts.
const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ projectId, value, onChange, className, placeholder, autoFocus, style, onPaste, onSubmit, submitOnEnter = true }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const mentionable = useMentionableUsers(projectId);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    // Composer card uses overflow-hidden for rounded corners — absolute
    // bottom-full gets clipped. Portal + fixed coords escape that.
    const [pickerPos, setPickerPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

    const pattern = useMemo(() => mentionPattern(mentionable), [mentionable]);

    const filtered = useMemo(() => {
      if (mentionQuery === null) return [];
      const q = mentionQuery.toLowerCase();
      const people = mentionable.filter((u) => mentionDisplayName(u).toLowerCase().includes(q));
      const showEveryone = 'everyone'.startsWith(q);
      return showEveryone ? [EVERYONE_OPTION, ...people] : people;
    }, [mentionQuery, mentionable]);

    const pickerOpen = mentionQuery !== null && filtered.length > 0;

    useLayoutEffect(() => {
      if (!pickerOpen) {
        setPickerPos(null);
        return;
      }
      const update = () => {
        const el = textareaRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const gap = 6;
        const preferredHeight = 240;
        const spaceAbove = Math.max(80, rect.top - gap - 8);
        const maxHeight = Math.min(preferredHeight, spaceAbove);
        setPickerPos({
          top: rect.top - gap,
          left: rect.left,
          width: Math.max(256, Math.min(rect.width, 320)),
          maxHeight,
        });
      };
      update();
      window.addEventListener('resize', update);
      // Capture scroll from the messages pane / any ancestor.
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    }, [pickerOpen, filtered.length, value]);

    const updateQuery = (text: string, cursor: number) => {
      const match = /(?:^|\s)@([a-zA-Z]*)$/.exec(text.slice(0, cursor));
      setMentionQuery(match ? match[1] : null);
      setActiveIndex(0);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // #region agent log
      fetch('http://127.0.0.1:7689/ingest/5fe2d865-37c9-41e9-b868-d88ad2f9dbc6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d0293d'},body:JSON.stringify({sessionId:'d0293d',runId:'pre-fix',hypothesisId:'A',location:'MentionTextarea.tsx:handleChange',message:'controlled onChange',data:{prevLen:value.length,nextLen:e.target.value.length,isTrusted:e.isTrusted,inputType:(e.nativeEvent as InputEvent)?.inputType||null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      onChange(e.target.value);
      updateQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
    };

    const insertMention = (u: MentionableUser) => {
      const el = textareaRef.current;
      if (!el) return;
      const cursor = el.selectionStart ?? value.length;
      const label = mentionDisplayName(u);
      const before = value.slice(0, cursor).replace(/@([a-zA-Z]*)$/, `@${label} `);
      onChange(before + value.slice(cursor));
      setMentionQuery(null);
      window.requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = el.selectionEnd = before.length;
      });
    };

    const insertNewline = () => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = `${value.slice(0, start)}\n${value.slice(end)}`;
      onChange(next);
      window.requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = el.selectionEnd = start + 1;
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // #region agent log
      if (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y') {
        const el = textareaRef.current;
        fetch('http://127.0.0.1:7689/ingest/5fe2d865-37c9-41e9-b868-d88ad2f9dbc6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d0293d'},body:JSON.stringify({sessionId:'d0293d',runId:'pre-fix',hypothesisId:'B_D_E',location:'MentionTextarea.tsx:handleKeyDown',message:'composer keydown',data:{key:e.key,ctrl:e.ctrlKey,meta:e.metaKey,shift:e.shiftKey,defaultPrevented:e.defaultPrevented,mentionQueryOpen:mentionQuery!==null,filteredLen:filtered.length,activeTag:document.activeElement?.tagName||null,activeIsTextarea:document.activeElement===el,valueLen:value.length,selectionStart:el?.selectionStart??null},timestamp:Date.now()})}).catch(()=>{});
      }
      // #endregion
      if (mentionQuery !== null && filtered.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % filtered.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          insertMention(filtered[activeIndex] ?? filtered[0]);
          return;
        }
        if (e.key === 'Escape') {
          setMentionQuery(null);
          return;
        }
      }

      if (e.key !== 'Enter' || !onSubmit) return;
      // Touch / soft keyboards: Enter = newline; use the Send button instead.
      if (!submitOnEnter) {
        return;
      }
      // Enter sends; Ctrl/Cmd+Enter (and Shift+Enter) insert a newline.
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault();
        insertNewline();
        return;
      }
      e.preventDefault();
      onSubmit();
    };

    const syncScroll = () => {
      if (mirrorRef.current && textareaRef.current) mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    };

    const mirrorContent = useMemo(() => {
      // Same marker order as RichText: **bold** before *italic*, then @mentions
      // (including @everyone). Allow any number of Capitalized words so
      // "@Muhammad Muneeb Saleem" / "@The Sitter Co HQ" highlight in full.
      // Known-name pattern (longest first) decides the chip vs plain style.
      const combined = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(@everyone\b)|(@[A-Z][a-zA-Z'-]*(?:\s[A-Z][a-zA-Z'-]*)*)/g;
      const mentionRe = pattern;
      const parts: React.ReactNode[] = [];
      let last = 0;
      let i = 0;
      // #region agent log
      const mentionTokens: { token: string; words: number; isKnown: boolean }[] = [];
      const nameWordCounts = mentionable.map((u) => ({ name: mentionDisplayName(u), words: mentionDisplayName(u).split(/\s+/).filter(Boolean).length }));
      // #endregion
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
        } else if (match[5] || match[6]) {
          let token = match[5] || match[6];
          const isEveryone = !!match[5];
          let isKnown = isEveryone || !!mentionRe?.test(token);
          if (mentionRe) mentionRe.lastIndex = 0;
          // If greedy Title Case ate past a known name, shrink to the longest
          // mentionPattern hit and leave the rest as plain text.
          let remainder = '';
          if (!isEveryone && !isKnown && mentionRe && token) {
            const words = token.slice(1).split(/\s+/);
            for (let n = words.length - 1; n >= 1; n--) {
              const candidate = `@${words.slice(0, n).join(' ')}`;
              if (mentionRe.test(candidate)) {
                mentionRe.lastIndex = 0;
                remainder = words.slice(n).join(' ');
                token = candidate;
                isKnown = true;
                break;
              }
              mentionRe.lastIndex = 0;
            }
          }
          // #region agent log
          if (match[6]) mentionTokens.push({ token, words: token.slice(1).split(/\s+/).length, isKnown });
          // #endregion
          parts.push(
            isKnown
              ? <span key={key} className="rounded bg-primary-100 text-primary-700 [font-family:var(--font-communication-sans)]!">{token}</span>
              : <span key={key}>{token}</span>
          );
          if (remainder) parts.push(` ${remainder}`);
        }
        last = start + match[0].length;
      }
      // #region agent log
      if (mentionTokens.length) {
        fetch('http://127.0.0.1:7689/ingest/5fe2d865-37c9-41e9-b868-d88ad2f9dbc6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d0293d'},body:JSON.stringify({sessionId:'d0293d',runId:'mention-post',hypothesisId:'H1_H2_H3',location:'MentionTextarea.tsx:mirrorContent',message:'composer mention tokens vs known names',data:{mentionTokens,namesWith3PlusWords:nameWordCounts.filter((n)=>n.words>=3),patternSource:'multi-word-combined'},timestamp:Date.now()})}).catch(()=>{});
      }
      // #endregion
      parts.push(value.slice(last));
      return parts;
    }, [value, pattern, mentionable]);

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
          onBeforeInput={(e) => {
            // #region agent log
            const ne = e.nativeEvent as InputEvent;
            if (ne.inputType === 'historyUndo' || ne.inputType === 'historyRedo') {
              fetch('http://127.0.0.1:7689/ingest/5fe2d865-37c9-41e9-b868-d88ad2f9dbc6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d0293d'},body:JSON.stringify({sessionId:'d0293d',runId:'pre-fix',hypothesisId:'A_C',location:'MentionTextarea.tsx:onBeforeInput',message:'history beforeinput',data:{inputType:ne.inputType,defaultPrevented:e.defaultPrevented,valueLen:value.length},timestamp:Date.now()})}).catch(()=>{});
            }
            // #endregion
          }}
          onPaste={onPaste}
          onScroll={syncScroll}
          onClick={(e) => updateQuery(value, e.currentTarget.selectionStart ?? value.length)}
          autoFocus={autoFocus}
          style={style}
        />
        {pickerOpen && pickerPos && typeof document !== 'undefined' && createPortal(
          <div
            role="listbox"
            className="fixed z-[80] overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg"
            style={{
              top: pickerPos.top,
              left: pickerPos.left,
              width: pickerPos.width,
              maxHeight: pickerPos.maxHeight,
              transform: 'translateY(-100%)',
            }}
          >
            {filtered.map((u, i) => (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertMention(u)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 h-9 text-sm text-left',
                  i === activeIndex ? 'bg-(--color-state-hover)' : 'hover:bg-(--color-state-hover)'
                )}
              >
                <span className="h-6 w-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {u.id === EVERYONE_MENTION_ID ? '@' : (u.first_name?.[0]?.toUpperCase() ?? '?')}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="truncate font-semibold">
                    {u.id === EVERYONE_MENTION_ID ? 'everyone' : mentionDisplayName(u)}
                  </span>
                  {u.id === EVERYONE_MENTION_ID && (
                    <span className="text-[11px] text-(--color-text-secondary)">Notify everyone on this project</span>
                  )}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>
    );
  }
);
MentionTextarea.displayName = 'MentionTextarea';

export default MentionTextarea;
