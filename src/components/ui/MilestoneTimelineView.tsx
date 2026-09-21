import React, { useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { Milestone, MilestoneStatus } from '@/services/milestonesService';

interface MilestoneTimelineViewProps {
  milestones: Milestone[];
  onOpenMilestone: (milestone: Milestone) => void;
}

const STATUS_BAR: Record<MilestoneStatus, string> = {
  NOT_STARTED: 'bg-gray-300',
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

const MilestoneTimelineView: React.FC<MilestoneTimelineViewProps> = ({ milestones, onOpenMilestone }) => {
  const active = useMemo(
    () => milestones.filter((m) => !m.archived_at).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    [milestones]
  );

  const rows = useMemo(() => {
    return active.map((m) => {
      const end = m.due_date ? new Date(m.due_date) : m.estimated_end ? new Date(m.estimated_end) : null;
      let start = m.estimated_start ? new Date(m.estimated_start) : null;
      if (!start && end) start = new Date(end.getTime() - MIN_SPAN_DAYS * DAY_MS);
      if (start && !end) return { milestone: m, start: startOfDay(start), end: startOfDay(new Date(start.getTime() + MIN_SPAN_DAYS * DAY_MS)) };
      if (!start || !end) return { milestone: m, start: null, end: null };
      const s = startOfDay(start);
      let e = startOfDay(end);
      if (e.getTime() <= s.getTime()) e = new Date(s.getTime() + MIN_SPAN_DAYS * DAY_MS);
      return { milestone: m, start: s, end: e };
    });
  }, [active]);

  const dated = rows.filter((r) => r.start && r.end) as { milestone: Milestone; start: Date; end: Date }[];
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
    // pad a week on each side
    return { rangeStart: new Date(min.getTime() - 7 * DAY_MS), rangeEnd: new Date(max.getTime() + 14 * DAY_MS) };
  }, [dated]);

  const totalDays = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / DAY_MS));
  const pxPerDay = 26;
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

  if (active.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-sm">
        No milestones yet for this project.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <div style={{ minWidth: chartWidth + 260 }}>
          {/* Month header */}
          <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="w-[260px] shrink-0 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-gray-400 border-r border-gray-100">
              Milestone
            </div>
            <div className="relative flex-1" style={{ width: chartWidth, height: 32 }}>
              {months.map((mo, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-8 flex items-center px-2 text-[11px] font-bold text-gray-500 border-l border-gray-100"
                  style={{ left: mo.offsetPx, width: mo.widthPx }}
                >
                  {mo.label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {/* today line spans all rows */}
            {todayOffset >= 0 && todayOffset <= chartWidth && (
              <div
                className="absolute top-0 bottom-0 w-px bg-red-400 z-0"
                style={{ left: 260 + todayOffset }}
                title="Today"
              />
            )}
            {dated.map(({ milestone: m, start, end }) => {
              const offsetPx = ((start.getTime() - rangeStart.getTime()) / DAY_MS) * pxPerDay;
              const widthPx = Math.max(pxPerDay, ((end.getTime() - start.getTime()) / DAY_MS) * pxPerDay);
              const blocked = m.status === 'BLOCKED';
              return (
                <div key={m.id} className="flex border-b border-gray-50 hover:bg-gray-50/50">
                  <button
                    onClick={() => onOpenMilestone(m)}
                    className="w-[260px] shrink-0 px-4 py-3 flex items-center gap-2 text-left border-r border-gray-100"
                  >
                    {m.sequence != null && (
                      <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md shrink-0">#{m.sequence}</span>
                    )}
                    <span className="text-xs font-bold text-gray-800 truncate">{m.title}</span>
                  </button>
                  <div className="relative flex-1" style={{ width: chartWidth, height: 48 }}>
                    <div
                      onClick={() => onOpenMilestone(m)}
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-6 rounded-lg cursor-pointer flex items-center px-2 shadow-sm',
                        STATUS_BAR[m.status] || STATUS_BAR.NOT_STARTED,
                        blocked && 'ring-2 ring-red-300'
                      )}
                      style={{ left: offsetPx, width: widthPx }}
                      title={`${m.title} — ${m.progress_percent ?? 0}%`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-black/20 rounded-l-lg"
                        style={{ width: `${m.progress_percent ?? 0}%` }}
                      />
                      <span className="relative text-[10px] font-black text-white whitespace-nowrap truncate">
                        {m.progress_percent ?? 0}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {undated.length > 0 && (
        <div className="border-t border-gray-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">No dates set</p>
          <div className="flex flex-wrap gap-2">
            {undated.map((m) => (
              <button
                key={m.id}
                onClick={() => onOpenMilestone(m)}
                className={cn('text-[11px] font-bold px-2.5 py-1 rounded-lg text-white', STATUS_BAR[m.status] || STATUS_BAR.NOT_STARTED)}
              >
                {m.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100 text-[11px] font-semibold text-gray-500">
        {(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as MilestoneStatus[]).map((s) => (
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

export default MilestoneTimelineView;
