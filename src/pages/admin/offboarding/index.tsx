import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { UserMinus, Plus, ListChecks } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetOffboardingTasks, useCreateOffboardingTask, useCompleteOffboardingTask } from '@/services/offboardingService';

// Employees currently in the EXIT_CLEARANCE lifecycle stage — the same
// stage that auto-seeds the default offboarding checklist server-side
// (see employee-lifecycle.service.js / offboarding.service.js). This page
// is the missing UI for that already-working backend.
function useExitClearanceEmployees() {
  return useQuery({
    queryKey: ['employees', 'exit-clearance'],
    queryFn: async () => {
      const r = await apiRequest<any>(`${API_ENDPOINTS.EMPLOYEE.LIST}?lifecycle_stage=EXIT_CLEARANCE&limit=100`);
      return r?.payload?.records || [];
    },
    staleTime: 30000,
  });
}

const OffboardingPage: React.FC = () => {
  const { data: employees = [], isLoading } = useExitClearanceEmployees();
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center gap-2">
        <UserMinus size={22} className="text-red-500" />
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Offboarding</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Exit checklists for employees currently in Exit Clearance.</p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No employees currently in Exit Clearance.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {employees.map((e: any) => (
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
    </div>
  );
};

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
