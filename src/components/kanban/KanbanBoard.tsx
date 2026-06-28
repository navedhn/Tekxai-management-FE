import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Play, Square, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { KanbanTask, TaskStatus } from '@/services/tasksService';

// --- Types ---

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onUpdateTask: (taskId: string, updates: Partial<KanbanTask>) => void;
  onLogTime: (taskId: string, seconds: number) => void;
  onSelectTask: (task: KanbanTask) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: 'TODO',        label: 'To Do',       color: 'text-gray-600',   bg: 'bg-gray-50' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'text-blue-600',   bg: 'bg-blue-50' },
  { id: 'REVIEW',      label: 'In Review',   color: 'text-amber-600',  bg: 'bg-amber-50' },
  { id: 'DONE',        label: 'Done',        color: 'text-green-600',  bg: 'bg-green-50' },
];

const PRIORITY_STYLES: Record<string, string> = {
  LOW:      'bg-green-100 text-green-700 border-green-200',
  MEDIUM:   'bg-amber-100 text-amber-700 border-amber-200',
  HIGH:     'bg-orange-100 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
};

function getInitials(first: string, last?: string) {
  return `${first.charAt(0)}${last ? last.charAt(0) : ''}`.toUpperCase();
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// --- Timer hook ---

function useTaskTimer(taskId: string, onLogTime: (taskId: string, seconds: number) => void) {
  const storageKey = `task_timer_${taskId}`;
  const [startTime, setStartTime] = useState<number | null>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? parseInt(stored, 10) : null;
  });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) { setElapsed(0); return; }
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [startTime]);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (startTime) {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      localStorage.removeItem(storageKey);
      setStartTime(null);
      setElapsed(0);
      if (seconds > 0) onLogTime(taskId, seconds);
    } else {
      const now = Date.now();
      localStorage.setItem(storageKey, String(now));
      setStartTime(now);
    }
  }, [startTime, taskId, onLogTime, storageKey]);

  return { isRunning: !!startTime, elapsed, toggle };
}

// --- Task Card ---

interface TaskCardProps {
  task: KanbanTask;
  onLogTime: (taskId: string, seconds: number) => void;
  onSelect: (task: KanbanTask) => void;
  isDragging?: boolean;
}

function TaskCard({ task, onLogTime, onSelect, isDragging }: TaskCardProps) {
  const { isRunning, elapsed, toggle } = useTaskTimer(task.id, onLogTime);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE';

  return (
    <div
      onClick={() => onSelect(task)}
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-4 cursor-pointer shadow-sm hover:shadow-md transition-all select-none',
        isDragging && 'opacity-50',
        isRunning && 'ring-2 ring-blue-400'
      )}
    >
      {/* Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.MEDIUM)}>
          {task.priority}
        </span>
        <button
          onClick={toggle}
          title={isRunning ? 'Stop timer' : 'Start timer'}
          className={cn(
            'flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-colors',
            isRunning
              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          )}
        >
          {isRunning ? (
            <>
              <Square size={10} className="fill-blue-600" />
              <span className="font-mono">{formatSeconds(elapsed)}</span>
            </>
          ) : (
            <Play size={10} />
          )}
        </button>
      </div>

      {/* Title */}
      <p className="text-sm font-bold text-gray-800 mb-3 line-clamp-2">{task.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[9px] font-black text-white overflow-hidden">
              {task.assignee.avatar ? (
                <img src={task.assignee.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(task.assignee.first_name, task.assignee.last_name)
              )}
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              {task.assignee.first_name}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-300 italic">Unassigned</span>
        )}

        {/* Due Date */}
        {task.due_date && (
          <div className={cn('flex items-center gap-1 text-[11px] font-medium', isOverdue ? 'text-red-500' : 'text-gray-400')}>
            {isOverdue && <AlertCircle size={10} />}
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sortable Card ---

function SortableTaskCard({ task, onLogTime, onSelect }: { task: KanbanTask; onLogTime: (taskId: string, seconds: number) => void; onSelect: (task: KanbanTask) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onLogTime={onLogTime} onSelect={onSelect} isDragging={isDragging} />
    </div>
  );
}

// --- Column ---

function KanbanColumn({
  column,
  tasks,
  onLogTime,
  onSelect,
}: {
  column: typeof COLUMNS[number];
  tasks: KanbanTask[];
  onLogTime: (taskId: string, seconds: number) => void;
  onSelect: (task: KanbanTask) => void;
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl p-3 min-h-[200px] min-w-[260px] flex-1', column.bg)}>
      <div className="flex items-center justify-between px-1">
        <span className={cn('text-xs font-black uppercase tracking-wider', column.color)}>{column.label}</span>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-white/80', column.color)}>{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onLogTime={onLogTime} onSelect={onSelect} />
          ))}
          {tasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-8">
              <span className="text-xs text-gray-400 font-medium">Drop tasks here</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// --- Board ---

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onUpdateTask, onLogTime, onSelectTask }) => {
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const tasksByColumn = COLUMNS.reduce<Record<TaskStatus, KanbanTask[]>>(
    (acc, col) => {
      acc[col.id] = tasks.filter(t => t.status === col.id);
      return acc;
    },
    { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] }
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Determine which column the card was dropped over
    const overTask = tasks.find(t => t.id === over.id);
    let newStatus: TaskStatus | undefined;

    if (overTask) {
      newStatus = overTask.status;
    } else {
      // Dropped on a column id
      newStatus = over.id as TaskStatus;
    }

    if (newStatus && active.id) {
      const draggedTask = tasks.find(t => t.id === active.id);
      if (draggedTask && draggedTask.status !== newStatus) {
        onUpdateTask(String(active.id), { status: newStatus });
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByColumn[col.id]}
            onLogTime={onLogTime}
            onSelect={onSelectTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} onLogTime={onLogTime} onSelect={() => {}} />
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
