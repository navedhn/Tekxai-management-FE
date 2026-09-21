import React, { useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { PortalMilestone } from './types';

interface PortalMilestoneTimelineViewProps {
  milestones: PortalMilestone[];
}

const STATUS_BAR: Record<string, string> = {
  NOT_STARTED: 'bg-(--color-text-secondary)/40',
  IN_PROGRESS: 'bg-blue-500',
  BLOCKED: 'bg-red-500',
  COMPLETED: 'bg-green-500',
};

const DAY_MS = 86400000;
const MIN_SPAN_DAYS = 3;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const PortalMilestoneTimelineView: React.FC<PortalMilestoneTimelineViewProps> = ({ milestones }) => {
  const sorted = useMemo(
    () => [...milestones].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    [milestones]
  );

  const rows = useMemo(() => {
    return sorted.map((m) => {
      const end = m.due_date ? new Date(m.due_date) : m.estimated_end ? new Date(m.estimated_end) : null;
      let start = m.estimated_start ? new Date(m.estimated_start) : null;
      if (!start && end) start = new Date(end.getTime() - MIN_SPAN_DAYS * DAY_MS);
      if (!start || !end) return { milestone: m, start: null, end: null };
      const s = startOfDay(start);
      let e = startOfDay(end);
      if (e.getTime() <= s.getTime()) e = new Date(s.getTime() + MIN_SPAN_DAYS * DAY_MS);
      return { milestone: m, start: s, end: e };
    });
  }, [sorted]);

  const dated = rows.filter((r) => r.start && r.end) as { milestone: PortalMilestone; start: Date; end: Date }[];
  const undated = rows.filter((r) => !r.start || !r.end).map((r) => r.milestone);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = startOfDay(new Date());
    if (dated.length === 0) {
      return { rangeStart: new Date(today.getTime() - 14 * DAY_MS), rangeEnd: new Date(today.getTime() + 45 * DAY_MS) };
    }
    let min = dated[0].start, max = dated[0].end;
    for (const r of dated) {
      if (r.start < min) min = r.start;
      if (r.end > max) max = r.end;
    }
    if (today < min) min = today;
    return { rangeStart: new Date(min.getTime() - 7 * DAY_MS), rangeEnd: new Date(max.getTime() + 14 * DAY_MS) };
  }, [dated]);

  const totalDays = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / DAY_MS));
  const pxPerDay = 24;
  const chartWidth = totalDays * pxPerDay;
  const today = startOfDay(new Date());
  const todayOffset = ((today.getTime() - rangeStart.getTime()) / DAY_MS) * pxPerDay;

  const months = useMemo(() => {
    const list: { label: string; offsetPx: number; widthPx: number }[] = [];
    let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor < rangeEnd) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const segStart = cursor < rangeStart ? rangeStart : cursor;
      const segEnd = next > rangeEnd ? rangeEnd : next;
      const offsetPx = ((segStart.getTime() - rangeStart.getTime()) / DAY_MS) * pxPerDay;
      const widthPx = ((segEnd.getTime() - segStart.getTime()) / DAY_MS) * pxPerDay;
      list.push({ label: monthLabel(cursor), offsetPx, widthPx });
      cursor = next;
    }
    return list;
  }, [rangeStart, rangeEnd]);

  return (
    <div className="bg-(--color-card) border border-(--color-card-border) rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: chartWidth + 200 }}>
          <div className="flex border-b border-(--color-card-border)">
            <div className="w-[200px] shrink-0 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary) border-r border-(--color-card-border)">
              Milestone
            </div>
            <div className="relative flex-1" style={{ width: chartWidth, height: 32 }}>
              {months.map((mo, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-8 flex items-center px-2 text-[11px] font-bold text-(--color-text-secondary) border-l border-(--color-card-border)"
                  style={{ left: mo.offsetPx, width: mo.widthPx }}
                >
                  {mo.label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {todayOffset >= 0 && todayOffset <= chartWidth && (
              <div className="absolute top-0 bottom-0 w-px bg-red-400 z-0" style={{ left: 200 + todayOffset }} title="Today" />
            )}
            {dated.map(({ milestone: m, start, end }) => {
              const offsetPx = ((start.getTime() - rangeStart.getTime()) / DAY_MS) * pxPerDay;
              const widthPx = Math.max(pxPerDay, ((end.getTime() - start.getTime()) / DAY_MS) * pxPerDay);
              return (
                <div key={m.id} className="flex border-b border-(--color-card-border)/60">
                  <div className="w-[200px] shrink-0 px-4 py-3 flex items-center gap-2 border-r border-(--color-card-border)">
                    {m.sequence != null && (
                      <span className="text-[10px] font-black text-(--color-text-secondary) bg-(--color-elevated) px-1.5 py-0.5 rounded-md shrink-0">#{m.sequence}</span>
                    )}
                    <span className="text-xs font-bold text-(--color-text-primary) truncate">{m.title}</span>
                  </div>
                  <div className="relative flex-1" style={{ width: chartWidth, height: 44 }}>
                    <div
                      className={cn('absolute top-1/2 -translate-y-1/2 h-5 rounded-lg flex items-center px-2', STATUS_BAR[m.status] || STATUS_BAR.NOT_STARTED)}
                      style={{ left: offsetPx, width: widthPx }}
                      title={`${m.title} — ${m.progress_percent ?? 0}%`}
                    >
                      <div className="absolute inset-y-0 left-0 bg-black/20 rounded-l-lg" style={{ width: `${m.progress_percent ?? 0}%` }} />
                      <span className="relative text-[10px] font-black text-white whitespace-nowrap truncate">{m.progress_percent ?? 0}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {undated.length > 0 && (
        <div className="border-t border-(--color-card-border) p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary) mb-2">No dates set</p>
          <div className="flex flex-wrap gap-2">
            {undated.map((m) => (
              <span key={m.id} className={cn('text-[11px] font-bold px-2.5 py-1 rounded-lg text-white', STATUS_BAR[m.status] || STATUS_BAR.NOT_STARTED)}>
                {m.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3 border-t border-(--color-card-border) text-[11px] font-semibold text-(--color-text-secondary) flex-wrap">
        {['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'].map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_BAR[s])} />
            {s.replace('_', ' ')}
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-px h-3 bg-red-400" />
          Today
        </div>
      </div>
    </div>
  );
};

export default PortalMilestoneTimelineView;
