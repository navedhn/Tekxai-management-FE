import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle2, XCircle, ClipboardList, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const inputCls = 'w-full h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Compares each agenda task to the report's completed/pending lists for the
// same project by fuzzy text match — good enough for a visual diff, not
// meant as an exact-string audit trail.
function taskStatus(task: string, item: any | undefined) {
  if (!item) return 'unknown';
  const norm = (s: string) => s.trim().toLowerCase();
  if ((item.completed_tasks || []).some((t: string) => norm(t) === norm(task))) return 'done';
  if ((item.pending_tasks || []).some((t: string) => norm(t) === norm(task))) return 'pending';
  return 'unaddressed';
}

export default function ManagerReviewPage() {
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(todayStr());

  const { data: users } = useQuery({
    queryKey: ['user-list-brief-review'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200`),
    select: (r: any) => [...(r?.payload?.records || [])].sort((a: any, b: any) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)),
  });
  const filteredUsers = search.trim()
    ? ((users || []) as any[]).filter((u: any) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()))
    : [];
  const selectedUser = (users || []).find((u: any) => u.id === userId);

  const { data: agenda } = useQuery({
    queryKey: ['manager-review-agenda', userId, date],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.DAILY_PLANNING.AGENDA_FOR(userId, date)),
    select: (r: any) => r?.payload,
    enabled: !!userId && !!date,
  });
  const { data: report } = useQuery({
    queryKey: ['manager-review-report', userId, date],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.DAILY_PLANNING.REPORT_FOR(userId, date)),
    select: (r: any) => r?.payload,
    enabled: !!userId && !!date,
  });

  const timelineEvents = [
    agenda?.submitted_at && { label: 'Agenda Submitted', at: agenda.submitted_at, icon: ClipboardList },
    report?.created_at && { label: 'Report Submitted', at: report.created_at, icon: FileText },
  ].filter(Boolean) as Array<{ label: string; at: string; icon: any }>;
  timelineEvents.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manager Review</h1>
        <p className="text-sm text-gray-500 font-medium mt-0.5">Compare an employee's Daily Agenda against their Daily Report</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className={cn(inputCls, 'pl-8')} placeholder="Search employee…" value={selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : search}
              onChange={(e) => { setSearch(e.target.value); setUserId(''); }} />
          </div>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} max={todayStr()} />
        </div>
        {search.trim() && !userId && (
          <div className="flex flex-wrap gap-2">
            {filteredUsers.slice(0, 20).map((u: any) => (
              <button key={u.id} onClick={() => { setUserId(u.id); setSearch(''); }}
                className="px-3 h-8 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-300 text-gray-700 hover:text-primary-700 rounded-lg text-xs font-semibold transition-colors">
                {u.first_name} {u.last_name}
              </button>
            ))}
            {filteredUsers.length === 0 && <p className="text-xs text-gray-400 py-2">No employees found</p>}
          </div>
        )}
      </div>

      {userId && (
        <>
          {/* Daily Timeline — built from the timestamps this feature itself
              captures (agenda/report submission). Check-in/out and break
              start/end events aren't shown here: attendance doesn't expose a
              per-day admin lookup in this app today, and break start/end
              times aren't persisted as a log (only current status) — both
              would need their own follow-up work to surface here. */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-black text-gray-700 mb-3">Daily Timeline</h2>
            {timelineEvents.length === 0 ? (
              <p className="text-xs text-gray-400">No agenda or report activity recorded for this date yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {timelineEvents.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-xs font-mono text-gray-400 w-16">{new Date(ev.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <ev.icon size={14} className="text-primary-500" />
                    <span className="text-gray-700 font-medium">{ev.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-black text-gray-700 mb-3">Agenda vs Report</h2>
            {!agenda ? (
              <p className="text-xs text-gray-400">No agenda submitted for this date.</p>
            ) : (
              <div className="space-y-4">
                {(agenda.items || []).map((agendaItem: any) => {
                  const projectLabel = agendaItem.project?.title || agendaItem.project_name_freeform;
                  const reportItem = (report?.items || []).find((ri: any) =>
                    (ri.project_id && ri.project_id === agendaItem.project_id) ||
                    (ri.project_name_freeform && ri.project_name_freeform === agendaItem.project_name_freeform)
                  );
                  return (
                    <div key={agendaItem.id} className="border border-gray-100 rounded-xl p-3">
                      <p className="text-xs font-black text-gray-700 mb-2">{projectLabel}</p>
                      <div className="space-y-1">
                        {(agendaItem.tasks || []).map((task: string, i: number) => {
                          const status = taskStatus(task, reportItem);
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              {status === 'done' ? (
                                <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                              ) : (
                                <XCircle size={13} className="text-red-400 shrink-0" />
                              )}
                              <span className={cn(status === 'done' ? 'text-gray-700' : 'text-gray-500')}>{task}</span>
                              {status === 'unaddressed' && <span className="text-[10px] text-amber-600 font-semibold">not in report</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {!report && <p className="text-xs text-amber-600 font-semibold mt-2">No report submitted yet for this date — everything above is unaddressed.</p>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
