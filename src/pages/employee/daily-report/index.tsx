import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, CheckCircle, XCircle, ClipboardList, Trash2, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import { useToastContext } from '@/components/toast/ToastProvider';
import { getSocket } from '@/lib/socket';
import { PageActionButton } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import DashboardStatCard from '@/components/ui/DashboardStatCard';
import { PageSkeleton } from '@/components/skeletons';
import { useShowPageSkeleton } from '@/hooks/useShowPageSkeleton';

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400';

const DEV_KEYWORDS = ['backend', 'frontend', 'full stack', 'fullstack', 'developer', 'software engineer', 'ai engineer', 'ai developer', 'ml engineer'];

function isDeveloper(designation?: string | null) {
  if (!designation) return false;
  const d = designation.toLowerCase();
  return DEV_KEYWORDS.some(k => d.includes(k));
}

type ProjectItem = {
  project_id: string;
  project_name_freeform: string;
  tasks: string[];
  completed_tasks: string[];
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
    <div className={cn('grid gap-2', usingFreeform ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
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
      <label className="text-xs font-semibold text-(--color-text-secondary) block mb-1.5">{label}</label>
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
                className="w-10 h-10 shrink-0 flex items-center justify-center text-(--color-text-secondary) hover:text-red-500 hover:bg-red-50 rounded-xl">
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

function AgendaModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="min-w-0 pr-2">
          <h3 className="text-lg font-black text-(--color-text-primary)">Submit Today's Agenda</h3>
          <p className="text-xs text-(--color-text-secondary) font-medium mt-1">List what you plan to work on today, by project.</p>
        </div>
      }
      bodyClassName="!p-4 sm:!p-6"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40"
          >
            {mutation.isPending ? 'Submitting…' : 'Submit Agenda'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {items.map((item, idx) => (
          <div key={idx} className="p-3 sm:p-4 bg-gray-50 rounded-2xl border border-(--color-card-border) space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-(--color-text-secondary) uppercase tracking-wide">Project {idx + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-(--color-text-secondary) hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <ProjectPicker item={item} myProjects={myProjects} onChange={(patch) => setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it))} />
            <TaskListEditor label="Tasks" tasks={item.tasks} onChange={(tasks) => setItems(items.map((it, i) => i === idx ? { ...it, tasks } : it))} />
            <div>
              <label className="text-xs font-semibold text-(--color-text-secondary) block mb-1.5">Estimated Time (hours)</label>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                className={inputCls}
                value={item.estimated_hours}
                onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, estimated_hours: e.target.value } : it))}
                placeholder="8"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems([...items, { ...emptyItem(), estimated_hours: '' }])}
          className="w-full h-10 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-(--color-text-secondary) hover:bg-gray-50 flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />Add another project
        </button>
        {err && <p className="text-red-500 text-xs">{err}</p>}
      </div>
    </Modal>
  );
}

