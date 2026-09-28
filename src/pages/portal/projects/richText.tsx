import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';

// Markdown-lite renderer for Communication messages — same "small curated
// subset" philosophy already used elsewhere in this app for rendered
// content (bold/italic/code/bullets), not a full WYSIWYG editor. Compose
// side wraps selected text with the matching markers (see the toolbar in
// CommunicationTab.tsx); this only ever renders plain text markers back
// out, it never touches raw HTML.
//
// Supported inline: **bold**, *italic*, `code`, ~~strike~~, [label](url),
// bare URLs (auto-linked).
// Supported block: "# ", "## ", "### " (up to six #) make a bold heading,
// ChatGPT-style; a line starting with "- " or "* " groups into a bullet
// list; "1. " numbered lists; everything else is a paragraph, blank lines
// separate paragraphs.
// @Mentions (one or two capitalized words after @, matching how the
// mention picker inserts them) are highlighted regardless of block type.

const INLINE_RE =
  /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(~~(.+?)~~)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(@everyone\b)|(@[A-Z][a-zA-Z'-]*(?:\s[A-Z][a-zA-Z'-]*)?)|(https?:\/\/[^\s<>()"']+)/g;

const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp|svg)(\?[#\w&=%-]*)?$/i;
const URL_COLLECT_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>()"']+)/g;

/** Unique http(s) URLs from message body, for link / image preview cards. */
export function extractMessageUrls(content: string, limit = 3): string[] {
  if (!content) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  URL_COLLECT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_COLLECT_RE.exec(content)) && out.length < limit) {
    const raw = match[2] || match[3];
    if (!raw) continue;
    const cleaned = raw.replace(/[.,;:]+$/, '');
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }
  return out;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function renderInline(
  text: string,
  keyPrefix: string,
  mentionMap?: Map<string, string>,
  onMentionClick?: (userId: string) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${i++}`;
    if (match[1]) nodes.push(<strong key={key} className="font-bold! [font-family:var(--font-communication-sans)]!">{match[2]}</strong>);
    else if (match[3]) nodes.push(<em key={key} className="italic! [font-family:var(--font-communication-sans)]!">{match[4]}</em>);
    else if (match[5]) nodes.push(<code key={key} className="px-1 py-0.5 rounded bg-(--color-elevated) text-[0.9em] [font-family:var(--font-communication-mono)]">{match[6]}</code>);
    else if (match[7]) nodes.push(<del key={key} className="text-(--color-text-secondary) [font-family:var(--font-communication-sans)]!">{match[8]}</del>);
    else if (match[9]) {
      nodes.push(
        <a
          key={key}
          href={match[11]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 underline hover:text-primary-700 break-all"
        >
          {match[10]}
        </a>
      );
    } else if (match[12]) {
      nodes.push(<span key={key} className="font-semibold text-primary-600 [font-family:var(--font-communication-sans)]!">{match[12]}</span>);
    } else if (match[13]) {
      const mentionedId = mentionMap?.get(match[13].slice(1).toLowerCase());
      if (mentionedId && onMentionClick) {
        nodes.push(
          <button
            key={key}
            type="button"
            onClick={() => onMentionClick(mentionedId)}
            className="font-semibold text-primary-600 hover:underline cursor-pointer [font-family:var(--font-communication-sans)]!"
          >
            {match[13]}
          </button>
        );
      } else {
        nodes.push(<span key={key} className="font-semibold text-primary-600 [font-family:var(--font-communication-sans)]!">{match[13]}</span>);
      }
    } else if (match[14]) {
      const urlMatch = /^(.*?)([.,;:]+)$/.exec(match[14]);
      const url = urlMatch ? urlMatch[1] : match[14];
      const trailing = urlMatch ? urlMatch[2] : '';
      nodes.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 underline hover:text-primary-700 break-all"
        >
          {url}
        </a>
      );
      if (trailing) nodes.push(trailing);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const HEADING_CLASSES = ['text-[1.25em]', 'text-[1.15em]', 'text-[1.05em]'];

export const RichText: React.FC<{
  content: string;
  className?: string;
  mentionMap?: Map<string, string>;
  onMentionClick?: (userId: string) => void;
}> = ({ content, className, mentionMap, onMentionClick }) => {
  if (!content) return null;
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let numberBuffer: string[] = [];

  const flushBullets = (key: string) => {
    if (!bulletBuffer.length) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 my-1 space-y-0.5">
        {bulletBuffer.map((line, i) => <li key={i}>{renderInline(line, `${key}-${i}`, mentionMap, onMentionClick)}</li>)}
      </ul>
    );
    bulletBuffer = [];
  };

  const flushNumbers = (key: string) => {
    if (!numberBuffer.length) return;
    blocks.push(
      <ol key={key} className="list-decimal pl-5 my-1 space-y-0.5">
        {numberBuffer.map((line, i) => <li key={i}>{renderInline(line, `${key}-${i}`, mentionMap, onMentionClick)}</li>)}
      </ol>
    );
    numberBuffer = [];
  };

  lines.forEach((line, idx) => {
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      flushNumbers(`ol-${idx}`);
      bulletBuffer.push(bulletMatch[1]);
      return;
    }
    const numberMatch = /^\d+\.\s+(.*)$/.exec(line);
    if (numberMatch) {
      flushBullets(`ul-${idx}`);
      numberBuffer.push(numberMatch[1]);
      return;
    }
    flushBullets(`ul-${idx}`);
    flushNumbers(`ol-${idx}`);
    const headingMatch = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(
        <span
          key={`h-${idx}`}
          role="heading"
          aria-level={level}
          className={cn('block font-bold! leading-snug mt-2 mb-0.5 first:mt-0 [font-family:var(--font-communication-sans)]!', HEADING_CLASSES[level - 1])}
        >
          {renderInline(headingMatch[2], `h-${idx}`, mentionMap, onMentionClick)}
        </span>
      );
      return;
    }
    if (line.trim() === '') {
      blocks.push(<br key={`br-${idx}`} />);
    } else {
      blocks.push(<span key={`ln-${idx}`} className="[font-family:var(--font-communication-sans)]!">{renderInline(line, `ln-${idx}`, mentionMap, onMentionClick)}<br /></span>);
    }
  });
  flushBullets('ul-end');
  flushNumbers('ol-end');

  return <div className={cn('[font-family:var(--font-communication-sans)]!', className)}>{blocks}</div>;
};

/** Hostname / image preview cards under a message (no OG scrape — URL fallback). */
export const MessageLinkPreviews: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  const urls = useMemo(() => extractMessageUrls(content), [content]);
  if (!urls.length) return null;

  return (
    <div className={cn('flex flex-col gap-1.5 mt-1.5', className)}>
      {urls.map((url) => {
        if (IMAGE_URL_RE.test(url)) {
          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-fit max-w-full overflow-hidden rounded-xl border border-(--color-border) bg-(--color-elevated)"
            >
              <img src={url} alt={hostnameOf(url)} className="max-h-52 max-w-full object-contain" loading="lazy" />
            </a>
          );
        }
        const host = hostnameOf(url);
        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-(--color-border) bg-(--color-elevated) hover:border-primary-300 transition-colors no-underline"
          >
            <ExternalLink size={14} className="shrink-0 mt-0.5 text-(--color-text-secondary)" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-(--color-text-secondary)">
                {host}
              </span>
              <span className="block text-[13px] text-primary-600 truncate">{url}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
};
