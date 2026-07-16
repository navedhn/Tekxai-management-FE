import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, CalendarClock, AlertTriangle, ListTodo, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useMeetingDashboard } from '@/services/meetingService';

function StatCard({ icon: Icon, color, label, value, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:shadow-md hover:border-gray-200 cursor-pointer active:scale-[0.98]' : 'cursor-default',
      )}
    >
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value ?? '—'}</p>
      </div>
      {onClick && <span className="ml-auto text-xs text-gray-300 font-medium">View →</span>}
    </button>
  );
}

export default function MeetingDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useMeetingDashboard();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Meeting Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of meeting rooms, upcoming meetings and action items</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Video} color="bg-blue-500" label="Active Meeting Rooms" value={data?.active_meeting_rooms} onClick={() => navigate('/admin/meetings/rooms?status=ACTIVE')} />
        <StatCard icon={AlertTriangle} color="bg-red-500" label="Overdue Action Items" value={data?.overdue_action_items} onClick={() => navigate('/admin/meetings/action-items?overdue=1')} />
        <StatCard icon={ListTodo} color="bg-amber-500" label="Pending Agenda Items" value={data?.pending_agenda_items} />
        <StatCard icon={CheckCircle2} color="bg-green-500" label="Completed Meetings" value={data?.completed_meetings} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={18} className="text-primary-500" />
            <h2 className="font-bold text-gray-900">Upcoming Meetings</h2>
          </div>
          {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
          {!isLoading && (data?.upcoming_meetings?.length ?? 0) === 0 && (
            <p className="text-sm text-gray-400">No upcoming meetings scheduled.</p>
          )}
          <ul className="flex flex-col gap-3">
            {data?.upcoming_meetings?.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/meetings/meeting/${m.id}`)}
              >
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{m.title}</p>
                  <p className="text-xs text-gray-400">{m.room?.name}</p>
                </div>
                <span className="text-xs font-medium text-gray-500">{new Date(m.scheduled_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col items-start gap-3">
          <h2 className="font-bold text-gray-900">Quick Actions</h2>
          <button
            className="w-full text-left px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 font-semibold text-sm text-gray-700"
            onClick={() => navigate('/admin/meetings/rooms')}
          >
            Browse Meeting Rooms →
          </button>
          <button
            className="w-full text-left px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 font-semibold text-sm text-gray-700"
            onClick={() => navigate('/admin/meetings/action-items')}
          >
            Manage Action Items →
          </button>
        </div>
      </div>
    </div>
  );
}
