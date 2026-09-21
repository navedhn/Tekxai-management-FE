import React, { useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { Milestone } from '@/services/milestonesService';

interface MilestoneWorkloadViewProps {
  milestones: Milestone[];
  onOpenMilestone: (milestone: Milestone) => void;
}

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const WEEKS_SHOWN = 8;

function startOfWeek(d: Date) {
  const day = d.getDay();
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((day + 6) % 7));
  return monday;
}

function weekLabel(d: Date) {
  const end = new Date(d.getTime() + 6 * DAY_MS);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const LOAD_STYLE = [
  'bg-gray-50 text-gray-300',           // 0
  'bg-emerald-100 text-emerald-700',    // 1
  'bg-amber-100 text-amber-700',        // 2
  'bg-orange-200 text-orange-800',      // 3
  'bg-red-200 text-red-800',            // 4+
];

const MilestoneWorkloadView: React.FC<MilestoneWorkloadViewProps> = ({ milestones, onOpenMilestone }) => {
  const active = useMemo(() => milestones.filter((m) => !m.archived_at), [milestones]);

  const weeks = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: WEEKS_SHOWN }, (_, i) => new Date(start.getTime() + i * WEEK_MS));
  }, []);

  type Row = {
    assignee: { id: string; name: string; avatar: string | null };
    loads: { count: number; milestones: Milestone[] }[];
  };

  const { rows, unassigned } = useMemo(() => {
    const byUser = new Map<string, { name: string; avatar: string | null; milestones: Milestone[] }>();
    const unassignedList: Milestone[] = [];

    for (const m of active) {
      const members = m.members || [];
      if (members.length === 0) { unassignedList.push(m); continue; }
      for (const { user } of members) {
        const key = user.id;
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        if (!byUser.has(key)) byUser.set(key, { name, avatar: user.avatar || null, milestones: [] });
        byUser.get(key)!.milestones.push(m);
      }
    }

    const computedRows: Row[] = Array.from(byUser.entries()).map(([id, v]) => {
      const loads = weeks.map((weekStart) => {
        const weekEnd = new Date(weekStart.getTime() + WEEK_MS);
        const overlapping = v.milestones.filter((m) => {
          const end = m.due_date ? new Date(m.due_date) : m.estimated_end ? new Date(m.estimated_end) : null;
          if (!end) return false;
          let start = m.estimated_start ? new Date(m.estimated_start) : new Date(end.getTime() - 3 * DAY_MS);
          if (m.status === 'COMPLETED') return false;
          return start < weekEnd && end >= weekStart;
        });
        return { count: overlapping.length, milestones: overlapping };
      });
      return { assignee: { id, name: v.name, avatar: v.avatar }, loads };
    });

    computedRows.sort((a, b) => a.assignee.name.localeCompare(b.assignee.name));
    return { rows: computedRows, unassigned: unassignedList };
  }, [active, weeks]);

  if (active.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-sm">
        No milestones yet for this project.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-sm">
        No milestones have assignees yet — workload has nothing to plot.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
      <div className="px-5 pt-4 pb-1">
        <p className="text-[11px] text-gray-400 font-semibold">
          Concurrent active milestones per person, by week — not hour estimates.
        </p>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-gray-400 text-left sticky left-0 bg-white z-10 min-w-[180px]">
                Assignee
              </th>
              {weeks.map((w, i) => (
                <th key={i} className="px-2 py-3 text-[10px] font-black uppercase tracking-wide text-gray-400 text-center whitespace-nowrap">
                  {weekLabel(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.assignee.id} className="border-b border-gray-50 last:border-b-0">
                <td className="px-4 py-3 sticky left-0 bg-white z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-[10px] font-black flex items-center justify-center overflow-hidden shrink-0">
                      {row.assignee.avatar ? <img src={row.assignee.avatar} alt="" className="w-full h-full object-cover" /> : row.assignee.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </div>
                    <span className="font-bold text-gray-800 text-xs truncate">{row.assignee.name}</span>
                  </div>
                </td>
                {row.loads.map((load, i) => {
                  const styleIdx = Math.min(load.count, 4);
                  return (
                    <td key={i} className="px-2 py-2 text-center">
                      <button
                        disabled={load.count === 0}
                        onClick={() => load.count === 1 && onOpenMilestone(load.milestones[0])}
                        title={load.milestones.map((m) => m.title).join(', ') || 'No active milestones'}
                        className={cn(
                          'w-full h-9 rounded-lg flex items-center justify-center text-xs font-black transition-colors',
                          LOAD_STYLE[styleIdx],
                          load.count > 0 && 'cursor-pointer hover:brightness-95'
                        )}
                      >
                        {load.count > 0 ? load.count : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unassigned.length > 0 && (
        <div className="border-t border-gray-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">Unassigned milestones</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((m) => (
              <button
                key={m.id}
                onClick={() => onOpenMilestone(m)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
              >
                {m.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100 text-[11px] font-semibold text-gray-500">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gray-50 border border-gray-200" />0</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-100" />1</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-100" />2</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-200" />3</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-200" />4+ (over capacity)</div>
      </div>
    </div>
  );
};

export default MilestoneWorkloadView;
