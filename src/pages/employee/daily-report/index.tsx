import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, FileText, CheckCircle, XCircle, ClipboardList, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import { useToastContext } from '@/components/toast/ToastProvider';

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400';

const DEV_KEYWORDS = ['backend', 'frontend', 'full stack', 'fullstack', 'developer', 'software engineer', 'ai engineer', 'ai developer', 'ml engineer'];

function isDeveloper(designation?: string | null) {
  if (!designation) return false;
  const d = designation.toLowerCase();
  return DEV_KEYWORDS.some(k => d.includes(k));
}

// ── Shared project+tasks item editor (used by both Agenda and Report forms) ────

type ProjectItem = {
  project_id: string;
  project_name_freeform: string;
  tasks: string[]; // Agenda: plain task list
  completed_tasks: string[]; // Report: split into completed/pending
  pending_tasks: string[];
};

function emptyItem(): ProjectItem {
  return { project_id: '', project_name_freeform: '', tasks: [''], completed_tasks: [''], pending_tasks: [''] };
}

function useMyProjects() {
  return useQuery({
    queryKey: ['my-projects-for-planning'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.DAILY_PLANNING.MY_PROJECTS),
    select: (r: any) => r?.payload || [],
  });
}

function ProjectPicker({ item, onChange, myProjects }: { item: ProjectItem; onChange: (patch: Partial<ProjectItem>) => void; myProjects: any[] }) {
  const usingFreeform = !item.project_id;
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        className={inputCls}
        value={item.project_id}
        onChange={(e) => onChange({ project_id: e.target.value, project_name_freeform: e.target.value ? '' : item.project_name_freeform })}
      >
        <option value="">— Other / not listed —</option>
        {myProjects.map((p: any) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>
      {usingFreeform && (
        <input
          className={inputCls}
          placeholder="Project name"
          value={item.project_name_freeform}
          onChange={(e) => onChange({ project_name_freeform: e.target.value })}
        />
      )}
    </div>
  );
}

function TaskListEditor({ label, tasks, onChange }: { label: string; tasks: string[]; onChange: (tasks: string[]) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 block mb-1.5">{label}</label>
      <div className="space-y-1.5">
        {tasks.map((t, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              className={inputCls}
              value={t}
              placeholder="Describe a task…"
              onChange={(e) => { const next = [...tasks]; next[i] = e.target.value; onChange(next); }}
            />
            {tasks.length > 1 && (
              <button type="button" onClick={() => onChange(tasks.filter((_, j) => j !== i))}
                className="w-10 h-10 shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => onChange([...tasks, ''])}
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-1">
          <Plus size={12} />Add task
        </button>
      </div>
    </div>
  );
}

// ── Agenda Modal ─────────────────────────────────────────────────────────────

function AgendaModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToastContext();
  const { data: myProjects = [] } = useMyProjects();
  const [items, setItems] = useState<Array<ProjectItem & { estimated_hours: string }>>([{ ...emptyItem(), estimated_hours: '' }]);
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.DAILY_PLANNING.AGENDA, {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((it) => ({
          project_id: it.project_id || undefined,
          project_name_freeform: it.project_id ? undefined : it.project_name_freeform,
          tasks: it.tasks.filter((t) => t.trim()),
          estimated_hours: it.estimated_hours ? +it.estimated_hours : 0,
        })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-agenda-today'] });
      toast.success('Agenda submitted');
      onClose();
    },
    onError: (e: any) => setErr(e?.data?.message || e?.message || 'Failed to submit'),
  });

  const canSubmit = items.every((it) => (it.project_id || it.project_name_freeform.trim()) && it.tasks.some((t) => t.trim()));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-gray-900">Submit Today's Agenda</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-5">List what you plan to work on today, by project.</p>

        <div className="space-y-5">
          {items.map((item, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Project {idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <ProjectPicker item={item} myProjects={myProjects} onChange={(patch) => setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it))} />
              <TaskListEditor label="Tasks" tasks={item.tasks} onChange={(tasks) => setItems(items.map((it, i) => i === idx ? { ...it, tasks } : it))} />
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Estimated Time (hours)</label>
                <input type="number" min="0" max="24" step="0.5" className={inputCls}
                  value={item.estimated_hours}
                  onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, estimated_hours: e.target.value } : it))}
                  placeholder="8" />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setItems([...items, { ...emptyItem(), estimated_hours: '' }])}
            className="w-full h-10 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5">
            <Plus size={14} />Add another project
          </button>
        </div>

        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Submitting…' : 'Submit Agenda'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Modal ─────────────────────────────────────────────────────────────

function ReportModal({ onClose, agendaItems }: { onClose: () => void; agendaItems: any[] }) {
  const qc = useQueryClient();
  const toast = useToastContext();
  const user = useAuthStore(s => s.user);
  const showCodeDeployed = isDeveloper(user?.designation);
  const { data: myProjects = [] } = useMyProjects();

  // Pre-seed from today's agenda if it exists — the report is meant to
  // close out the same projects the agenda listed, per the spec's example.
  const seeded = agendaItems.length
    ? agendaItems.map((ai: any) => ({
        project_id: ai.project_id || '', project_name_freeform: ai.project?.title || ai.project_name_freeform || '',
        tasks: [], completed_tasks: [''], pending_tasks: [''],
      }))
    : [{ ...emptyItem() }];

  const [items, setItems] = useState<ProjectItem[]>(seeded);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [codeDeployed, setCodeDeployed] = useState<boolean | null>(null);
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.DAILY_PLANNING.REPORT, {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((it) => ({
          project_id: it.project_id || undefined,
          project_name_freeform: it.project_id ? undefined : it.project_name_freeform,
          completed_tasks: it.completed_tasks.filter((t) => t.trim()),
          pending_tasks: it.pending_tasks.filter((t) => t.trim()),
        })),
        additional_notes: additionalNotes || undefined,
        hours_worked: hoursWorked ? +hoursWorked : undefined,
        ...(showCodeDeployed && codeDeployed !== null ? { code_deployed: codeDeployed } : {}),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-report-today'] });
      qc.invalidateQueries({ queryKey: ['my-daily-reports'] });
      toast.success('Report submitted');
      onClose();
    },
    onError: (e: any) => setErr(e?.data?.message || e?.message || 'Failed to submit'),
  });

  const canSubmit = items.every((it) => it.project_id || it.project_name_freeform.trim());

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-gray-900">Submit Daily Report</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-5">Close out today's work — what got done, what's still pending.</p>

        <div className="space-y-5">
          {items.map((item, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Project {idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <ProjectPicker item={item} myProjects={myProjects} onChange={(patch) => setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it))} />
              <TaskListEditor label="Completed" tasks={item.completed_tasks} onChange={(completed_tasks) => setItems(items.map((it, i) => i === idx ? { ...it, completed_tasks } : it))} />
              <TaskListEditor label="Pending" tasks={item.pending_tasks} onChange={(pending_tasks) => setItems(items.map((it, i) => i === idx ? { ...it, pending_tasks } : it))} />
            </div>
          ))}
          <button type="button" onClick={() => setItems([...items, emptyItem()])}
            className="w-full h-10 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5">
            <Plus size={14} />Add another project
          </button>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Estimated Time (hours)</label>
            <input type="number" min="0" max="24" step="0.5" className={inputCls} value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} placeholder="8" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Additional Notes (optional)</label>
            <textarea className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="Anything else worth noting…" />
          </div>

          {showCodeDeployed && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <label className="text-xs font-semibold text-gray-600 block mb-2">Code Deployed to Live?</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCodeDeployed(true)}
                  className={cn('flex items-center gap-2 px-4 h-9 rounded-xl border text-sm font-semibold transition-colors',
                    codeDeployed === true ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50')}>
                  <CheckCircle size={15} />Yes
                </button>
                <button type="button" onClick={() => setCodeDeployed(false)}
                  className={cn('flex items-center gap-2 px-4 h-9 rounded-xl border text-sm font-semibold transition-colors',
                    codeDeployed === false ? 'bg-red-50 border-red-400 text-red-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50')}>
                  <XCircle size={15} />No
                </button>
              </div>
            </div>
          )}
        </div>

        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DailyReportPage() {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const user = useAuthStore(s => s.user);
  const showCodeDeployed = isDeveloper(user?.designation);

  const { data: complianceStatus } = useQuery({
    queryKey: ['timesheet-compliance-status'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.TIMESHEET.COMPLIANCE_STATUS),
    select: (r: any) => r?.payload,
    refetchInterval: 30000,
  });

  const { data: todaysAgenda } = useQuery({
    queryKey: ['daily-agenda-today'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.DAILY_PLANNING.AGENDA_TODAY),
    select: (r: any) => r?.payload,
  });

  const { data: todaysReport } = useQuery({
    queryKey: ['daily-report-today'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.DAILY_PLANNING.REPORT_TODAY),
    select: (r: any) => r?.payload,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['my-daily-reports'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PERFORMANCE.DAILY_REPORTS),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const reports: any[] = data || [];
  const hasOpenSession = !!complianceStatus?.has_open_session;
  const agendaSubmitted = !!todaysAgenda || !!complianceStatus?.agenda_submitted;
  const reportSubmitted = !!todaysReport || !!complianceStatus?.report_submitted;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Daily Planning</h1>
          <p className="text-sm text-gray-400 mt-0.5">Start your day with an agenda, close it out with a report</p>
        </div>
        <div className="flex gap-2">
          {/* Per spec: hide "Submit Daily Report" until the agenda exists —
              only offer Agenda submission first. */}
          {hasOpenSession && !agendaSubmitted && (
            <button onClick={() => setShowAgendaModal(true)}
              className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
              <ClipboardList size={16} />Submit Today's Agenda
            </button>
          )}
          {agendaSubmitted && !reportSubmitted && (
            <button onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
              <Plus size={16} />Submit Daily Report
            </button>
          )}
        </div>
      </div>

      {hasOpenSession && !agendaSubmitted && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <ClipboardList size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            You're clocked in — submit today's agenda to get started. Daily Report will unlock once it's in.
          </p>
        </div>
      )}
      {agendaSubmitted && !reportSubmitted && hasOpenSession && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <FileText size={18} className="text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 font-medium">
            Agenda submitted for today. Submit your Daily Report before checking out.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-semibold">No reports submitted yet</p>
            <p className="text-xs text-gray-300 mt-1">Submit your first daily report</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Date', 'Notes', 'Hours', ...(showCodeDeployed ? ['Deployed'] : [])].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-gray-900 whitespace-nowrap">
                      {r.date ? new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-600 max-w-[320px]">
                      {r.items?.length ? (
                        <div className="space-y-1">
                          {r.items.map((it: any) => (
                            <p key={it.id} className="text-xs leading-relaxed">
                              <span className="font-semibold">{it.project?.title || it.project_name_freeform}:</span>{' '}
                              {(it.completed_tasks || []).length} done, {(it.pending_tasks || []).length} pending
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="line-clamp-2 text-xs leading-relaxed">{r.todays_progress || '—'}</p>
                      )}
                    </td>
                    <td className="py-3 px-2 font-semibold text-gray-700">
                      {r.hours_worked != null ? `${r.hours_worked}h` : '—'}
                    </td>
                    {showCodeDeployed && (
                      <td className="py-3 px-2">
                        {r.code_deployed === true ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold">
                            <CheckCircle size={11} />Yes
                          </span>
                        ) : r.code_deployed === false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold">
                            <XCircle size={11} />No
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAgendaModal && <AgendaModal onClose={() => setShowAgendaModal(false)} />}
      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} agendaItems={todaysAgenda?.items || []} />}
    </div>
  );
}
