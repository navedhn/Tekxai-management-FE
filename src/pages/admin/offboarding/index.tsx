import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Input from '@/components/ui/Input';
import { UserMinus, Plus, ListChecks, LogOut, ArrowRightCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetOffboardingTasks, useCreateOffboardingTask, useSetOffboardingTaskStatus, useGetExitDetail } from '@/services/offboardingService';
import {
  useEnterNoticePeriodMutation, useRequestTerminateProbationMutation, useMoveToExitClearanceMutation,
} from '@/services/userService';

function useEmployeesByStage(stage: string) {
  return useQuery({
    queryKey: ['employees', 'lifecycle-stage', stage],
    queryFn: async () => {
      const r = await apiRequest<any>(`${API_ENDPOINTS.EMPLOYEE.LIST}?lifecycle_stage=${stage}&limit=100`);
      return r?.payload?.records || [];
    },
    staleTime: 30000,
  });
}

const CATEGORY_LABELS: Record<string, string> = { HR: 'HR Clearance', IT: 'IT Clearance', MANAGER: 'Manager Clearance', FINANCE: 'Finance Clearance', ASSETS: 'Asset Clearance', GENERAL: 'Other' };
const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-gray-50 text-gray-400 border-gray-100',
  IN_PROGRESS: 'bg-blue-50 text-blue-600 border-blue-100',
  COMPLETED: 'bg-green-50 text-green-600 border-green-100',
  BLOCKED: 'bg-red-50 text-red-600 border-red-100',
};

const OffboardingPage: React.FC = () => {
  const { data: exitClearanceEmployees = [], isLoading } = useEmployeesByStage('EXIT_CLEARANCE');
  const { data: noticePeriodEmployees = [], isLoading: noticeLoading } = useEmployeesByStage('NOTICE_PERIOD');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [showInitiate, setShowInitiate] = useState(false);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserMinus size={22} className="text-red-500" />
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Offboarding</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Centralized exit workflow — notice period, clearance tasks, and final closure.</p>
          </div>
        </div>
        <Button size="sm" variant="primary" className="rounded-xl gap-1.5 h-9" onClick={() => setShowInitiate(true)}>
          <LogOut size={14} /> Initiate Offboarding
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notice Period</p>
        {noticeLoading ? (
          <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
        ) : noticePeriodEmployees.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No employees currently in Notice Period.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {noticePeriodEmployees.map((e: any) => (
              <NoticePeriodRow key={e.id} employee={e} onOpenExit={() => setSelected({ id: e.id, name: `${e.first_name} ${e.last_name}` })} />
            ))}
          </div>
        )}
      </Card>

      <Card className="border-none shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Exit Clearance</p>
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
        ) : exitClearanceEmployees.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No employees currently in Exit Clearance.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {exitClearanceEmployees.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-black text-sm">
                    {e.first_name?.[0]}{e.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{e.first_name} {e.last_name}</p>
                    <p className="text-xs text-gray-400">{e.designation || e.department?.name || '—'}</p>
                  </div>
                </div>
                <Button
                  size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs"
                  onClick={() => setSelected({ id: e.id, name: `${e.first_name} ${e.last_name}` })}
                >
                  <ListChecks size={12} /> Exit Clearance
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <ExitDetailModal userId={selected.id} userName={selected.name} onClose={() => setSelected(null)} />
      )}

      {showInitiate && (
        <InitiateOffboardingModal onClose={() => setShowInitiate(false)} />
      )}
    </div>
  );
};

function NoticePeriodRow({ employee: e, onOpenExit }: { employee: any; onOpenExit: () => void }) {
  const toast = useToastContext();
  const moveToExitClearance = useMoveToExitClearanceMutation();

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
          {e.first_name?.[0]}{e.last_name?.[0]}
        </div>
        <div>
          <p className="font-black text-gray-900">{e.first_name} {e.last_name}</p>
          <p className="text-xs text-gray-400">{e.designation || e.department?.name || '—'}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={onOpenExit}>
          <ListChecks size={12} /> Exit Details
        </Button>
        <Button
          size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs"
          loading={moveToExitClearance.isPending}
          onClick={() => {
            moveToExitClearance.mutate(e.id, {
              onSuccess: () => toast.success(`${e.first_name} moved to Exit Clearance`),
              onError: (err: any) => toast.error(err?.message || (err?.status === 409 ? 'Requirements not met for Exit Clearance' : 'Failed to move to Exit Clearance')),
            });
          }}
        >
          <ArrowRightCircle size={12} /> Move to Exit Clearance
        </Button>
      </div>
    </div>
  );
}

