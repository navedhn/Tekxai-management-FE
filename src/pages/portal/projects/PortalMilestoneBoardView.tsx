import React from 'react';
import { cn } from '@/utils/cn';
import type { PortalMilestone } from './types';

interface PortalMilestoneBoardViewProps {
  milestones: PortalMilestone[];
}

const COLUMNS: { id: string; label: string; color: string; bg: string }[] = [
  { id: 'NOT_STARTED', label: 'Not Started', color: 'text-(--color-text-secondary)', bg: 'bg-(--color-elevated)' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'BLOCKED', label: 'Blocked', color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'COMPLETED', label: 'Completed', color: 'text-green-600', bg: 'bg-green-50' },
];

const PortalMilestoneBoardView: React.FC<PortalMilestoneBoardViewProps> = ({ milestones }) => {
  const byColumn = COLUMNS.reduce<Record<string, PortalMilestone[]>>((acc, col) => {
    acc[col.id] = milestones.filter((m) => (m.status || 'NOT_STARTED') === col.id);
    return acc;
  }, {});

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((col) => (
        <div key={col.id} className={cn('flex flex-col gap-3 rounded-2xl p-3 min-h-[160px] min-w-[240px] flex-1', col.bg)}>
          <div className="flex items-center justify-between px-1">
            <span className={cn('text-xs font-black uppercase tracking-wider', col.color)}>{col.label}</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-(--color-card)/80', col.color)}>
              {byColumn[col.id].length}
            </span>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {byColumn[col.id].map((m) => {
              const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== 'COMPLETED';
              return (
                <div key={m.id} className="bg-(--color-card) rounded-xl border border-(--color-card-border) p-4 shadow-sm">
                  {m.sequence != null && (
                    <span className="text-[10px] font-black text-(--color-text-secondary) bg-(--color-elevated) px-1.5 py-0.5 rounded-md">#{m.sequence}</span>
                  )}
                  <p className="text-sm font-bold text-(--color-text-primary) mt-1.5 mb-3 line-clamp-2">{m.title}</p>
                  <div className="h-1.5 bg-(--color-elevated) rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${m.progress_percent ?? 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-(--color-text-secondary)">{m.progress_percent ?? 0}%</span>
                    {m.due_date && (
                      <span className={cn('text-[11px] font-medium', isOverdue ? 'text-red-500' : 'text-(--color-text-secondary)')}>
                        {new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {byColumn[col.id].length === 0 && (
              <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-(--color-border) py-6">
                <span className="text-xs text-(--color-text-secondary) font-medium">Nothing here</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PortalMilestoneBoardView;
