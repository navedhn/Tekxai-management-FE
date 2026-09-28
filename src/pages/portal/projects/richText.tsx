import React from 'react';
import { cn } from '@/utils/cn';

// Markdown-lite renderer for Communication messages — same "small curated
// subset" philosophy already used elsewhere in this app for rendered
// content (bold/italic/code/bullets), not a full WYSIWYG editor. Compose
// side wraps selected text with the matching markers (see the toolbar in
// CommunicationTab.tsx); this only ever renders plain text markers back
// out, it never touches raw HTML.
//
// Supported inline: **bold**, *italic*, `code`, bare URLs (auto-linked).
// Supported block: "# ", "## ", "### " (up to six #) make a bold heading,
// ChatGPT-style; a line starting with "- " or "* " groups into a bullet
// list; everything else is a paragraph, blank lines separate paragraphs.
// @Mentions (one or two capitalized words after @, matching how the
// mention picker inserts them) are highlighted regardless of block type.
//
// No [text](url) markdown-link syntax — pasting rich text (Google Docs,
// Notion, etc.) into the composer's plain <textarea> already strips that
// kind of markup down to plain text before it's ever typed, so a message's
// stored content never actually contains it; only the auto-link pass below
// can recover anything clickable from a paste like that.

const INLINE_RE = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(@[A-Z][a-zA-Z'-]*(?:\s[A-Z][a-zA-Z'-]*)?)|(https?:\/\/[^\s<>()"']+)/g;

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
    else if (match[7]) {
      // Mentions are stored as plain "@Name Name" text, not an id — resolve
      // the display name back to a user id via the project's mentionable
      // roster (built by the caller) so clicking one opens that person's
      // profile, same as clicking a message author's name already does.
      // A name that no longer resolves (renamed/removed user) just falls
      // back to plain styled text instead of a dead button.
      const mentionedId = mentionMap?.get(match[7].slice(1).toLowerCase());
      if (mentionedId && onMentionClick) {
        nodes.push(
          <button
            key={key}
            type="button"
            onClick={() => onMentionClick(mentionedId)}
            className="font-semibold text-primary-600 hover:underline cursor-pointer [font-family:var(--font-communication-sans)]!"
          >
            {match[7]}
          </button>
        );
      } else {
        nodes.push(<span key={key} className="font-semibold text-primary-600 [font-family:var(--font-communication-sans)]!">{match[7]}</span>);
      }
    } else if (match[8]) {
      // Trailing punctuation (.,;:) commonly ends up glued to a bare URL
      // when someone types/pastes it at the end of a sentence — strip it
      // from the link itself so it doesn't 404, but keep it in the text.
      const urlMatch = /^(.*?)([.,;:]+)$/.exec(match[8]);
      const url = urlMatch ? urlMatch[1] : match[8];
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

// Heading sizes relative to the message text; everything past ### is just bold.
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

  const flushBullets = (key: string) => {
    if (!bulletBuffer.length) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 my-1 space-y-0.5">
        {bulletBuffer.map((line, i) => <li key={i}>{renderInline(line, `${key}-${i}`, mentionMap, onMentionClick)}</li>)}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, idx) => {
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
      return;
    }
    flushBullets(`ul-${idx}`);
    // Block-level <span>s, not <h1>-<h6>: everything renders inside one <p>,
    // which can't legally contain heading elements.
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

  // The important modifier is required here: a global, unlayered
  // `p, span { font-family: 'Inter' }` rule in index.css always wins over
  // any Tailwind @layer utility regardless of specificity (unlayered CSS
  // beats layered CSS per the cascade spec, layer order notwithstanding).
  return <p className={cn('[font-family:var(--font-communication-sans)]!', className)}>{blocks}</p>;
};
