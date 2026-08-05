import React from 'react';

// Small hand-rolled renderer for the exact markdown-lite subset the
// composer's formatting toolbar and @-mention picker produce — not a full
// markdown library, deliberately: this only ever needs to round-trip what
// this app's own composer writes, not arbitrary external markdown.
//
// Supported inline: @[Name](user:ID) mentions, @here/@channel broadcasts,
// **bold**, *italic*, `code`.
// Supported block: ```fenced code blocks```, "- " bullet-list runs, plain
// paragraphs (newlines preserved as <br/>).

const MENTION_RE = /@\[([^\]]+)\]\(user:([^)]+)\)/g;
const INLINE_SPLIT_RE = /(@\[[^\]]+\]\(user:[^)]+\)|@(?:here|channel)\b|\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/gi;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text
    .split(INLINE_SPLIT_RE)
    .filter((p) => p !== '')
    .map((part, i) => {
      const key = `${keyPrefix}-${i}`;
      const mentionMatch = /^@\[([^\]]+)\]\(user:([^)]+)\)$/.exec(part);
      if (mentionMatch) {
        return (
          <span key={key} className="inline-block px-1 rounded bg-primary-50 text-primary-700 font-semibold">
            @{mentionMatch[1]}
          </span>
        );
      }
      // @here/@channel — a broadcast to everyone in the channel, distinct
      // (amber, not blue) from a personal @-mention.
      const broadcastMatch = /^@(here|channel)$/i.exec(part);
      if (broadcastMatch) {
        return (
          <span key={key} className="inline-block px-1 rounded bg-amber-100 text-amber-800 font-semibold">
            @{broadcastMatch[1].toLowerCase()}
          </span>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={key} className="px-1 py-0.5 rounded bg-gray-100 text-[13px] font-mono text-gray-800">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={key}>{part.slice(1, -1)}</em>;
      }
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
}

export function renderMessageContent(content: string): React.ReactNode {
  if (!content) return null;
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence (or EOF if unterminated — still renders what we have)
      blocks.push(
        <pre key={`b${blockKey++}`} className="my-1 px-3 py-2 rounded-lg bg-gray-900 text-gray-100 text-[13px] font-mono overflow-x-auto">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      const startKey = blockKey;
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`b${blockKey++}`} className="list-disc pl-5 my-0.5 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li${startKey}-${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    blocks.push(
      <React.Fragment key={`b${blockKey}`}>
        {renderInline(line, `p${blockKey}`)}
        {i < lines.length - 1 ? <br /> : null}
      </React.Fragment>
    );
    blockKey++;
    i++;
  }

  return blocks;
}

// Strips markdown/mention syntax down to plain text — for spots where
// formatting doesn't matter (sidebar "last message" preview line).
export function toPlainText(content: string): string {
  if (!content) return '';
  return content
    .replace(MENTION_RE, '@$1')
    .replace(/```([\s\S]*?)```/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*-\s+/gm, '')
    .trim();
}

// Extracts unique mentioned user ids from raw content. The draft text itself
// is the source of truth — the @-mention picker inserts these tokens
// directly, so there's no separately-tracked selection list to keep in sync.
export function extractMentionedUserIds(content: string): string[] {
  const ids = new Set<string>();
  const re = new RegExp(MENTION_RE);
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    ids.add(m[2]);
  }
  return [...ids];
}
