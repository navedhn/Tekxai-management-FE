import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PortalMilestone } from './types';

interface PortalMilestoneTableViewProps {
  milestones: PortalMilestone[];
}

const STATUS_STYLE: Record<string, string> = {
  NOT_STARTED: 'bg-(--color-elevated) text-(--color-text-secondary)',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

type SortKey = 'sequence' | 'title' | 'status' | 'estimated_start' | 'estimated_end' | 'due_date' | 'progress_percent';

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'sequence', label: '#' },
  { key: 'title', label: 'Milestone' },
  { key: 'status', label: 'Status' },
  { key: 'estimated_start', label: 'Est. Start' },
  { key: 'estimated_end', label: 'Est. End' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'progress_percent', label: 'Progress', align: 'right' },
];

function formatDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

const PortalMilestoneTableView: React.FC<PortalMilestoneTableViewProps> = ({ milestones }) => {
  const [sortKey, setSortKey] = useState<SortKey>('sequence');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...milestones].sort((a, b) => {
      let av: any = (a as any)[sortKey];
      let bv: any = (b as any)[sortKey];
      if (sortKey === 'estimated_start' || sortKey === 'estimated_end' || sortKey === 'due_date') {
        av = av ? new Date(av).getTime() : -Infinity;
        bv = bv ? new Date(bv).getTime() : -Infinity;
      }
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
      if (typeof av === 'string' && typeof bv === 'string') return dir * av.localeCompare(bv);
      return dir * ((av as number) - (bv as number));
    });
  }, [milestones, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="bg-(--color-card) border border-(--color-card-border) rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-(--color-card-border)">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    'px-4 py-3 text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary) cursor-pointer select-none hover:text-(--color-text-primary) whitespace-nowrap',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  <span className={cn('inline-flex items-center gap-1', col.align === 'right' && 'flex-row-reverse')}>
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-30" />
                    )}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary) text-left whitespace-nowrap">Team</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => {
              const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== 'COMPLETED';
              return (
                <tr key={m.id} className="border-b border-(--color-card-border) last:border-b-0">
                  <td className="px-4 py-3 text-(--color-text-secondary) font-bold whitespace-nowrap">{m.sequence ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-(--color-text-primary) max-w-[240px] truncate">{m.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide', STATUS_STYLE[m.status] || STATUS_STYLE.NOT_STARTED)}>
                      {m.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-(--color-text-secondary) whitespace-nowrap">{formatDate(m.estimated_start)}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary) whitespace-nowrap">{formatDate(m.estimated_end)}</td>
                  <td className={cn('px-4 py-3 whitespace-nowrap font-semibold', isOverdue ? 'text-red-500' : 'text-(--color-text-secondary)')}>
                    {formatDate(m.due_date)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-(--color-elevated) rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${m.progress_percent ?? 0}%` }} />
                      </div>
                      <span className="text-(--color-text-primary) font-bold text-xs w-8 text-right">{m.progress_percent ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {m.members.length > 0 ? (
                      <div className="flex items-center -space-x-2">
                        {m.members.slice(0, 4).map((u) => (
                          <div
                            key={u.id}
                            title={`${u.first_name || ''} ${u.last_name || ''}`.trim()}
                            className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-[9px] font-black flex items-center justify-center border-2 border-(--color-card) overflow-hidden"
                          >
                            {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-(--color-text-secondary) italic text-xs">Unassigned</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PortalMilestoneTableView;
