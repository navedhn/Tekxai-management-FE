import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Clock, Camera, Activity, MonitorSmartphone, Globe, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Badge from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { useGetScreenshots, type Screenshot } from '@/services/monitoringService';

interface Props {
  userOptions: { value: string; label: string }[];
  selectedUser: string;
  onSelectUser: (id: string) => void;
  isSuperAdmin: boolean;
  onDeleteOne: (s: Screenshot) => void;
}

const PAGE_SIZE = 30;
const FILTERS_STORAGE_KEY = 'monitoring.screenshotHistory.filters';

interface PersistedFilters {
  date?: string;
  activityFilter?: string;
  productivityFilter?: string;
  appFilter?: string;
  siteFilter?: string;
}

function loadPersistedFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function fmtHourRange(hourKey: string) {
  const d = new Date(hourKey);
  const start = new Date(d);
  const end = new Date(d);
  end.setHours(end.getHours() + 1);
  const f = (x: Date) => x.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  // Groups can span multiple days once "load more" pulls in older screenshots,
  // so the date prefix disambiguates hours that repeat day to day (e.g. two
  // separate "9 PM – 10 PM" buckets a month apart look identical without it).
  const dateLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dateLabel}, ${f(start)} – ${f(end)}`;
}

function hourKeyOf(iso: string) {
  const d = new Date(iso);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

// Restored once, outside the component, so the very first render already
// has the persisted values (lazy useState initializers below read from this
// same object) — no "restore after mount" flash of empty filters.
const persisted = loadPersistedFilters();

const ScreenshotHistoryPanel: React.FC<Props> = ({ userOptions, selectedUser, onSelectUser, isSuperAdmin, onDeleteOne }) => {
  const [date, setDate] = useState(persisted.date || '');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<Screenshot[]>([]);
  const [openHours, setOpenHours] = useState<Set<string>>(new Set());
  // Guards the initial auto-expand so it only ever happens once per
  // employee/filter selection, not on every "load more" page or re-render —
  // manual accordion toggling afterward behaves exactly as before.
  const autoExpandedRef = useRef(false);

  // Employee-scoped filters not yet backend-supported — kept purely
  // presentational ("coming soon") per scope, see report. Still persisted
  // (harmlessly inert today) so they restore correctly once/if the backend
  // gains support, without another frontend change.
  const [activityFilter, setActivityFilter] = useState(persisted.activityFilter || '');
  const [productivityFilter, setProductivityFilter] = useState(persisted.productivityFilter || '');
  const [appFilter, setAppFilter] = useState(persisted.appFilter || '');
  const [siteFilter, setSiteFilter] = useState(persisted.siteFilter || '');

  // Persist filters (not pagination, not expanded cards, not the employee —
  // that's owned by the parent page) whenever any of them change.
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
        date, activityFilter, productivityFilter, appFilter, siteFilter,
      }));
    } catch { /* localStorage unavailable — not fatal */ }
  }, [date, activityFilter, productivityFilter, appFilter, siteFilter]);

  // Reset pagination/accumulation whenever the employee or a backend-wired
  // filter changes so we never mix old and new results.
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
    setOpenHours(new Set());
    autoExpandedRef.current = false;
  }, [selectedUser, date, timeFrom, timeTo]);

  const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE), user_id: selectedUser };
  if (date) params.date = date;
  if (timeFrom) params.time_from = timeFrom;
  if (timeTo) params.time_to = timeTo;

  // No employee selected => query is disabled entirely (no network call).
  const { data, isLoading, isFetching } = useGetScreenshots(params, !!selectedUser);
  const total = (data as any)?.total || 0;

  useEffect(() => {
    if (!data) return;
    const records = (data as any).records || [];
    setAccumulated((prev) => {
      if (page === 1) return records;
      const seen = new Set(prev.map((r) => r.id));
      return [...prev, ...records.filter((r: Screenshot) => !seen.has(r.id))];
    });
    // Auto-expand the latest hour group that actually has screenshots, once,
    // the first time this employee/filter combination's first page loads.
    // The API already returns captured_at desc, so records[0] is the newest.
    if (page === 1 && !autoExpandedRef.current && records.length > 0) {
      autoExpandedRef.current = true;
      setOpenHours(new Set([hourKeyOf(records[0].captured_at)]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page]);

  const grouped = useMemo(() => {
    const map = new Map<string, Screenshot[]>();
    for (const s of accumulated) {
      const k = hourKeyOf(s.captured_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    // Newest hour first; within an hour, newest screenshot first (API
    // already returns captured_at desc, so insertion order is preserved).
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [accumulated]);

  const toggleHour = (k: string) => {
    setOpenHours((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const hasMore = accumulated.length < total;

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <Card className="border-none shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-56">
            <label className="text-xs font-bold text-gray-500 mb-1 block">EMPLOYEE (required)</label>
            <SearchableSelect
              options={[{ value: '', label: 'Select an employee…' }, ...userOptions.filter((o) => o.value)]}
              value={selectedUser}
              onChange={(v) => onSelectUser(v as string)}
              className="h-10 !rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">DATE</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-100 outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">TIME FROM</label>
            <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} disabled={!date}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-100 outline-none disabled:opacity-40" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">TIME TO</label>
            <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} disabled={!date}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-100 outline-none disabled:opacity-40" />
          </div>

          {/* Coming soon — no backend support for per-screenshot activity/app/website filtering yet */}
          <div className="opacity-50 cursor-not-allowed" title="Coming soon — not yet supported by the backend">
            <label className="text-xs font-bold text-gray-400 mb-1 block">ACTIVITY %</label>
            <select disabled value={activityFilter} onChange={() => setActivityFilter('')}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50">
              <option>Any</option>
            </select>
          </div>
          <div className="opacity-50 cursor-not-allowed" title="Coming soon — not yet supported by the backend">
            <label className="text-xs font-bold text-gray-400 mb-1 block">PRODUCTIVITY</label>
            <select disabled value={productivityFilter} onChange={() => setProductivityFilter('')}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50">
              <option>Any</option>
            </select>
          </div>
          <div className="opacity-50 cursor-not-allowed" title="Coming soon — not yet supported by the backend">
            <label className="text-xs font-bold text-gray-400 mb-1 block">APPLICATION</label>
            <select disabled value={appFilter} onChange={() => setAppFilter('')}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50">
              <option>Any</option>
            </select>
          </div>
          <div className="opacity-50 cursor-not-allowed" title="Coming soon — not yet supported by the backend">
            <label className="text-xs font-bold text-gray-400 mb-1 block">WEBSITE</label>
            <select disabled value={siteFilter} onChange={() => setSiteFilter('')}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50">
              <option>Any</option>
            </select>
          </div>
        </div>
      </Card>

      {!selectedUser ? (
        <Card className="border-none shadow-sm p-16 flex flex-col items-center justify-center gap-3 text-center">
          <Camera size={32} className="text-gray-300" />
          <p className="text-sm font-bold text-gray-500">Select an employee to view their screenshot history.</p>
          <p className="text-xs text-gray-400">No screenshots are loaded until you choose someone from the dropdown above.</p>
        </Card>
      ) : isLoading && page === 1 ? (
        <Card className="border-none shadow-sm p-10 text-center text-sm text-gray-400">Loading screenshots…</Card>
      ) : grouped.length === 0 ? (
        <Card className="border-none shadow-sm p-10 text-center text-sm text-gray-400">No screenshots found for this employee in the selected range.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(([hourKey, shots]) => {
            const isOpen = openHours.has(hourKey);
            const withActivity = shots.filter((s) => s.activity_pct != null);
            const avgActivity = withActivity.length
              ? Math.round(withActivity.reduce((sum, s) => sum + (s.activity_pct || 0), 0) / withActivity.length)
              : null;
            // "Working time" per hour bucket: no per-capture duration is stored
            // (screenshots are point-in-time), so this approximates using that
            // hour's screenshot count x the desktop agent's ~10-minute capture
            // interval, capped at 60m — a rough presence indicator, not a
            // precise timer. Documented limitation, see report.
            const workingMinutes = Math.min(60, shots.length * 10);
            return (
              <Card key={hourKey} className="border-none shadow-sm overflow-hidden p-0">
                <button
                  onClick={() => toggleHour(hourKey)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    <Clock size={15} className="text-primary-500" />
                    <span className="text-sm font-black text-gray-900">{fmtHourRange(hourKey)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">~{workingMinutes}m working time</Badge>
                    <Badge variant="default">{shots.length} screenshot{shots.length !== 1 ? 's' : ''}</Badge>
                    {avgActivity != null && <Badge variant="success">{avgActivity}% activity</Badge>}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-3">
                      {shots.map((s) => (
                        <ScreenshotCard key={s.id} s={s} isSuperAdmin={isSuperAdmin} onDelete={() => onDeleteOne(s)} />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={isFetching}
              className="self-center px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 disabled:opacity-50 transition-colors"
            >
              {isFetching ? 'Loading…' : `Load more (${accumulated.length} of ${total})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ScreenshotCard: React.FC<{ s: Screenshot; isSuperAdmin: boolean; onDelete: () => void }> = ({ s, isSuperAdmin, onDelete }) => {
  const time = new Date(s.captured_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white hover:shadow-md transition-shadow group relative">
      {isSuperAdmin && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete screenshot"
        >
          <Trash2 size={14} />
        </button>
      )}
      {s.file_url ? (
        <a href={s.file_url} target="_blank" rel="noopener noreferrer">
          <img src={s.file_url} alt="Screenshot" loading="lazy" className="w-full h-32 object-cover bg-gray-50" />
        </a>
      ) : (
        <div className="w-full h-32 flex items-center justify-center bg-gray-50 text-xs text-gray-400 font-mono">{s.file_key.split('/').pop()}</div>
      )}
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-gray-900">{time}</span>
          <span className="text-[10px] text-gray-400 font-semibold">{s.user ? `${s.user.first_name} ${s.user.last_name}` : ''}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 font-semibold">
          <span className="flex items-center gap-1"><Activity size={11} /> {s.activity_pct != null ? `${Math.round(s.activity_pct)}%` : '—'}</span>
          <span>KB {s.keyboard_pct != null ? `${s.keyboard_pct}%` : '—'}</span>
          <span>Mouse {s.mouse_pct != null ? `${s.mouse_pct}%` : '—'}</span>
          <span>Idle {s.idle_seconds != null ? `${Math.round(s.idle_seconds / 60)}m` : '—'}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold truncate">
          <MonitorSmartphone size={11} /> {s.active_application || '—'}
        </div>
        {s.website && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold truncate">
            <Globe size={11} /> {s.website}
          </div>
        )}
        {/* Future-ready, currently empty placeholders */}
        <div className="text-[10px] text-gray-300 italic">Project: {s.project || '—'} · Notes: {s.notes || '—'}</div>
      </div>
    </div>
  );
};

export default ScreenshotHistoryPanel;