function InitiateOffboardingModal({ onClose }: { onClose: () => void }) {
  const toast = useToastContext();
  const { data: activeEmployees = [], isLoading: activeLoading } = useEmployeesByStage('ACTIVE_EMPLOYMENT');
  const { data: probationEmployees = [], isLoading: probationLoading } = useEmployeesByStage('PROBATION');
  const enterNoticePeriod = useEnterNoticePeriodMutation();
  const requestTerminateProbation = useRequestTerminateProbationMutation();

  const [employeeId, setEmployeeId] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState('');
  const [exitType, setExitType] = useState<'RESIGNATION' | 'TERMINATION'>('RESIGNATION');
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [reason, setReason] = useState('');

  const candidates = useMemo(() => [
    ...activeEmployees.map((e: any) => ({ ...e, __stage: 'ACTIVE_EMPLOYMENT' })),
    ...probationEmployees.map((e: any) => ({ ...e, __stage: 'PROBATION' })),
  ], [activeEmployees, probationEmployees]);

  const options = candidates.map((e: any) => ({
    value: e.id,
    label: `${e.first_name} ${e.last_name}`.trim(),
    description: e.__stage === 'PROBATION' ? 'Probation' : (e.designation || e.department?.name || 'Active Employment'),
  }));

  const selectedEmployee = candidates.find((e: any) => e.id === employeeId);
  const isProbation = selectedEmployee?.__stage === 'PROBATION';
  const isLoading = activeLoading || probationLoading;
  const isPending = enterNoticePeriod.isPending || requestTerminateProbation.isPending;

  const handleSubmit = () => {
    if (!selectedEmployee) { toast.error('Select an employee'); return; }

    if (isProbation) {
      // Probation exits always go through the existing termination-approval
      // mechanism — exit_type is fixed TERMINATION here, never a free
      // choice, since a probation exit is inherently involuntary in this
      // workflow (matches the pre-existing behavior this feature extends).
      requestTerminateProbation.mutate({ userId: selectedEmployee.id, reason: reason || undefined, last_working_date: lastWorkingDate || undefined }, {
        onSuccess: () => {
          toast.success(`Termination request submitted for ${selectedEmployee.first_name} — pending approval`);
          onClose();
        },
        onError: (e: any) => toast.error(e?.message || 'Failed to submit termination request'),
      });
      return;
    }

    enterNoticePeriod.mutate({
      userId: selectedEmployee.id,
      notice_period_days: noticePeriodDays ? Number(noticePeriodDays) : undefined,
      exit_type: exitType,
      exit_reason: reason || undefined,
      last_working_date: lastWorkingDate || undefined,
    }, {
      onSuccess: () => {
        toast.success(`${selectedEmployee.first_name} moved to Notice Period`);
        onClose();
      },
      onError: (e: any) => toast.error(e?.message || (e?.status === 409 ? 'Requirements not met for Notice Period' : 'Failed to enter Notice Period')),
    });
  };

  return (
    <Modal isOpen onClose={onClose} title="Initiate Offboarding">
      <div className="flex flex-col gap-4 mt-4">
        <SearchableSelect
          label="Employee"
          options={options}
          value={employeeId}
          onChange={(v) => setEmployeeId(v ? String(v) : '')}
          loading={isLoading}
          placeholder="Select an employee"
          emptyMessage="No active or probation employees found"
        />

        {selectedEmployee && (
          isProbation ? (
            <>
              <p className="text-sm text-gray-500 font-medium">
                {selectedEmployee.first_name} is currently on Probation. This submits a termination request for
                HR/Admin approval — it does not change their lifecycle stage immediately. Exit details (type,
                reason, last working date) are only recorded once the request is actually approved.
              </p>
              <Input label="Reason (optional)" value={reason} onChange={(e: any) => setReason(e.target.value)} placeholder="Why is probation being terminated?" />
              <Input label="Last Working Date (optional)" type="date" value={lastWorkingDate} onChange={(e: any) => setLastWorkingDate(e.target.value)} />
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 font-medium">
                This moves {selectedEmployee.first_name} into Notice Period immediately.
              </p>
              <div>
                <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Exit Type</label>
                <div className="flex gap-2 mt-1.5">
                  {(['RESIGNATION', 'TERMINATION'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setExitType(t)}
                      className={cn('flex-1 h-10 rounded-xl border text-xs font-black uppercase', exitType === t ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-500')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Last Working Date (optional)" type="date" value={lastWorkingDate} onChange={(e: any) => setLastWorkingDate(e.target.value)} />
              <Input label="Reason / Notes (optional)" value={reason} onChange={(e: any) => setReason(e.target.value)} placeholder="Resignation reason or notes" />
              <Input
                label="Notice Period (days, optional)"
                type="number"
                min={0}
                value={noticePeriodDays}
                onChange={(e: any) => setNoticePeriodDays(e.target.value)}
                placeholder="e.g. 30"
              />
            </>
          )
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button
            type="button" variant="primary" fullWidth
            disabled={!selectedEmployee}
            loading={isPending}
            onClick={handleSubmit}
          >
            {isProbation ? 'Submit Termination Request' : 'Enter Notice Period'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Centralized exit detail / clearance view — HR CLEARANCE / IT CLEARANCE /
// MANAGER CLEARANCE / FINANCE CLEARANCE / ASSET CLEARANCE, each showing
// its real tasks (assignee, status, due date, notes) from the same
// GET /offboarding/exit/:userId the backend assembles from existing
// lifecycle/task/asset/access data — nothing here is a second data source.
function ExitDetailModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const toast = useToastContext();
  const { data: detail, isLoading } = useGetExitDetail(userId);
  const setStatus = useSetOffboardingTaskStatus(userId);
  const createTask = useCreateOffboardingTask(userId);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('GENERAL');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try { await createTask.mutateAsync({ title: newTitle.trim(), category: newCategory }); setNewTitle(''); }
    catch { toast.error('Failed to add task'); }
  };

  const advance = async (id: string, status: string) => {
    try { await setStatus.mutateAsync({ id, status }); }
    catch (err: any) { toast.error(err?.data?.message || 'Failed to update task'); }
  };

  const categories = detail?.by_category ? Object.keys(detail.by_category) : [];

  return (
    <Modal isOpen onClose={onClose} title={`Employee Exit — ${userName}`}>
      <div className="flex flex-col gap-4 mt-4 max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
        ) : !detail ? (
          <p className="text-sm text-red-400 text-center py-8">Failed to load exit details.</p>
        ) : (
          <>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 flex flex-col gap-1">
              <p><span className="font-black text-gray-800">Exit Type:</span> {detail.exit.exit_type || '—'}</p>
              <p><span className="font-black text-gray-800">Last Working Date:</span> {detail.exit.last_working_date ? new Date(detail.exit.last_working_date).toLocaleDateString() : '—'}</p>
              <p><span className="font-black text-gray-800">Stage:</span> {detail.lifecycle_stage}</p>
              {detail.exit.exit_reason !== undefined && (
                <p><span className="font-black text-gray-800">Reason (HR only):</span> {detail.exit.exit_reason || '—'}</p>
              )}
              {detail.assets.outstanding_count > 0 && (
                <p className="text-red-500 font-bold">{detail.assets.outstanding_count} asset(s) still outstanding.</p>
              )}
            </div>

            {categories.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No clearance tasks yet.</p>}

            {categories.map((cat) => {
              const group = detail.by_category[cat];
              return (
                <div key={cat} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-700">{CATEGORY_LABELS[cat] || cat}</p>
                    <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full border', group.complete ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100')}>
                      {group.required_complete}/{group.required_total}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {group.tasks.map((t: any) => (
                      <div key={t.id} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-xs', t.overdue ? 'border-red-200 bg-red-50' : 'border-gray-100')}>
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase border', STATUS_STYLE[t.status])}>{t.status}</span>
                        <span className="flex-1 text-gray-700 font-semibold">{t.title}{t.overdue && <span className="ml-1.5 text-red-500 font-black">OVERDUE</span>}</span>
                        {t.assignee && <span className="text-[10px] text-gray-400">{t.assignee.first_name}</span>}
                        {t.status !== 'COMPLETED' && (
                          <div className="flex gap-1">
                            {t.status === 'PENDING' && <button className="text-[10px] font-bold text-blue-500 hover:underline" onClick={() => advance(t.id, 'IN_PROGRESS')}>Start</button>}
                            <button className="text-[10px] font-bold text-green-600 hover:underline" onClick={() => advance(t.id, 'COMPLETED')}>Complete</button>
                            {t.status !== 'BLOCKED' && <button className="text-[10px] font-bold text-red-500 hover:underline" onClick={() => advance(t.id, 'BLOCKED')}>Block</button>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <form onSubmit={handleAdd} className="flex gap-2 pt-2 border-t border-gray-100">
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="h-10 px-2 rounded-xl border border-gray-200 text-xs font-medium outline-none">
                {Object.keys(CATEGORY_LABELS).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add a task…" className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
              <Button type="submit" variant="primary" className="rounded-xl px-4" loading={createTask.isPending}><Plus size={14} /></Button>
            </form>
          </>
        )}
        <Button type="button" variant="outline" fullWidth onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

export default OffboardingPage;
