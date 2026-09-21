import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Milestone, MilestoneStatus } from '@/services/milestonesService';

interface MilestoneBoardViewProps {
  milestones: Milestone[];
  currency: string;
  onChangeStatus: (milestoneId: string, status: MilestoneStatus) => void;
  onOpenMilestone: (milestone: Milestone) => void;
  canEdit: boolean;
}

const COLUMNS: { id: MilestoneStatus; label: string; color: string; bg: string }[] = [
  { id: 'NOT_STARTED', label: 'Not Started', color: 'text-gray-600', bg: 'bg-gray-50' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'BLOCKED', label: 'Blocked', color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'COMPLETED', label: 'Completed', color: 'text-green-600', bg: 'bg-green-50' },
];

function MilestoneCard({
  milestone,
  currency,
  onOpen,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  milestone: Milestone;
  currency: string;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const isOverdue = milestone.due_date && new Date(milestone.due_date) < new Date() && milestone.status !== 'COMPLETED';
  const pct = milestone.progress_percent ?? 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-4 cursor-pointer shadow-sm hover:shadow-md transition-all select-none',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        {milestone.sequence != null && (
          <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">#{milestone.sequence}</span>
        )}
        <span className={cn(
          'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ml-auto',
          milestone.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'
        )}>
          {milestone.payment_status === 'PAID' ? 'Paid' : 'Unpaid'}
        </span>
      </div>

      <p className="text-sm font-bold text-gray-800 mb-3 line-clamp-2">{milestone.title}</p>

      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-[#005CDA] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center justify-between">
        {milestone.price > 0 ? (
          <span className="text-[11px] font-black text-gray-600 whitespace-nowrap">{currency} {milestone.price.toLocaleString()}</span>
        ) : <span />}

        {milestone.due_date && (
          <div className={cn('flex items-center gap-1 text-[11px] font-medium', isOverdue ? 'text-red-500' : 'text-gray-400')}>
            {isOverdue && <AlertCircle size={10} />}
            {new Date(milestone.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );
}

const MilestoneBoardView: React.FC<MilestoneBoardViewProps> = ({ milestones, currency, onChangeStatus, onOpenMilestone, canEdit }) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<MilestoneStatus | null>(null);

  const active = milestones.filter((m) => !m.archived_at);
  const byColumn = COLUMNS.reduce<Record<MilestoneStatus, Milestone[]>>((acc, col) => {
    acc[col.id] = active.filter((m) => m.status === col.id);
    return acc;
  }, { NOT_STARTED: [], IN_PROGRESS: [], BLOCKED: [], COMPLETED: [] });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => { if (canEdit) { e.preventDefault(); setDragOverColumn(col.id); } }}
          onDragLeave={() => setDragOverColumn((c) => (c === col.id ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverColumn(null);
            if (!canEdit || !draggingId) return;
            const dragged = active.find((m) => m.id === draggingId);
            if (dragged && dragged.status !== col.id) onChangeStatus(draggingId, col.id);
            setDraggingId(null);
          }}
          className={cn(
            'flex flex-col gap-3 rounded-2xl p-3 min-h-[200px] min-w-[260px] flex-1 transition-colors',
            col.bg,
            dragOverColumn === col.id && 'ring-2 ring-[#005CDA] ring-offset-2'
          )}
        >
          <div className="flex items-center justify-between px-1">
            <span className={cn('text-xs font-black uppercase tracking-wider', col.color)}>{col.label}</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-white/80', col.color)}>{byColumn[col.id].length}</span>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {byColumn[col.id].map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                currency={currency}
                onOpen={() => onOpenMilestone(m)}
                onDragStart={() => canEdit && setDraggingId(m.id)}
                onDragEnd={() => setDraggingId(null)}
                isDragging={draggingId === m.id}
              />
            ))}
            {byColumn[col.id].length === 0 && (
              <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-8">
                <span className="text-xs text-gray-400 font-medium">Drop milestones here</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MilestoneBoardView;
