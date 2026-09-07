import React from 'react';

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
      i++;
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

export function extractMentionedUserIds(content: string): string[] {
  const ids = new Set<string>();
  const re = new RegExp(MENTION_RE);
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    ids.add(m[2]);
  }
  return [...ids];
}
