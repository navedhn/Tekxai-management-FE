import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Milestone, MilestoneStatus } from '@/services/milestonesService';

interface MilestoneTableViewProps {
  milestones: Milestone[];
  currency: string;
  onOpenMilestone: (milestone: Milestone) => void;
}

const STATUS_STYLE: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  COMPLETED: 'bg-green-50 text-green-700',
  BLOCKED: 'bg-red-50 text-red-600',
};

type SortKey = 'sequence' | 'title' | 'status' | 'estimated_start' | 'estimated_end' | 'due_date' | 'progress_percent' | 'price';

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'sequence', label: '#' },
  { key: 'title', label: 'Milestone' },
  { key: 'status', label: 'Status' },
  { key: 'estimated_start', label: 'Est. Start' },
  { key: 'estimated_end', label: 'Est. End' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'progress_percent', label: 'Progress', align: 'right' },
  { key: 'price', label: 'Price', align: 'right' },
];

function formatDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

const MilestoneTableView: React.FC<MilestoneTableViewProps> = ({ milestones, currency, onOpenMilestone }) => {
  const [sortKey, setSortKey] = useState<SortKey>('sequence');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const active = useMemo(() => milestones.filter((m) => !m.archived_at), [milestones]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...active].sort((a, b) => {
      let av: any = a[sortKey as keyof Milestone];
      let bv: any = b[sortKey as keyof Milestone];
      if (sortKey === 'estimated_start' || sortKey === 'estimated_end' || sortKey === 'due_date') {
        av = av ? new Date(av).getTime() : -Infinity;
        bv = bv ? new Date(bv).getTime() : -Infinity;
      }
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
      if (typeof av === 'string' && typeof bv === 'string') return dir * av.localeCompare(bv);
      return dir * ((av as number) - (bv as number));
    });
  }, [active, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

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
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="border-b border-gray-100">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    'px-4 py-3 text-[10px] font-black uppercase tracking-wide text-gray-400 cursor-pointer select-none hover:text-gray-600 whitespace-nowrap',
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
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-gray-400 text-left whitespace-nowrap">Assignees</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => {
              const members = (m.members || []).map((mm) => mm.user);
              const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== 'COMPLETED';
              return (
                <tr
                  key={m.id}
                  onClick={() => onOpenMilestone(m)}
                  className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-400 font-bold whitespace-nowrap">{m.sequence ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-gray-800 max-w-[260px] truncate">{m.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide', STATUS_STYLE[m.status] || STATUS_STYLE.NOT_STARTED)}>
                      {m.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(m.estimated_start)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(m.estimated_end)}</td>
                  <td className={cn('px-4 py-3 whitespace-nowrap font-semibold', isOverdue ? 'text-red-500' : 'text-gray-500')}>
                    {formatDate(m.due_date)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#005CDA] rounded-full" style={{ width: `${m.progress_percent ?? 0}%` }} />
                      </div>
                      <span className="text-gray-600 font-bold text-xs w-8 text-right">{m.progress_percent ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-gray-700">
                    {m.price > 0 ? `${currency} ${m.price.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {members.length > 0 ? (
                      <div className="flex items-center -space-x-2">
                        {members.slice(0, 4).map((u) => (
                          <div
                            key={u.id}
                            title={`${u.first_name || ''} ${u.last_name || ''}`.trim()}
                            className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-[9px] font-black flex items-center justify-center border-2 border-white overflow-hidden"
                          >
                            {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                          </div>
                        ))}
                        {members.length > 4 && (
                          <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[9px] font-black flex items-center justify-center border-2 border-white">
                            +{members.length - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 italic text-xs">Unassigned</span>
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

export default MilestoneTableView;
