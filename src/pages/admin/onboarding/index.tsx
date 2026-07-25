import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { UserPlus, Send, Plus, CheckCircle2, ArrowRight, ListChecks, CalendarClock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetCandidates, useCreateCandidate, useCreateOffer, useSendOffer, useAcceptOffer,
  useGetOnboardingTasks, useCreateOnboardingTask, useCompleteOnboardingTask,
} from '@/services/onboardingService';
import { useCreateInterview } from '@/services/interviewsService';

const STATUS_COLORS: Record<string, string> = {
  INVITED:  'bg-yellow-50 text-yellow-600 border-yellow-100',
  ACCEPTED: 'bg-green-50 text-green-600 border-green-100',
  REJECTED: 'bg-red-50 text-red-600 border-red-100',
};

const INTERVIEW_STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   'bg-blue-50 text-blue-600 border-blue-100',
  COMPLETED:   'bg-green-50 text-green-600 border-green-100',
  CANCELLED:   'bg-gray-50 text-gray-400 border-gray-100',
  RESCHEDULED: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  NO_SHOW:     'bg-red-50 text-red-600 border-red-100',
};

const OnboardingPage: React.FC = () => {
  const toast = useToastContext();
  const navigate = useNavigate();
  const { data: candidates = [], isLoading } = useGetCandidates();
  const createCandidate = useCreateCandidate();
  const createOffer = useCreateOffer();
  const sendOffer = useSendOffer();
  const acceptOffer = useAcceptOffer();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', position: '', phone: '' });
  const [tasksForUser, setTasksForUser] = useState<{ id: string; name: string } | null>(null);
  const [interviewCandidate, setInterviewCandidate] = useState<{ id: string; name: string } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.first_name) { toast.error('Email and first name required'); return; }
    try {
      await createCandidate.mutateAsync(form);
      toast.success('Candidate invited! Invitation email sent.');
      setShowModal(false);
      setForm({ email: '', first_name: '', last_name: '', position: '', phone: '' });
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to invite candidate'); }
  };

  const columns: Column<any>[] = [
    { header: 'Candidate', key: 'first_name', render: (c) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-black text-sm">
          {c.first_name?.[0]}{c.last_name?.[0]}
        </div>
        <div>
          <p className="font-black text-gray-900">{c.first_name} {c.last_name}</p>
          <p className="text-xs text-gray-400">{c.email}</p>
        </div>
      </div>
    )},
    { header: 'Position', key: 'position', render: (c) => <span>{c.position || '—'}</span> },
    { header: 'Status', key: 'status', render: (c) => (
      <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5', STATUS_COLORS[c.status] || 'bg-gray-50 text-gray-400')}>
        {c.status}
      </Badge>
    )},
    { header: 'Invited', key: 'created_at', render: (c) => new Date(c.created_at).toLocaleDateString() },
    { header: 'Interviews', key: 'interviews', render: (c) => {
      const interviews = c.interviews || [];
      if (interviews.length === 0) return <span className="text-xs text-gray-300">—</span>;
      const latest = interviews[0];
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5 w-fit', INTERVIEW_STATUS_COLORS[latest.status] || 'bg-gray-50 text-gray-400')}>
            Round {latest.round}: {latest.status}
          </Badge>
          {interviews.length > 1 && <span className="text-[10px] text-gray-400 font-semibold">{interviews.length} rounds total</span>}
        </div>
      );
    }},
    { header: 'Actions', key: 'id', align: 'right', render: (c) => (
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => setInterviewCandidate({ id: c.id, name: `${c.first_name} ${c.last_name}` })}>
          <CalendarClock size={12} /> Interview
        </Button>
        {c.status === 'INVITED' && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={async () => {
            try {
              const offer = await createOffer.mutateAsync({ candidate_id: c.id, position: c.position || 'Position', salary: 0 });
              toast.success('Offer created');
            } catch { toast.error('Failed'); }
          }}>
            <Plus size={12} /> Offer
          </Button>
        )}
        {c.offers?.[0]?.status === 'DRAFT' && (
          <Button size="sm" variant="primary" className="rounded-xl gap-1 h-8 text-xs" loading={sendOffer.isPending} onClick={async () => {
            try {
              await sendOffer.mutateAsync(c.offers[0].id);
              toast.success('Offer sent to candidate');
            } catch { toast.error('Failed to send offer'); }
          }}>
            <Send size={12} /> Send
          </Button>
        )}
        {c.offers?.[0]?.status === 'SENT' && !c.employee_profile && (
          <Button size="sm" variant="primary" className="rounded-xl gap-1 h-8 text-xs" loading={acceptOffer.isPending} onClick={async () => {
            try {
              await acceptOffer.mutateAsync(c.offers[0].id);
              toast.success('Offer accepted — Employee Master created automatically');
            } catch { toast.error('Failed to accept offer'); }
          }}>
            <CheckCircle2 size={12} /> Accept & Hire
          </Button>
        )}
        {c.employee_profile?.user_id && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => navigate(`/admin/add-employee/${c.employee_profile.user_id}`)}>
            Complete Profile <ArrowRight size={12} />
          </Button>
        )}
        {c.employee_profile?.user_id && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => setTasksForUser({ id: c.employee_profile.user_id, name: `${c.first_name} ${c.last_name}` })}>
            <ListChecks size={12} /> Tasks
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hiring & Onboarding</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage candidates, offers and onboarding workflows.</p>
        </div>
        <Button variant="primary" className="rounded-xl gap-2 h-10 px-5 font-black" onClick={() => setShowModal(true)}>
          <UserPlus size={16} /> Invite Candidate
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <Table columns={columns} data={candidates} isLoading={isLoading} emptyMessage="No candidates yet. Click 'Invite Candidate' to start." />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Invite Candidate">
        <form onSubmit={handleInvite} className="flex flex-col gap-4 mt-4">
          {[
            { label: 'Email *', key: 'email', type: 'email', placeholder: 'candidate@example.com' },
            { label: 'First Name *', key: 'first_name', type: 'text', placeholder: 'John' },
            { label: 'Last Name', key: 'last_name', type: 'text', placeholder: 'Doe' },
            { label: 'Position', key: 'position', type: 'text', placeholder: 'e.g. Frontend Developer' },
            { label: 'Phone', key: 'phone', type: 'text', placeholder: '+92 300 0000000' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{label}</label>
              <input type={type} value={(form as any)[key]} placeholder={placeholder}
                onChange={(e) => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={createCandidate.isPending}>Send Invitation</Button>
          </div>
        </form>
      </Modal>

      {tasksForUser && (
        <OnboardingTasksModal userId={tasksForUser.id} userName={tasksForUser.name} onClose={() => setTasksForUser(null)} />
      )}

      {interviewCandidate && (
        <ScheduleInterviewModal candidateId={interviewCandidate.id} candidateName={interviewCandidate.name} onClose={() => setInterviewCandidate(null)} />
      )}
    </div>
  );
};

// ── Schedule Interview ────────────────────────────────────────────────────────
function ScheduleInterviewModal({ candidateId, candidateName, onClose }: { candidateId: string; candidateName: string; onClose: () => void }) {
  const toast = useToastContext();
  const createInterview = useCreateInterview();
  const [form, setForm] = useState({ round: '1', title: 'Technical Round', scheduled_at: '', duration_mins: '30', location: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduled_at) { toast.error('Scheduled date/time is required'); return; }
    try {
      await createInterview.mutateAsync({
        candidate_id: candidateId,
        round: +form.round || 1,
        title: form.title,
        scheduled_at: form.scheduled_at,
        duration_mins: +form.duration_mins || 30,
        location: form.location,
      });
      toast.success('Interview scheduled');
      onClose();
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to schedule interview'); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Schedule Interview — ${candidateName}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Round</label>
            <input type="number" min={1} value={form.round}
              onChange={(e) => setForm(p => ({ ...p, round: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
          </div>
          <div className="flex flex-col gap-1.5 flex-[2]">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Title</label>
            <input type="text" value={form.title} placeholder="e.g. Technical Round"
              onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Scheduled At *</label>
          <input type="datetime-local" value={form.scheduled_at}
            onChange={(e) => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
            className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Duration (mins)</label>
            <input type="number" min={5} value={form.duration_mins}
              onChange={(e) => setForm(p => ({ ...p, duration_mins: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
          </div>
          <div className="flex flex-col gap-1.5 flex-[2]">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Location / Link</label>
            <input type="text" value={form.location} placeholder="Office / Google Meet link"
              onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" fullWidth loading={createInterview.isPending}>Schedule</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Onboarding Tasks Checklist ────────────────────────────────────────────────
function OnboardingTasksModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const toast = useToastContext();
  const { data: tasks = [], isLoading } = useGetOnboardingTasks(userId);
  const createTask = useCreateOnboardingTask(userId);
  const completeTask = useCompleteOnboardingTask(userId);
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
    <Modal isOpen onClose={onClose} title={`Onboarding Tasks — ${userName}`}>
      <div className="flex flex-col gap-4 mt-4">
        <p className="text-xs text-gray-400 font-semibold">{doneCount} / {tasks.length} tasks done</p>
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No onboarding tasks yet. Add one below.</p>
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
                <span className="flex-1">{t.title}</span>
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

export default OnboardingPage;
