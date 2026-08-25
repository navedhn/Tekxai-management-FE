import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { CheckCircle, Circle, FileSignature, ListChecks } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetOnboardingTasks, useGetOnboardingReadiness, useCompleteOnboardingTask,
} from '@/services/onboardingService';

const CATEGORY_LABEL: Record<string, string> = {
  HR: 'HR', MANAGER: 'Manager', IT: 'IT', ASSETS: 'Assets', EMPLOYEE: 'You', GENERAL: 'General',
};

// Employee self-service onboarding portal. Deliberately self-scoped — every
// query here is keyed off the logged-in user's own id (useAuthStore), never
// an id read from a route param or any client-supplied value, so this page
// can only ever show the viewer's own onboarding, regardless of what the
// underlying endpoints would otherwise permit (the backend independently
// enforces the same self/supervisor/HR scoping — this is defense in depth,
// not the only guard).
const EmployeeOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastContext();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const { data: tasks = [], isLoading: tasksLoading } = useGetOnboardingTasks(userId);
  const { data: readiness, isLoading: readinessLoading } = useGetOnboardingReadiness(userId);
  const completeTask = useCompleteOnboardingTask(userId);

  const blockingIds = new Set((readiness?.blocking || []).map((b: any) => b.id));
  const isDerived = (t: any) => t.task_type === 'DOCUMENT' || t.task_type === 'ASSET';
  const isComplete = (t: any) => (isDerived(t) ? !blockingIds.has(t.id) : !!t.is_completed);

  const requiredTasks = tasks.filter((t: any) => t.is_required);
  const optionalTasks = tasks.filter((t: any) => !t.is_required);
  const documentTasks = tasks.filter((t: any) => t.task_type === 'DOCUMENT');

  const pct = readiness?.required_total
    ? Math.round((readiness.required_complete / readiness.required_total) * 100)
    : 0;

  const canSelfComplete = (t: any) => t.task_type === 'MANUAL' && (t.user_id === userId || t.assignee_user_id === userId);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Onboarding</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Track and complete your onboarding checklist.</p>
      </div>

      {/* Progress summary — computed entirely from the real readiness endpoint response, never hand-maintained. */}
      <Card className="border-none shadow-sm">
        {readinessLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : readiness ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">
                {readiness.required_complete} of {readiness.required_total} required steps completed — {pct}%
              </h2>
              <Badge variant="info" className={cn('text-xs font-bold border-0 rounded-lg px-3 py-1',
                readiness.ready ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-700')}>
                {readiness.ready ? 'Onboarding complete' : 'In progress'}
              </Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            {readiness.optional_total > 0 && (
              <p className="text-xs text-gray-400">{readiness.optional_complete}/{readiness.optional_total} optional steps completed</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No onboarding checklist yet.</p>
        )}
      </Card>

      {/* Pending document-signing tasks — link into the existing HR Documents signing flow, no duplicate signing UI here. */}
      {documentTasks.length > 0 && (
        <Card className="border-none shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><FileSignature size={18} /></div>
            <h2 className="text-lg font-black text-gray-900">Documents to Sign</h2>
          </div>
          {documentTasks.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-4">
              <div className="min-w-0">
                <p className="font-black text-gray-900 truncate">{t.title}</p>
                <p className="text-xs text-gray-400">{t.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isComplete(t) ? (
                  <Badge variant="info" className="text-[10px] font-bold border-0 rounded-lg px-2 py-0.5 bg-green-100 text-green-700">Signed</Badge>
                ) : (
                  <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs" onClick={() => navigate('/employee/documents')}>
                    Review & Sign
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Required tasks */}
      <Card className="border-none shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600"><ListChecks size={18} /></div>
          <h2 className="text-lg font-black text-gray-900">Required Steps</h2>
        </div>
        {tasksLoading ? <p className="text-sm text-gray-400">Loading...</p> :
         requiredTasks.length === 0 ? <p className="text-sm text-gray-400 italic">No required tasks assigned yet.</p> :
         requiredTasks.map((t: any) => {
          const complete = isComplete(t);
          return (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {complete ? <CheckCircle size={18} className="text-green-500 shrink-0" /> : <Circle size={18} className="text-gray-300 shrink-0" />}
                <div className="min-w-0">
                  <p className={cn('font-black truncate', complete ? 'text-gray-400 line-through' : 'text-gray-900')}>{t.title}</p>
                  <p className="text-xs text-gray-400">{CATEGORY_LABEL[t.category] || t.category}{t.due_date ? ` · Due ${new Date(t.due_date).toLocaleDateString()}` : ''}</p>
                </div>
              </div>
              {!complete && canSelfComplete(t) && (
                <Button size="sm" className="rounded-xl h-7 text-xs shrink-0" loading={completeTask.isPending}
                  onClick={() => completeTask.mutate(t.id, { onSuccess: () => toast.success('Task completed') })}>
                  Mark done
                </Button>
              )}
              {!complete && isDerived(t) && (
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">
                  {t.task_type === 'DOCUMENT' ? 'Pending signature' : 'Pending asset assignment'}
                </span>
              )}
            </div>
          );
        })}
      </Card>

      {/* Optional tasks */}
      {optionalTasks.length > 0 && (
        <Card className="border-none shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">Optional Steps</h2>
          {optionalTasks.map((t: any) => {
            const complete = isComplete(t);
            return (
              <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {complete ? <CheckCircle size={18} className="text-green-500 shrink-0" /> : <Circle size={18} className="text-gray-300 shrink-0" />}
                  <p className={cn('font-black truncate', complete ? 'text-gray-400 line-through' : 'text-gray-900')}>{t.title}</p>
                </div>
                {!complete && canSelfComplete(t) && (
                  <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs shrink-0" loading={completeTask.isPending}
                    onClick={() => completeTask.mutate(t.id, { onSuccess: () => toast.success('Task completed') })}>
                    Mark done
                  </Button>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
};

export default EmployeeOnboarding;
