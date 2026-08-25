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
import { useGetOffboardingTasks, useCreateOffboardingTask, useCompleteOffboardingTask } from '@/services/offboardingService';
import {
  useEnterNoticePeriodMutation, useRequestTerminateProbationMutation, useMoveToExitClearanceMutation,
} from '@/services/userService';

// Employees currently in a given lifecycle stage — reused for Exit
// Clearance (checklist list), Notice Period (move-to-exit-clearance
// prompt), and the Initiate Offboarding picker's candidate pool
// (Active Employment + Probation).
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
            <p className="text-sm text-gray-500 font-medium mt-1">Start offboarding, track notice periods, and manage exit checklists.</p>
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
              <NoticePeriodRow key={e.id} employee={e} />
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
                  <ListChecks size={12} /> Exit Checklist
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <OffboardingChecklistModal userId={selected.id} userName={selected.name} onClose={() => setSelected(null)} />
      )}

      {showInitiate && (
        <InitiateOffboardingModal onClose={() => setShowInitiate(false)} />
      )}
    </div>
  );
};

// Employee already in Notice Period — one click forward to Exit Clearance
// (gated endpoint, safety-checked server-side: checklist/assets/approvals).
function NoticePeriodRow({ employee: e }: { employee: any }) {
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
  );
}

// Entry point for starting offboarding on an employee who isn't in the exit
// pipeline yet: Active Employment employees can be moved into Notice
// Period immediately (gated endpoint); Probation employees can only have
// termination *requested* (creates a pending approval, not an instant
// change — see request-terminate-probation).
function InitiateOffboardingModal({ onClose }: { onClose: () => void }) {
  const toast = useToastContext();
  const { data: activeEmployees = [], isLoading: activeLoading } = useEmployeesByStage('ACTIVE_EMPLOYMENT');
  const { data: probationEmployees = [], isLoading: probationLoading } = useEmployeesByStage('PROBATION');
  const enterNoticePeriod = useEnterNoticePeriodMutation();
  const requestTerminateProbation = useRequestTerminateProbationMutation();

  const [employeeId, setEmployeeId] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState('');
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
      requestTerminateProbation.mutate({ userId: selectedEmployee.id, reason: reason || undefined }, {
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
                HR/Admin approval — it does not change their lifecycle stage immediately.
              </p>
              <Input
                label="Reason (optional)"
                value={reason}
                onChange={(e: any) => setReason(e.target.value)}
                placeholder="Why is probation being terminated?"
              />
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 font-medium">
                This moves {selectedEmployee.first_name} into Notice Period immediately.
              </p>
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

function OffboardingChecklistModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const toast = useToastContext();
  const { data: tasks = [], isLoading } = useGetOffboardingTasks(userId);
  const createTask = useCreateOffboardingTask(userId);
  const completeTask = useCompleteOffboardingTask(userId);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await createTask.mutateAsync({ title: newTitle.trim() });
      setNewTitle('');
    } catch { toast.error('Failed to add task'); }
  };

  const doneCount = tasks.filter((t: any) => t.is_completed).length;

  return (
    <Modal isOpen onClose={onClose} title={`Exit Checklist — ${userName}`}>
      <div className="flex flex-col gap-4 mt-4">
        <p className="text-xs text-gray-400 font-semibold">{doneCount} / {tasks.length} tasks done</p>
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No offboarding tasks yet. Add one below.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {tasks.map((t: any) => (
              <label key={t.id} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm',
                t.is_completed ? 'bg-gray-50 border-gray-100 text-gray-400 line-through' : 'border-gray-200 text-gray-700',
              )}>
                <input
                  type="checkbox"
                  checked={!!t.is_completed}
                  disabled={t.is_completed || completeTask.isPending}
                  onChange={async () => {
                    try { await completeTask.mutateAsync(t.id); } catch { toast.error('Failed to complete task'); }
                  }}
                  className="h-4 w-4 rounded accent-primary-600"
                />
                <div className="flex-1">
                  <span className="block">{t.title}</span>
                  {t.category && <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{t.category}</span>}
                </div>
              </label>
            ))}
          </div>
        )}
        <form onSubmit={handleAdd} className="flex gap-2 pt-2 border-t border-gray-100">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a task…"
            className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
          />
          <Button type="submit" variant="primary" className="rounded-xl px-4" loading={createTask.isPending}>
            <Plus size={14} />
          </Button>
        </form>
        <Button type="button" variant="outline" fullWidth onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

export default OffboardingPage;