function ReportModal({ isOpen, onClose, agendaItems }: { isOpen: boolean; onClose: () => void; agendaItems: any[] }) {
  const qc = useQueryClient();
  const toast = useToastContext();
  const user = useAuthStore(s => s.user);
  const showCodeDeployed = isDeveloper(user?.designation);
  const { data: myProjects = [] } = useMyProjects();

  const seeded = agendaItems.length
    ? agendaItems.map((ai: any) => ({
        project_id: ai.project_id || '', project_name_freeform: ai.project?.title || ai.project_name_freeform || '',
        tasks: [], completed_tasks: [''], pending_tasks: [''],
      }))
    : [{ ...emptyItem() }];

  const [items, setItems] = useState<ProjectItem[]>(seeded);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
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
        blockers: blockers || undefined,
        tomorrow_plan: tomorrowPlan || undefined,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="min-w-0 pr-2">
          <h3 className="text-lg font-black text-(--color-text-primary)">Submit Daily Report</h3>
          <p className="text-xs text-(--color-text-secondary) font-medium mt-1">Close out today's work — what got done, what's still pending.</p>
        </div>
      }
      bodyClassName="!p-4 sm:!p-6"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40"
          >
            {mutation.isPending ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {items.map((item, idx) => (
          <div key={idx} className="p-3 sm:p-4 bg-gray-50 rounded-2xl border border-(--color-card-border) space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-(--color-text-secondary) uppercase tracking-wide">Project {idx + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-(--color-text-secondary) hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <ProjectPicker item={item} myProjects={myProjects} onChange={(patch) => setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it))} />
            <TaskListEditor label="Completed" tasks={item.completed_tasks} onChange={(completed_tasks) => setItems(items.map((it, i) => i === idx ? { ...it, completed_tasks } : it))} />
            <TaskListEditor label="Pending" tasks={item.pending_tasks} onChange={(pending_tasks) => setItems(items.map((it, i) => i === idx ? { ...it, pending_tasks } : it))} />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems([...items, emptyItem()])}
          className="w-full h-10 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-(--color-text-secondary) hover:bg-gray-50 flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />Add another project
        </button>

        <div>
          <label className="text-xs font-semibold text-(--color-text-secondary) block mb-1.5">Estimated Time (hours)</label>
          <input type="number" min="0" max="24" step="0.5" className={inputCls} value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} placeholder="8" />
        </div>
        <div>
          <label className="text-xs font-semibold text-(--color-text-secondary) block mb-1.5">Additional Notes (optional)</label>
          <textarea
            className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Anything else worth noting…"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-(--color-text-secondary) block mb-1.5">Blockers (optional)</label>
          <textarea
            className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder="Anything blocking your progress…"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-(--color-text-secondary) block mb-1.5">Tomorrow's Plan (optional)</label>
          <textarea
            className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
            value={tomorrowPlan}
            onChange={(e) => setTomorrowPlan(e.target.value)}
            placeholder="What you plan to work on next…"
          />
        </div>

        {showCodeDeployed && (
          <div className="p-3 bg-gray-50 rounded-xl border border-(--color-card-border)">
            <label className="text-xs font-semibold text-gray-600 block mb-2">Code Deployed to Live?</label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setCodeDeployed(true)}
                className={cn(
                  'flex items-center gap-2 px-4 h-9 rounded-xl border text-sm font-semibold transition-colors',
                  codeDeployed === true ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-(--color-text-secondary) hover:bg-gray-50'
                )}
              >
                <CheckCircle size={15} />Yes
              </button>
              <button
                type="button"
                onClick={() => setCodeDeployed(false)}
                className={cn(
                  'flex items-center gap-2 px-4 h-9 rounded-xl border text-sm font-semibold transition-colors',
                  codeDeployed === false ? 'bg-red-50 border-red-400 text-red-600' : 'bg-white border-gray-200 text-(--color-text-secondary) hover:bg-gray-50'
                )}
              >
                <XCircle size={15} />No
              </button>
            </div>
          </div>
        )}
        {err && <p className="text-red-500 text-xs">{err}</p>}
      </div>
    </Modal>
  );
}

