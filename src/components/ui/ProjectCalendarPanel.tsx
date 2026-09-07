import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flag, ListChecks, Rocket } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useMilestones } from '@/services/milestonesService';
import { useKanbanTasks } from '@/services/tasksService';

type CalendarEventType = 'milestone' | 'task' | 'delivery';

interface CalendarEvent {
  type: CalendarEventType;
  id: string;
  title: string;
  date: Date;
  overdue: boolean;
  completed: boolean;
  status?: string;
  priority?: string;
  assigneeName?: string | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_STYLE: Record<CalendarEventType, { icon: React.ComponentType<{ size?: number }>; chip: string; label: string }> = {
  milestone: { icon: Flag, chip: 'bg-[#F5F3FF] text-[#6941C6]', label: 'Milestone' },
  task: { icon: ListChecks, chip: 'bg-[#EFF8FF] text-[#175CD3]', label: 'Task' },
  delivery: { icon: Rocket, chip: 'bg-[#FFF6ED] text-[#B93815]', label: 'Delivery' },
};

interface ProjectCalendarPanelProps {
  projectId: string;
  projectEndDate?: string | null;
  onOpenMilestone?: () => void;
  onOpenTask?: () => void;
}

const ProjectCalendarPanel: React.FC<ProjectCalendarPanelProps> = ({
  projectId, projectEndDate, onOpenMilestone, onOpenTask,
}) => {
  const { data: milestones = [] } = useMilestones(projectId);
  const { data: tasks = [] } = useKanbanTasks(projectId);

  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [typeFilter, setTypeFilter] = useState<Record<CalendarEventType, boolean>>({
    milestone: true, task: true, delivery: true,
  });
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const events = useMemo(() => {
    const now = new Date();
    const list: CalendarEvent[] = [];

    if (projectEndDate) {
      const date = new Date(projectEndDate);
      list.push({
        type: 'delivery', id: 'project-delivery', title: 'Project Delivery Date',
        date, overdue: date < now, completed: false,
      });
    }

    milestones.forEach((m) => {
      if (!m.due_date) return;
      const date = new Date(m.due_date);
      list.push({
        type: 'milestone', id: m.id, title: m.title, date,
        overdue: !m.completed && date < now, completed: m.completed, status: m.status,
      });
    });

    tasks.forEach((t) => {
      if (!t.due_date) return;
      const date = new Date(t.due_date);
      const done = t.status === 'DONE';
      list.push({
        type: 'task', id: t.id, title: t.title, date,
        overdue: !done && date < now, completed: done, status: t.status, priority: t.priority,
        assigneeName: t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}`.trim() : null,
      });
    });

    return list.filter((e) => typeFilter[e.type]);
  }, [milestones, tasks, projectEndDate, typeFilter]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = e.date.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const toggleType = (t: CalendarEventType) => setTypeFilter((prev) => ({ ...prev, [t]: !prev[t] }));

  const openSource = (e: CalendarEvent) => {
    setSelected(e);
    if (e.type === 'milestone' && onOpenMilestone) onOpenMilestone();
    if (e.type === 'task' && onOpenTask) onOpenTask();
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-black text-gray-900 tracking-tight">Calendar</h3>
        <div className="flex items-center gap-1.5">
          {(Object.keys(TYPE_STYLE) as CalendarEventType[]).map((t) => {
            const { icon: Icon, label } = TYPE_STYLE[t];
            const active = typeFilter[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
                  active ? 'border-primary-200 bg-primary-50 text-primary-600' : 'border-gray-100 bg-gray-50 text-gray-400',
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-black text-gray-900">
            {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() - 1); return d; })}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCursor(() => { const d = new Date(); d.setDate(1); return d; })}
              className="text-xs font-bold text-primary-500 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() + 1); return d; })}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-black text-gray-400 uppercase py-2">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="min-h-[84px]" />;
            const date = new Date(year, month, day);
            const dayEvents = eventsByDay.get(date.toDateString()) || [];
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div
                key={day}
                className={cn(
                  'min-h-[84px] p-1.5 rounded-xl border flex flex-col gap-1 overflow-hidden',
                  isToday ? 'border-primary-300 bg-primary-50/40' : 'border-gray-100',
                )}
              >
                <span className={cn('text-[11px] font-bold', isToday ? 'text-primary-600' : 'text-gray-400')}>{day}</span>
                {dayEvents.slice(0, 3).map((e) => {
                  const { icon: Icon } = TYPE_STYLE[e.type];
                  return (
                    <button
                      type="button"
                      key={`${e.type}-${e.id}`}
                      title={e.title}
                      onClick={() => openSource(e)}
                      className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded truncate flex items-center gap-1 text-left',
                        e.overdue ? 'bg-[#FEF3F2] text-[#B42318]' : e.completed ? 'bg-[#ECFDF3] text-[#027A48]' : TYPE_STYLE[e.type].chip,
                      )}
                    >
                      <Icon size={9} />
                      <span className="truncate">{e.title}</span>
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] font-bold text-gray-400">+{dayEvents.length - 3} more</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {events.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-sm">
          No milestones, tasks, or delivery dates to show yet.
        </div>
      )}

      {selected && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50/40 p-4 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">{TYPE_STYLE[selected.type].label}</span>
            <span className="text-sm font-bold text-gray-800">{selected.title}</span>
            <span className="text-xs text-gray-500">
              {selected.date.toLocaleDateString()}
              {selected.assigneeName ? ` · ${selected.assigneeName}` : ''}
              {selected.priority ? ` · ${selected.priority}` : ''}
              {selected.status ? ` · ${selected.status}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs font-bold text-gray-400 hover:text-gray-600"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectCalendarPanel;
