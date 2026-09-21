import React, { useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { PortalMilestone } from './types';

interface PortalMilestoneWorkloadViewProps {
  milestones: PortalMilestone[];
}

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const WEEKS_SHOWN = 8;

function startOfWeek(d: Date) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((day + 6) % 7));
}

function weekLabel(d: Date) {
  const end = new Date(d.getTime() + 6 * DAY_MS);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const LOAD_STYLE = [
  'bg-(--color-elevated) text-(--color-text-secondary)/50',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-orange-200 text-orange-800',
  'bg-red-200 text-red-800',
];

const PortalMilestoneWorkloadView: React.FC<PortalMilestoneWorkloadViewProps> = ({ milestones }) => {
  const weeks = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: WEEKS_SHOWN }, (_, i) => new Date(start.getTime() + i * WEEK_MS));
  }, []);

  const { rows, unassigned } = useMemo(() => {
    const byUser = new Map<string, { name: string; avatar: string | null; milestones: PortalMilestone[] }>();
    const unassignedList: PortalMilestone[] = [];

    for (const m of milestones) {
      if (m.members.length === 0) { unassignedList.push(m); continue; }
      for (const user of m.members) {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        if (!byUser.has(user.id)) byUser.set(user.id, { name, avatar: user.avatar, milestones: [] });
        byUser.get(user.id)!.milestones.push(m);
      }
    }

    const computedRows = Array.from(byUser.entries()).map(([id, v]) => {
      const loads = weeks.map((weekStart) => {
        const weekEnd = new Date(weekStart.getTime() + WEEK_MS);
        const overlapping = v.milestones.filter((m) => {
          if (m.status === 'COMPLETED') return false;
          const end = m.due_date ? new Date(m.due_date) : m.estimated_end ? new Date(m.estimated_end) : null;
          if (!end) return false;
          const start = m.estimated_start ? new Date(m.estimated_start) : new Date(end.getTime() - 3 * DAY_MS);
          return start < weekEnd && end >= weekStart;
        });
        return { count: overlapping.length, milestones: overlapping };
      });
      return { id, name: v.name, avatar: v.avatar, loads };
    });

    computedRows.sort((a, b) => a.name.localeCompare(b.name));
    return { rows: computedRows, unassigned: unassignedList };
  }, [milestones, weeks]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-(--color-text-secondary) py-10 text-center">
        No milestones have assigned team members yet.
      </p>
    );
  }

  return (
    <div className="bg-(--color-card) border border-(--color-card-border) rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-1">
        <p className="text-[11px] text-(--color-text-secondary) font-semibold">
          Concurrent active milestones per person, by week.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="border-b border-(--color-card-border)">
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary) text-left sticky left-0 bg-(--color-card) z-10 min-w-[180px]">
                Team member
              </th>
              {weeks.map((w, i) => (
                <th key={i} className="px-2 py-3 text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary) text-center whitespace-nowrap">
                  {weekLabel(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-(--color-card-border) last:border-b-0">
                <td className="px-4 py-3 sticky left-0 bg-(--color-card) z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-[10px] font-black flex items-center justify-center overflow-hidden shrink-0">
                      {row.avatar ? <img src={row.avatar} alt="" className="w-full h-full object-cover" /> : row.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </div>
                    <span className="font-bold text-(--color-text-primary) text-xs truncate">{row.name}</span>
                  </div>
                </td>
                {row.loads.map((load, i) => {
                  const styleIdx = Math.min(load.count, 4);
                  return (
                    <td key={i} className="px-2 py-2 text-center">
                      <div
                        title={load.milestones.map((m) => m.title).join(', ') || 'No active milestones'}
                        className={cn('w-full h-9 rounded-lg flex items-center justify-center text-xs font-black', LOAD_STYLE[styleIdx])}
                      >
                        {load.count > 0 ? load.count : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unassigned.length > 0 && (
        <div className="border-t border-(--color-card-border) p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary) mb-2">Unassigned milestones</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((m) => (
              <span key={m.id} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-(--color-elevated) text-(--color-text-secondary)">{m.title}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3 border-t border-(--color-card-border) text-[11px] font-semibold text-(--color-text-secondary) flex-wrap">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-(--color-elevated)" />0</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-100" />1</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-100" />2</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-200" />3</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-200" />4+</div>
      </div>
    </div>
  );
};

export default PortalMilestoneWorkloadView;