export default function DailyReportPage() {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const user = useAuthStore(s => s.user);
  const showCodeDeployed = isDeveloper(user?.designation);

  const qc = useQueryClient();

  const { data: complianceStatus, isLoading: complianceLoading } = useQuery({
    queryKey: ['timesheet-compliance-status'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.TIMESHEET.COMPLIANCE_STATUS),
    select: (r: any) => r?.payload,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: todaysAgenda, isLoading: agendaLoading } = useQuery({
    queryKey: ['daily-agenda-today'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.DAILY_PLANNING.AGENDA_TODAY),
    select: (r: any) => r?.payload,
    refetchOnWindowFocus: true,
  });

  const { data: todaysReport, isLoading: todayReportLoading } = useQuery({
    queryKey: ['daily-report-today'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.DAILY_PLANNING.REPORT_TODAY),
    select: (r: any) => r?.payload,
    refetchOnWindowFocus: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['my-daily-reports'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PERFORMANCE.DAILY_REPORTS),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });
  const showPageSkeleton = useShowPageSkeleton(complianceLoading, agendaLoading, todayReportLoading, isLoading);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) return;

    const invalidateAttendanceState = () => {
      qc.invalidateQueries({ queryKey: ['timesheet-compliance-status'] });
      qc.invalidateQueries({ queryKey: ['daily-agenda-today'] });
      qc.invalidateQueries({ queryKey: ['daily-report-today'] });
    };

    const handlePresenceUpdate = ({ userId }: { userId: string }) => {
      if (userId === user.id) invalidateAttendanceState();
    };

    let hasConnectedBefore = socket.connected;
    const handleConnect = () => {
      if (hasConnectedBefore) invalidateAttendanceState();
      hasConnectedBefore = true;
    };

    socket.on('presence:update', handlePresenceUpdate);
    socket.on('connect', handleConnect);
    return () => {
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('connect', handleConnect);
    };
  }, [qc, user?.id]);

  const reports: any[] = data || [];
  const hasOpenSession = !!complianceStatus?.has_open_session;
  const agendaSubmitted = !!todaysAgenda || !!complianceStatus?.agenda_submitted;
  const reportSubmitted = !!todaysReport || !!complianceStatus?.report_submitted;

  if (showPageSkeleton) return <PageSkeleton variant="timesheet" />;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-(--color-text-primary) tracking-tight">Daily Report</h1>
          <p className="text-sm text-(--color-text-secondary) font-medium mt-0.5">Start your day with an agenda, close it out with a report</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {!agendaSubmitted && (
            <PageActionButton leftIcon={ClipboardList} onClick={() => setShowAgendaModal(true)}>
              Submit Today's Agenda
            </PageActionButton>
          )}
          {!reportSubmitted && (
            <PageActionButton leftIcon={Plus} onClick={() => setShowReportModal(true)}>
              Submit Daily Report
            </PageActionButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard
          className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
          icon={<ClipboardList size={18} />}
          iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
          value={agendaSubmitted ? 'Done' : 'Pending'}
          label="Today's Agenda"
          subtext={agendaSubmitted ? 'Submitted' : 'Needs submission'}
        />
        <DashboardStatCard
          className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
          icon={<FileText size={18} />}
          iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
          value={reportSubmitted ? 'Done' : 'Pending'}
          label="Daily Report"
          subtext={reportSubmitted ? 'Submitted' : 'Needs submission'}
        />
        <DashboardStatCard
          className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
          icon={<Clock size={18} />}
          iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
          value={todaysReport?.hours_worked != null ? `${todaysReport.hours_worked}h` : '—'}
          label="Hours Today"
          subtext={hasOpenSession ? 'Open session' : 'No open session'}
        />
        <DashboardStatCard
          className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
          icon={<CheckCircle size={18} />}
          iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
          value={reports.length}
          label="Reports History"
          subtext="All submitted reports"
        />
      </div>

      <Card className="border border-(--color-card-border) shadow-sm !p-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-(--color-card-border)">
          <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
            <FileText size={16} />
          </div>
          <h2 className="text-lg font-black text-(--color-text-primary) tracking-tight">Report History</h2>
        </div>
        <div className="p-4">
        {reports.length === 0 ? (
          <div className="py-14 text-center">
            <FileText size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-(--color-text-secondary) font-medium">No reports submitted yet</p>
            <p className="text-xs text-(--color-text-secondary) mt-1">Submit your first daily report</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--color-card-border) bg-(--color-elevated)">
                  {['Date', 'Notes', 'Hours', ...(showCodeDeployed ? ['Deployed'] : [])].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide py-3 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-(--color-text-primary) whitespace-nowrap">
                      {r.date ? new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="py-3 px-3 text-gray-600 max-w-[320px]">
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
                    <td className="py-3 px-3 font-semibold text-gray-700">
                      {r.hours_worked != null ? `${r.hours_worked}h` : '—'}
                    </td>
                    {showCodeDeployed && (
                      <td className="py-3 px-3">
                        {r.code_deployed === true ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold">
                            <CheckCircle size={11} />Yes
                          </span>
                        ) : r.code_deployed === false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-(--color-text-secondary) rounded-lg text-xs font-semibold">
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
      </Card>

      {showAgendaModal && (
        <AgendaModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)} />
      )}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          agendaItems={todaysAgenda?.items || []}
        />
      )}
    </div>
  );
}
