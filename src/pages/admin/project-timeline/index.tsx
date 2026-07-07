import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flag, Rocket, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Loader from '@/components/ui/Loader';
import { useGetProjects } from '@/services/projectService';

interface DayEvent {
  type: 'delivery' | 'milestone';
  title: string;
  projectTitle: string;
  projectId: string;
  date: Date;
  overdue: boolean;
  completed?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ProjectTimeline: React.FC = () => {
  const { data: projects, isLoading } = useGetProjects({ limit: 1000 });
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const events = useMemo(() => {
    const list: DayEvent[] = [];
    const now = new Date();
    (projects || []).forEach((p) => {
      if (p.end_date) {
        const date = new Date(p.end_date);
        list.push({
          type: 'delivery', title: 'Delivery Date', projectTitle: p.title, projectId: p.id,
          date, overdue: !!p.is_overdue,
        });
      }
      (p.milestones || []).forEach((m) => {
        if (!m.due_date) return;
        const date = new Date(m.due_date);
        list.push({
          type: 'milestone', title: m.title, projectTitle: p.title, projectId: p.id,
          date, overdue: !m.completed && date < now, completed: m.completed,
        });
      });
    });
    return list;
  }, [projects]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    events.forEach((e) => {
      const key = e.date.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const delayedEvents = useMemo(() => {
    return events.filter((e) => e.overdue).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader size={48} /></div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Project Timeline</h1>
        <p className="text-sm text-gray-500 font-medium">Milestones, deliveries, and delays across all projects.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1 flex flex-col gap-4 shadow-2xl border-none p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">
              {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() - 1); return d; })}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCursor(() => { const d = new Date(); d.setDate(1); return d; })}
                className="text-xs font-bold text-primary-500 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() + 1); return d; })}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-black text-gray-400 uppercase py-2">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="min-h-[90px]" />;
              const date = new Date(year, month, day);
              const dayEvents = eventsByDay.get(date.toDateString()) || [];
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={day}
                  className={cn(
                    'min-h-[90px] p-1.5 rounded-xl border flex flex-col gap-1 overflow-hidden',
                    isToday ? 'border-primary-300 bg-primary-50/40' : 'border-gray-100'
                  )}
                >
                  <span className={cn('text-[11px] font-bold', isToday ? 'text-primary-600' : 'text-gray-400')}>{day}</span>
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <div
                      key={idx}
                      title={`${e.projectTitle}: ${e.title}`}
                      className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded truncate flex items-center gap-1',
                        e.overdue ? 'bg-[#FEF3F2] text-[#B42318]' : e.completed ? 'bg-[#ECFDF3] text-[#027A48]' : e.type === 'delivery' ? 'bg-[#EFF8FF] text-[#175CD3]' : 'bg-[#F5F3FF] text-[#6941C6]'
                      )}
                    >
                      {e.type === 'delivery' ? <Rocket size={9} /> : <Flag size={9} />}
                      <span className="truncate">{e.projectTitle}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] font-bold text-gray-400">+{dayEvents.length - 3} more</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="w-full lg:w-[340px] shrink-0 flex flex-col gap-4 shadow-2xl border-none p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#C01048]" />
            <h2 className="text-lg font-black text-gray-900">Delays ({delayedEvents.length})</h2>
          </div>
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto no-scrollbar">
            {delayedEvents.length === 0 && (
              <span className="text-xs text-gray-400 italic">No delayed items — everything on track.</span>
            )}
            {delayedEvents.map((e, i) => (
              <div key={i} className="flex flex-col gap-1 p-3 bg-[#FEF3F2]/60 rounded-xl">
                <div className="flex items-center justify-between">
                  <Badge variant="warning" className="bg-[#FEF3F2] text-[#B42318] border-[#FECDCA] border rounded-md px-2 py-0.5 text-[9px] font-black">
                    {e.type === 'delivery' ? 'Delivery' : 'Milestone'}
                  </Badge>
                  <span className="text-[10px] font-bold text-gray-400">{e.date.toLocaleDateString()}</span>
                </div>
                <span className="text-sm font-bold text-gray-800">{e.title}</span>
                <span className="text-xs text-gray-500">{e.projectTitle}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProjectTimeline;
