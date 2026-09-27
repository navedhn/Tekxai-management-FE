import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, FolderKanban, Flag, MessageSquare, FileText, Clock, CornerDownLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/utils/cn';

type ProjectRef = { id: string; title: string };
type SearchResponse = {
  query: string;
  projects: { id: string; title: string; status: string; client: { id: string; name: string } | null }[];
  milestones: { id: string; title: string; status: string; due_date: string | null; project: ProjectRef }[];
  messages: { id: string; snippet: string; created_at: string; project: ProjectRef; user: { first_name: string | null; last_name: string | null } | null }[];
  files: { source: 'communication' | 'file'; id: string; attachment_id: string | null; title: string; created_at: string; project: ProjectRef }[];
};

type Filter = 'all' | 'projects' | 'milestones' | 'messages' | 'files';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'projects', label: 'Projects' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'messages', label: 'Messages' },
  { id: 'files', label: 'Files' },
];

type Item = { key: string; group: Exclude<Filter, 'all'>; icon: LucideIcon; title: string; meta: string; to: string };

const GROUP_LABELS: Record<Item['group'], string> = { projects: 'Projects', milestones: 'Milestones', messages: 'Messages', files: 'Files' };
const MIN_QUERY = 2;
const RECENT_KEY = 'portal-search-recent';
const MAX_RECENT = 6;

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* storage blocked — recents are a convenience only */ }
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

// Bold every case-insensitive occurrence of the query, the way ClickUp
// marks why a result matched.
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  for (let at = text.toLowerCase().indexOf(lower); at !== -1; at = text.toLowerCase().indexOf(lower, from)) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(<mark key={at} className="bg-amber-100 text-inherit rounded-sm px-0.5">{text.slice(at, at + query.length)}</mark>);
    from = at + query.length;
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}

function toItems(data: SearchResponse | undefined): Item[] {
  if (!data) return [];
  const personName = (u: SearchResponse['messages'][number]['user']) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'Someone';
  return [
    ...data.projects.map((p) => ({
      key: `p-${p.id}`, group: 'projects' as const, icon: FolderKanban,
      title: p.title, meta: p.client?.name || 'Project', to: `/portal/projects/${p.id}`,
    })),
    ...data.milestones.map((m) => ({
      key: `m-${m.id}`, group: 'milestones' as const, icon: Flag,
      title: m.title, meta: `${m.project.title} · ${(m.status || '').replace(/_/g, ' ').toLowerCase()}`,
      to: `/portal/projects/${m.project.id}/milestones`,
    })),
    ...data.messages.map((m) => ({
      key: `c-${m.id}`, group: 'messages' as const, icon: MessageSquare,
      title: m.snippet, meta: `${personName(m.user)} in ${m.project.title} · ${formatDate(m.created_at)}`,
      to: `/portal/projects/${m.project.id}/communication?message=${m.id}`,
    })),
    ...data.files.map((f) => ({
      key: `f-${f.id}-${f.attachment_id ?? ''}`, group: 'files' as const, icon: FileText,
      title: f.title, meta: `${f.project.title} · ${f.source === 'file' ? 'Files' : 'Shared in chat'} · ${formatDate(f.created_at)}`,
      to: f.source === 'file'
        ? `/portal/projects/${f.project.id}/files`
        : `/portal/projects/${f.project.id}/communication?message=${f.id}`,
    })),
  ];
}

const SearchDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // The highlighted row resets to the first one whenever the query or
  // filter changes — tracked alongside the key it was chosen under rather
  // than reset from an effect.
  const [picked, setPicked] = useState({ key: '', index: 0 });
  const [recent, setRecent] = useState<string[]>(readRecent);
  const term = useDebounce(query.trim(), 250);
  const searching = term.length >= MIN_QUERY;

  const { data, isFetching } = useQuery<SearchResponse>({
    queryKey: ['portal', 'search', term],
    queryFn: () => apiRequest<{ payload: SearchResponse }>(API_ENDPOINTS.PORTAL.SEARCH(term)).then((r) => r?.payload),
    enabled: searching,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const allItems = useMemo(() => (searching ? toItems(data) : []), [data, searching]);
  const items = filter === 'all' ? allItems : allItems.filter((i) => i.group === filter);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allItems.length };
    for (const i of allItems) c[i.group] = (c[i.group] || 0) + 1;
    return c;
  }, [allItems]);

  const pickKey = `${term}\u0000${filter}`;
  const active = picked.key === pickKey ? picked.index : 0;
  const setActive = (update: (i: number) => number) => setPicked({ key: pickKey, index: update(active) });
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const open = (item: Item) => {
    saveRecent(term);
    onClose();
    navigate(item.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      open(items[active]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const idx = FILTERS.findIndex((f) => f.id === filter);
      setFilter(FILTERS[(idx + (e.shiftKey ? FILTERS.length - 1 : 1)) % FILTERS.length].id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 px-4 pt-[10vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="w-full max-w-2xl rounded-2xl border border-(--color-border) bg-(--color-surface) shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-(--color-border) shrink-0">
          <Search size={18} className="text-(--color-text-secondary) shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, milestones, messages and files"
            className="flex-1 min-w-0 bg-transparent text-[15px] text-(--color-text-primary) placeholder:text-(--color-text-secondary) outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="text-(--color-text-secondary) hover:text-(--color-text-primary)" title="Clear">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline text-[10px] font-semibold text-(--color-text-secondary) border border-(--color-border) rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="flex items-center gap-1 px-3 py-2 border-b border-(--color-border) overflow-x-auto shrink-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); inputRef.current?.focus(); }}
              className={cn(
                'px-2.5 h-7 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                filter === f.id ? 'bg-primary-50 text-primary-700' : 'text-(--color-text-secondary) hover:bg-(--color-state-hover)'
              )}
            >
              {f.label}
              {searching && counts[f.id] ? <span className="ml-1 opacity-60">{counts[f.id]}</span> : null}
            </button>
          ))}
        </div>

        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto py-2">
          {!searching && (
            recent.length > 0 ? (
              <div>
                <div className="flex items-center justify-between px-4 py-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-(--color-text-secondary)">Recent searches</span>
                  <button
                    onClick={() => { try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ } setRecent([]); }}
                    className="text-[11px] font-semibold text-(--color-text-secondary) hover:text-(--color-text-primary)"
                  >
                    Clear
                  </button>
                </div>
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setQuery(r); inputRef.current?.focus(); }}
                    className="w-full flex items-center gap-3 px-4 h-9 text-sm text-left text-(--color-text-primary) hover:bg-(--color-state-hover)"
                  >
                    <Clock size={14} className="text-(--color-text-secondary)" />
                    {r}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-(--color-text-secondary)">
                Type at least {MIN_QUERY} characters to search across your projects.
              </p>
            )
          )}

          {searching && !data && isFetching && (
            <p className="px-4 py-8 text-center text-sm text-(--color-text-secondary)">Searching…</p>
          )}

          {searching && data && items.length === 0 && !isFetching && (
            <p className="px-4 py-8 text-center text-sm text-(--color-text-secondary)">
              No results for “{term}”{filter !== 'all' ? ` in ${GROUP_LABELS[filter]}` : ''}.
            </p>
          )}

          {items.map((item, index) => {
            const header = index === 0 || items[index - 1].group !== item.group ? GROUP_LABELS[item.group] : null;
            const ItemIcon = item.icon;
            return (
              <React.Fragment key={item.key}>
                {header && (
                  <div className="px-4 pt-3 pb-1 text-[11px] font-black uppercase tracking-wide text-(--color-text-secondary)">{header}</div>
                )}
                <button
                  data-index={index}
                  onClick={() => open(item)}
                  onMouseMove={() => active !== index && setActive(() => index)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-left',
                    index === active ? 'bg-(--color-state-hover)' : ''
                  )}
                >
                  <span className="h-8 w-8 shrink-0 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                    <ItemIcon size={15} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-(--color-text-primary) truncate">
                      <Highlight text={item.title} query={term} />
                    </span>
                    <span className="block text-xs text-(--color-text-secondary) truncate">{item.meta}</span>
                  </span>
                  {index === active && <CornerDownLeft size={14} className="shrink-0 text-(--color-text-secondary)" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-4 h-9 border-t border-(--color-border) text-[11px] text-(--color-text-secondary) shrink-0">
          <span><kbd className="font-semibold">↑↓</kbd> navigate</span>
          <span><kbd className="font-semibold">Enter</kbd> open</span>
          <span><kbd className="font-semibold">Tab</kbd> switch filter</span>
        </div>
      </div>
    </div>
  );
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// Topbar search, like ClickUp's: a search box in the middle of the header
// that opens a command-palette style dialog, also on ⌘K / Ctrl+K from
// anywhere in the portal.
const PortalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 w-full max-w-md h-9 px-3 rounded-xl border border-(--color-border) bg-(--color-app-bg) text-sm text-(--color-text-secondary) hover:border-primary-300 hover:text-(--color-text-primary) transition-colors"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search</span>
        <kbd className="text-[10px] font-semibold border border-(--color-border) rounded px-1.5 py-0.5">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl text-(--color-text-secondary) hover:bg-(--color-state-hover)"
        title="Search"
      >
        <Search size={18} />
      </button>
      {open && createPortal(<SearchDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
};

export default PortalSearch;
