import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import type { PortalMilestone } from './types';

export type PortalMilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

interface PortalMilestoneBoardViewProps {
  milestones: PortalMilestone[];
  canEdit?: boolean;
  onChangeStatus?: (milestoneId: string, status: PortalMilestoneStatus) => void;
}

const COLUMNS: { id: PortalMilestoneStatus; label: string; color: string; bg: string }[] = [
  { id: 'NOT_STARTED', label: 'Not Started', color: 'text-(--color-text-secondary)', bg: 'bg-(--color-elevated)' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'BLOCKED', label: 'Blocked', color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'COMPLETED', label: 'Completed', color: 'text-green-600', bg: 'bg-green-50' },
];

const PortalMilestoneBoardView: React.FC<PortalMilestoneBoardViewProps> = ({
  milestones,
  canEdit = false,
  onChangeStatus,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<PortalMilestoneStatus | null>(null);

  const byColumn = COLUMNS.reduce<Record<PortalMilestoneStatus, PortalMilestone[]>>((acc, col) => {
    acc[col.id] = milestones.filter((m) => (m.status || 'NOT_STARTED') === col.id);
    return acc;
  }, { NOT_STARTED: [], IN_PROGRESS: [], BLOCKED: [], COMPLETED: [] });

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => {
            if (!canEdit) return;
            e.preventDefault();
            setDragOverColumn(col.id);
          }}
          onDragLeave={() => setDragOverColumn((c) => (c === col.id ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverColumn(null);
            if (!canEdit || !draggingId || !onChangeStatus) return;
            const dragged = milestones.find((m) => m.id === draggingId);
            // #region agent log
            fetch('http://127.0.0.1:7689/ingest/5fe2d865-37c9-41e9-b868-d88ad2f9dbc6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d0293d'},body:JSON.stringify({sessionId:'d0293d',runId:'board-dnd',hypothesisId:'H-dnd',location:'PortalMilestoneBoardView.tsx:onDrop',message:'portal board drop',data:{canEdit,draggingId,from:dragged?.status||null,to:col.id,willUpdate:!!(dragged&&dragged.status!==col.id)},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            if (dragged && dragged.status !== col.id) onChangeStatus(draggingId, col.id);
            setDraggingId(null);
          }}
          className={cn(
            'flex flex-col gap-3 rounded-2xl p-3 min-h-[160px] min-w-[240px] flex-1 transition-colors',
            col.bg,
            dragOverColumn === col.id && 'ring-2 ring-primary-500 ring-offset-2'
          )}
        >
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
                <div
                  key={m.id}
                  draggable={canEdit}
                  onDragStart={() => canEdit && setDraggingId(m.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={cn(
                    'bg-(--color-card) rounded-xl border border-(--color-card-border) p-4 shadow-sm select-none',
                    canEdit && 'cursor-grab active:cursor-grabbing',
                    draggingId === m.id && 'opacity-50'
                  )}
                >
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
                <span className="text-xs text-(--color-text-secondary) font-medium">
                  {canEdit ? 'Drop milestones here' : 'Nothing here'}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PortalMilestoneBoardView;
