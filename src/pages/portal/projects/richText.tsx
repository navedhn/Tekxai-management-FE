import React from 'react';

// Markdown-lite renderer for Communication messages — same "small curated
// subset" philosophy already used elsewhere in this app for rendered
// content (bold/italic/code/bullets), not a full WYSIWYG editor. Compose
// side wraps selected text with the matching markers (see the toolbar in
// CommunicationTab.tsx); this only ever renders plain text markers back
// out, it never touches raw HTML.
//
// Supported inline: **bold**, *italic*, `code`. Supported block: a line
// starting with "- " or "* " groups into a bullet list; everything else is
// a paragraph, blank lines separate paragraphs. @Mentions (one or two
// capitalized words after @, matching how the mention picker inserts them)
// are highlighted regardless of block type.

const INLINE_RE = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(@[A-Z][a-zA-Z'-]*(?:\s[A-Z][a-zA-Z'-]*)?)/g;

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
    if (match[1]) nodes.push(<strong key={key}>{match[2]}</strong>);
    else if (match[3]) nodes.push(<em key={key}>{match[4]}</em>);
    else if (match[5]) nodes.push(<code key={key} className="px-1 py-0.5 rounded bg-(--color-elevated) text-[0.9em]">{match[6]}</code>);
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
            className="font-semibold text-primary-600 hover:underline cursor-pointer"
          >
            {match[7]}
          </button>
        );
      } else {
        nodes.push(<span key={key} className="font-semibold text-primary-600">{match[7]}</span>);
      }
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

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
    if (line.trim() === '') {
      blocks.push(<br key={`br-${idx}`} />);
    } else {
      blocks.push(<span key={`ln-${idx}`}>{renderInline(line, `ln-${idx}`, mentionMap, onMentionClick)}<br /></span>);
    }
  });
  flushBullets('ul-end');

  return <p className={className}>{blocks}</p>;
};
