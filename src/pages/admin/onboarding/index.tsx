import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { UserPlus, Send, Plus, CheckCircle2, XCircle, ArrowRight, ListChecks, CalendarClock, Mail, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetCandidates, useCreateCandidate, useUpdateCandidateStatus, useDeleteCandidate,
  useCreateOffer, useGenerateOfferEmail, useEditOfferEmail, useSendOffer, useAcceptOffer, useRejectOffer,
  useGenerateCandidateEmail, useEditCandidateEmail, useSendCandidateEmail,
  useGetOnboardingTasks, useCreateOnboardingTask, useCompleteOnboardingTask, useGetOnboardingReadiness, useMoveToProbation,
  useGetEmailTemplates,
} from '@/services/onboardingService';
import { useGetOfferLetterDocumentTemplates } from '@/services/hrDocumentsService';
import { useCreateInterview, useUpdateInterview, useGenerateInterviewEmail, useEditInterviewEmail, useSendInterviewEmail } from '@/services/interviewsService';
import { useMyPermissions } from '@/services/permissionsService';

// Full granular pipeline — see candidate-status.service.js (backend) for
// the enforced transition graph this display mirrors.
const STATUS_COLORS: Record<string, string> = {
  INVITED:            'bg-yellow-50 text-yellow-600 border-yellow-100',
  UNDER_REVIEW:        'bg-blue-50 text-blue-600 border-blue-100',
  ROUND_1_SCHEDULED:   'bg-indigo-50 text-indigo-600 border-indigo-100',
  ROUND_1_COMPLETED:   'bg-indigo-50 text-indigo-600 border-indigo-100',
  SHORTLISTED:         'bg-teal-50 text-teal-600 border-teal-100',
  ROUND_2_SCHEDULED:   'bg-purple-50 text-purple-600 border-purple-100',
  ROUND_2_COMPLETED:   'bg-purple-50 text-purple-600 border-purple-100',
  FINAL_SHORTLISTED:   'bg-cyan-50 text-cyan-600 border-cyan-100',
  OFFER_SENT:          'bg-orange-50 text-orange-600 border-orange-100',
  HIRED:               'bg-green-50 text-green-600 border-green-100',
  ACCEPTED:            'bg-green-50 text-green-600 border-green-100',
  REJECTED:            'bg-red-50 text-red-600 border-red-100',
};

const INTERVIEW_STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   'bg-blue-50 text-blue-600 border-blue-100',
  COMPLETED:   'bg-green-50 text-green-600 border-green-100',
  CANCELLED:   'bg-gray-50 text-gray-400 border-gray-100',
  RESCHEDULED: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  NO_SHOW:     'bg-red-50 text-red-600 border-red-100',
};

const EMAIL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-50 text-gray-400 border-gray-100',
  SENDING: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  SENT:    'bg-green-50 text-green-600 border-green-100',
  FAILED:  'bg-red-50 text-red-600 border-red-100',
};

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  INTERVIEW_ROUND_1: 'Round 1 Interview Invitation',
  INTERVIEW_ROUND_2: 'Round 2 Interview Invitation',
  INTERVIEW_RESCHEDULE: 'Interview Reschedule / Update',
  OFFER: 'Offer of Employment',
  REJECTION: 'Application Update (Rejection)',
  APPLICATION_STATUS: 'Application / Status Update',
};

const OnboardingPage: React.FC = () => {
  const toast = useToastContext();
  const navigate = useNavigate();
  const { data: candidates = [], isLoading } = useGetCandidates();
  const createCandidate = useCreateCandidate();
  const updateCandidateStatus = useUpdateCandidateStatus();
  const createOffer = useCreateOffer();
  const acceptOffer = useAcceptOffer();
  const rejectOffer = useRejectOffer();
  const moveToProbation = useMoveToProbation();
  const deleteCandidate = useDeleteCandidate();
  // Frontend visibility only — the DELETE endpoint is independently gated to
  // SUPER_ADMIN on the backend (authorize('SUPER_ADMIN') -> 403).
  const { data: myPerms } = useMyPermissions();
  const isSuperAdmin = !!myPerms?.is_super_admin;
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', position: '', phone: '' });
  const [tasksForUser, setTasksForUser] = useState<{ id: string; name: string } | null>(null);
  const [interviewCandidate, setInterviewCandidate] = useState<{ id: string; name: string; round: number } | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<any | null>(null);
  const [interviewEmailFor, setInterviewEmailFor] = useState<any | null>(null);
  const [decisionFor, setDecisionFor] = useState<any | null>(null);
  const [offerEmailFor, setOfferEmailFor] = useState<{ offer: any; candidate: any } | null>(null);
  const [candidateEmailFor, setCandidateEmailFor] = useState<{ candidate: any; type: 'REJECTION' | 'APPLICATION_STATUS' } | null>(null);

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

  const handleDeleteCandidate = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCandidate.mutateAsync(deleteTarget.id);
      toast.success(`Candidate ${deleteTarget.first_name} ${deleteTarget.last_name} deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      // Keep the row: the list only refetches onSuccess, and the dialog stays
      // open so the failure is visible and the action is retryable/cancelable.
      toast.error(err?.data?.message || 'Failed to delete candidate');
    }
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
    { header: 'Stage', key: 'status', render: (c) => (
      <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5', STATUS_COLORS[c.status] || 'bg-gray-50 text-gray-400')}>
        {c.status.replace(/_/g, ' ')}
      </Badge>
    )},
    { header: 'Invited', key: 'created_at', render: (c) => new Date(c.created_at).toLocaleDateString() },
    { header: 'Interviews', key: 'interviews', render: (c) => {
      const interviews = c.interviews || [];
      if (interviews.length === 0) return <span className="text-xs text-gray-300">—</span>;
      const latest = interviews[0];
      const isReschedulePending = !!latest.previous_scheduled_at;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5 w-fit', INTERVIEW_STATUS_COLORS[latest.status] || 'bg-gray-50 text-gray-400')}>
              Round {latest.round}: {latest.status}
            </Badge>
            <Badge variant="info" className={cn('text-[9px] font-bold border rounded-lg px-1.5 py-0.5 w-fit', EMAIL_STATUS_COLORS[latest.email_status] || 'bg-gray-50 text-gray-400')}>
              Email: {isReschedulePending ? 'RESCHEDULE PENDING' : latest.email_status}
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setInterviewEmailFor(latest)} className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-1">
              <Mail size={10} /> Email
            </button>
            {latest.status === 'SCHEDULED' && (
              <button type="button" onClick={() => setDecisionFor(latest)} className="text-[10px] font-bold text-gray-500 hover:underline flex items-center gap-1">
                <CheckCircle2 size={10} /> Record Decision
              </button>
            )}
            {latest.status === 'SCHEDULED' && latest.email_status === 'SENT' && (
              <button type="button" onClick={() => setRescheduleFor(latest)} className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-1">
                <RefreshCw size={10} /> Reschedule
              </button>
            )}
          </div>
          {interviews.length > 1 && <span className="text-[10px] text-gray-400 font-semibold">{interviews.length} rounds total</span>}
        </div>
      );
    }},
    { header: 'Actions', key: 'id', align: 'right', render: (c) => (
      <div className="flex gap-2 justify-end flex-wrap">
        {c.status === 'INVITED' && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" loading={updateCandidateStatus.isPending} onClick={async () => {
            try { await updateCandidateStatus.mutateAsync({ id: c.id, status: 'UNDER_REVIEW' }); toast.success('Moved to Under Review'); }
            catch (err: any) { toast.error(err?.data?.message || 'Failed'); }
          }}>
            Start Review
          </Button>
        )}
        {c.status === 'UNDER_REVIEW' && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => setInterviewCandidate({ id: c.id, name: `${c.first_name} ${c.last_name}`, round: 1 })}>
            <CalendarClock size={12} /> Round 1
          </Button>
        )}
        {c.status === 'SHORTLISTED' && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => setInterviewCandidate({ id: c.id, name: `${c.first_name} ${c.last_name}`, round: 2 })}>
            <CalendarClock size={12} /> Round 2
          </Button>
        )}
        {c.status === 'FINAL_SHORTLISTED' && !c.offers?.[0] && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" loading={createOffer.isPending} onClick={async () => {
            try {
              await createOffer.mutateAsync({ candidate_id: c.id, position: c.position || 'Position', salary: 0 });
              toast.success('Offer created — select a template to generate the offer email');
            } catch (err: any) { toast.error(err?.data?.message || 'Failed to create offer'); }
          }}>
            <Plus size={12} /> Create Offer
          </Button>
        )}
        {c.offers?.[0]?.status === 'DRAFT' && (
          <Button size="sm" variant="primary" className="rounded-xl gap-1 h-8 text-xs" onClick={() => setOfferEmailFor({ offer: c.offers[0], candidate: c })}>
            <Mail size={12} /> Offer Email
          </Button>
        )}
        {c.offers?.[0]?.status === 'SENT' && !c.employee_profile && (
          <>
            <Button size="sm" variant="primary" className="rounded-xl gap-1 h-8 text-xs" loading={acceptOffer.isPending} onClick={async () => {
              try { await acceptOffer.mutateAsync(c.offers[0].id); toast.success('Offer accepted — Employee record created, onboarding started'); }
              catch (err: any) { toast.error(err?.data?.message || 'Failed to accept offer'); }
            }}>
              <CheckCircle2 size={12} /> Accept & Hire
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs text-red-500" loading={rejectOffer.isPending} onClick={async () => {
              try { await rejectOffer.mutateAsync({ id: c.offers[0].id }); toast.success('Offer rejected'); }
              catch (err: any) { toast.error(err?.data?.message || 'Failed to reject offer'); }
            }}>
              <XCircle size={12} /> Reject
            </Button>
          </>
        )}
        {(c.status === 'UNDER_REVIEW' || c.status === 'ROUND_1_SCHEDULED' || c.status === 'ROUND_1_COMPLETED' || c.status === 'ROUND_2_SCHEDULED' || c.status === 'ROUND_2_COMPLETED' || c.status === 'SHORTLISTED' || c.status === 'FINAL_SHORTLISTED') && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs text-red-400" onClick={async () => {
            try { await updateCandidateStatus.mutateAsync({ id: c.id, status: 'REJECTED' }); toast.success('Candidate rejected'); }
            catch (err: any) { toast.error(err?.data?.message || 'Failed'); }
          }}>
            Reject
          </Button>
        )}
        {c.status === 'REJECTED' && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => setCandidateEmailFor({ candidate: c, type: 'REJECTION' })}>
            <Mail size={12} /> Rejection Email
          </Button>
        )}
        {!['REJECTED', 'HIRED'].includes(c.status) && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => setCandidateEmailFor({ candidate: c, type: 'APPLICATION_STATUS' })}>
            <Mail size={12} /> Status Email
          </Button>
        )}
        {c.employee_profile?.user_id && (
          <>
            <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => navigate(`/admin/add-employee/${c.employee_profile.user_id}`)}>
              Complete Profile <ArrowRight size={12} />
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => setTasksForUser({ id: c.employee_profile.user_id, name: `${c.first_name} ${c.last_name}` })}>
              <ListChecks size={12} /> Tasks
            </Button>
            <Button size="sm" variant="primary" className="rounded-xl gap-1 h-8 text-xs" loading={moveToProbation.isPending} onClick={async () => {
              try { await moveToProbation.mutateAsync(c.employee_profile.user_id); toast.success('Converted — employee moved to Probation'); }
              catch (err: any) { toast.error(err?.data?.message || 'Onboarding checklist is not complete yet'); }
            }}>
              Convert to Employee
            </Button>
          </>
        )}
        {isSuperAdmin && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteTarget(c)}>
            <Trash2 size={12} /> Delete
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
          <p className="text-sm text-gray-500 font-medium mt-1">Manage candidates, interviews, offers and onboarding workflows.</p>
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
        <ScheduleInterviewModal candidateId={interviewCandidate.id} candidateName={interviewCandidate.name} round={interviewCandidate.round} onClose={() => setInterviewCandidate(null)} />
      )}

      {rescheduleFor && (
        <RescheduleInterviewModal interview={rescheduleFor} onClose={() => setRescheduleFor(null)} />
      )}

      {interviewEmailFor && (
        <EmailWorkflowModal
          title={`Interview Email — Round ${interviewEmailFor.round}`}
          templateType={interviewEmailFor.previous_scheduled_at ? 'INTERVIEW_RESCHEDULE' : (interviewEmailFor.round >= 2 ? 'INTERVIEW_ROUND_2' : 'INTERVIEW_ROUND_1')}
          entity={interviewEmailFor}
          subjectField="email_subject" bodyField="email_body"
          useGenerate={useGenerateInterviewEmail} useEdit={useEditInterviewEmail} useSend={useSendInterviewEmail}
          idFor={(e) => e.id}
          onClose={() => setInterviewEmailFor(null)}
        />
      )}

      {decisionFor && (
        <RecordDecisionModal interview={decisionFor} onClose={() => setDecisionFor(null)} />
      )}

      {offerEmailFor && (
        <EmailWorkflowModal
          title={`Offer Email — ${offerEmailFor.candidate.first_name} ${offerEmailFor.candidate.last_name}`}
          templateType="OFFER"
          entity={offerEmailFor.offer}
          subjectField="email_subject" bodyField="letter_content"
          useGenerate={useGenerateOfferEmail} useEdit={useEditOfferEmail} useSend={useSendOffer}
          idFor={(e) => e.id}
          generateKey="offerId" editKey="offerId"
          onClose={() => setOfferEmailFor(null)}
        />
      )}

      {candidateEmailFor && (
        <EmailWorkflowModal
          title={`${candidateEmailFor.type === 'REJECTION' ? 'Rejection' : 'Status Update'} Email — ${candidateEmailFor.candidate.first_name} ${candidateEmailFor.candidate.last_name}`}
          templateType={candidateEmailFor.type}
          entity={candidateEmailFor.candidate}
          subjectField="email_subject" bodyField="email_body"
          useGenerate={useGenerateCandidateEmail} useEdit={useEditCandidateEmail} useSend={useSendCandidateEmail}
          idFor={(e) => e.id}
          extraGenerateArgs={{ type: candidateEmailFor.type }}
          onClose={() => setCandidateEmailFor(null)}
        />
      )}

      {deleteTarget && (
        <Modal isOpen onClose={() => setDeleteTarget(null)} title="Delete Candidate" size="sm">
          <div className="flex flex-col gap-4 mt-2">
            <p className="text-sm text-gray-600">
              This will permanently delete the candidate record for{' '}
              <strong className="text-gray-900">{deleteTarget.first_name} {deleteTarget.last_name}</strong>{' '}
              (<span className="text-gray-500">{deleteTarget.email}</span>), along with their interviews and offers.
              {deleteTarget.employee_profile?.user_id && (
                <> Their linked employee record will be kept.</>
              )}
            </p>
            <p className="text-xs text-red-500 font-semibold">This action cannot be undone.</p>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" fullWidth onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button type="button" variant="danger" fullWidth loading={deleteCandidate.isPending} onClick={handleDeleteCandidate}>
                <Trash2 size={14} /> Delete Candidate
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

function ScheduleInterviewModal({ candidateId, candidateName, round, onClose }: { candidateId: string; candidateName: string; round: number; onClose: () => void }) {
  const toast = useToastContext();
  const createInterview = useCreateInterview();
  const [form, setForm] = useState({ title: round === 2 ? 'HR / Final Round' : 'Technical Round', scheduled_at: '', duration_mins: '30', location: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduled_at) { toast.error('Scheduled date/time is required'); return; }
    if (round === 1 && !form.location.trim()) { toast.error('Location / link is required for Round 1'); return; }
    try {
      await createInterview.mutateAsync({
        candidate_id: candidateId,
        round,
        title: form.title,
        scheduled_at: form.scheduled_at,
        duration_mins: +form.duration_mins || 30,
        location: form.location,
      });
      toast.success(`Round ${round} scheduled`);
      onClose();
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to schedule interview'); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Schedule Round ${round} — ${candidateName}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Title</label>
          <input type="text" value={form.title} placeholder="e.g. Technical Round"
            onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
            className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
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
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Location / Link{round === 1 ? ' *' : ''}</label>
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

// Changes an already-scheduled (and already-emailed) interview's date/time.
// The backend (interviews.service.js update_interview) detects this exact
// case — email_status was SENT and scheduled_at actually changed — and
// resets the interview's email to PENDING + stores previous_scheduled_at,
// so the next "Email" click generates from the INTERVIEW_RESCHEDULE
// template instead of the original round-invite one.
function RescheduleInterviewModal({ interview, onClose }: { interview: any; onClose: () => void }) {
  const toast = useToastContext();
  const update = useUpdateInterview();
  const [scheduledAt, setScheduledAt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) { toast.error('New date/time is required'); return; }
    try {
      await update.mutateAsync({ id: interview.id, data: { scheduled_at: scheduledAt } });
      toast.success('Interview rescheduled — generate and send the update email');
      onClose();
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to reschedule'); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Reschedule Round ${interview.round}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
        <p className="text-xs text-gray-400">Current: {new Date(interview.scheduled_at).toLocaleString()}</p>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">New Date &amp; Time *</label>
          <input type="datetime-local" value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" fullWidth loading={update.isPending}>Save New Time</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Unified Select Template -> Generate -> Edit -> Preview -> Send modal ──
// Used for interview, offer, and candidate-directed (rejection/status)
// emails alike — the exact same flow shape for all three, just pointed at
// different generate/edit/send hooks and entity fields, per the reuse
// instruction. The content shown IS the entity's stored subject/body field
// — the exact thing the send call transmits, never regenerated on send.
export function EmailWorkflowModal({
  title, templateType, entity, subjectField, bodyField,
  useGenerate, useEdit, useSend, idFor,
  generateKey = 'id', editKey = 'id',
  extraGenerateArgs = {},
  onClose,
}: {
  title: string;
  templateType: string;
  entity: any;
  subjectField: string;
  bodyField: string;
  useGenerate: () => any;
  useEdit: () => any;
  useSend: () => any;
  idFor: (e: any) => string;
  generateKey?: string;
  editKey?: string;
  extraGenerateArgs?: Record<string, any>;
  onClose: () => void;
}) {
  const toast = useToastContext();
  const { data: recruitmentTemplates = [] } = useGetEmailTemplates(templateType);
  // Document Templates (Employment / Offer Letter, active) is the canonical
  // template source for offer emails — merged in alongside this module's own
  // recruitment_email_templates rather than replacing them, so existing
  // offer-email functionality (and every other templateType here) is unaffected.
  const { data: offerDocTemplates = [] } = useGetOfferLetterDocumentTemplates(templateType === 'OFFER');
  const templates = templateType === 'OFFER'
    ? [...recruitmentTemplates, ...offerDocTemplates.map((t) => ({ id: t.id, name: `${t.name} (Document Template)` }))]
    : recruitmentTemplates;
  const generate = useGenerate();
  const edit = useEdit();
  const send = useSend();
  const id = idFor(entity);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState(entity[subjectField] || '');
  const [body, setBody] = useState(entity[bodyField] || '');
  const [dirty, setDirty] = useState(false);

  const handleGenerate = async () => {
    try {
      const r = await generate.mutateAsync({ [generateKey]: id, templateId: templateId || undefined, ...extraGenerateArgs });
      setSubject(r.payload[subjectField] || ''); setBody(r.payload[bodyField] || ''); setDirty(false);
      toast.success('Email generated from template');
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to generate email'); }
  };

  const handleSaveEdit = async () => {
    try { await edit.mutateAsync({ [editKey]: id, subject, [bodyField === 'letter_content' ? 'letter_content' : 'body']: body }); setDirty(false); toast.success('Draft saved'); }
    catch (err: any) { toast.error(err?.data?.message || 'Failed to save edit'); }
  };

  const handleSend = async () => {
    try {
      if (dirty) await edit.mutateAsync({ [editKey]: id, subject, [bodyField === 'letter_content' ? 'letter_content' : 'body']: body });
      await send.mutateAsync(id);
      toast.success('Email sent');
      onClose();
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to send — SMTP rejected or unavailable'); }
  };

  const alreadySent = entity.email_status === 'SENT' || entity.status === 'SENT' || entity.status === 'ACCEPTED';

  return (
    <Modal isOpen onClose={onClose} title={title}>
      <div className="flex flex-col gap-4 mt-4">
        {entity.email_error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
            Last send failed: {entity.email_error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Select Template</label>
          <div className="flex gap-2">
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={alreadySent}
              className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium outline-none disabled:bg-gray-50">
              <option value="">{TEMPLATE_TYPE_LABELS[templateType] || 'Default template'}</option>
              {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {!alreadySent && (
              <Button variant="outline" className="rounded-xl h-11 px-4" loading={generate.isPending} onClick={handleGenerate}>
                {subject || body ? 'Regenerate' : 'Generate'}
              </Button>
            )}
          </div>
        </div>

        {(subject || body) && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Subject</label>
              <input value={subject} disabled={alreadySent}
                onChange={(e) => { setSubject(e.target.value); setDirty(true); }}
                className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium outline-none disabled:bg-gray-50" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Generated Email (HTML)</label>
              <textarea value={body} disabled={alreadySent} rows={6}
                onChange={(e) => { setBody(e.target.value); setDirty(true); }}
                className="px-4 py-3 rounded-xl border border-gray-200 text-xs font-mono outline-none disabled:bg-gray-50" />
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
              <p className="text-[10px] font-black text-gray-400 uppercase px-3 pt-3">Preview</p>
              <div className="max-h-64 overflow-y-auto p-3">
                <iframe title="email-preview" srcDoc={body} className="w-full border-0" style={{ height: 420, background: '#fff', borderRadius: 8 }} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" fullWidth onClick={onClose}>{alreadySent ? 'Close' : 'Cancel'}</Button>
              {!alreadySent && (
                <>
                  <Button type="button" variant="outline" fullWidth loading={edit.isPending} onClick={handleSaveEdit} disabled={!dirty}>Save Draft</Button>
                  <Button type="button" variant="primary" fullWidth className="gap-1" loading={send.isPending} onClick={handleSend}>
                    <Send size={14} /> Send Email
                  </Button>
                </>
              )}
            </div>
            {alreadySent && <p className="text-xs text-green-600 font-bold text-center">Sent {entity.email_sent_at || entity.sent_at ? new Date(entity.email_sent_at || entity.sent_at).toLocaleString() : ''}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}

function RecordDecisionModal({ interview, onClose }: { interview: any; onClose: () => void }) {
  const toast = useToastContext();
  const update = useUpdateInterview();
  const [decision, setDecision] = useState<'PASS' | 'FAIL' | 'HOLD'>('PASS');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async () => {
    try {
      await update.mutateAsync({ id: interview.id, data: { status: 'COMPLETED', decision, feedback } });
      toast.success('Decision recorded');
      onClose();
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to record decision'); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Record Decision — Round ${interview.round}`}>
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex gap-2">
          {(['PASS', 'FAIL', 'HOLD'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDecision(d)}
              className={cn('flex-1 h-11 rounded-xl border text-xs font-black uppercase', decision === d ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-500')}>
              {d}
            </button>
          ))}
        </div>
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback notes (optional)" rows={3}
          className="px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none" />
        <p className="text-xs text-gray-400">
          {decision === 'PASS' && (interview.round >= 2 ? 'Candidate will move to FINAL SHORTLISTED.' : 'Candidate will move to SHORTLISTED, eligible for Round 2.')}
          {decision === 'FAIL' && 'Candidate will be REJECTED.'}
          {decision === 'HOLD' && 'Candidate stays at ROUND COMPLETED — no automatic stage change.'}
        </p>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" fullWidth loading={update.isPending} onClick={handleSubmit}>Save Decision</Button>
        </div>
      </div>
    </Modal>
  );
}

function OnboardingTasksModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const toast = useToastContext();
  const { data: tasks = [], isLoading } = useGetOnboardingTasks(userId);
  const { data: readiness } = useGetOnboardingReadiness(userId);
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
  const blockingIds = new Set((readiness?.blocking || []).map((b: any) => b.id));

  return (
    <Modal isOpen onClose={onClose} title={`Onboarding Tasks — ${userName}`}>
      <div className="flex flex-col gap-4 mt-4">
        {readiness && (
          <div className={cn(
            'rounded-xl border px-3 py-2.5 text-xs font-bold flex items-center justify-between',
            readiness.ready ? 'bg-green-50 border-green-100 text-green-600' : 'bg-yellow-50 border-yellow-100 text-yellow-700',
          )}>
            <span>{readiness.ready ? 'Onboarding complete — ready to move to Probation' : 'Onboarding in progress'}</span>
            <span>{readiness.required_complete}/{readiness.required_total} required{readiness.optional_total ? ` · ${readiness.optional_complete}/${readiness.optional_total} optional` : ''}</span>
          </div>
        )}
        <p className="text-xs text-gray-400 font-semibold">{doneCount} / {tasks.length} tasks done</p>
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No onboarding tasks yet. Add one below.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {tasks.map((t: any) => {
              const derived = t.task_type === 'DOCUMENT' || t.task_type === 'ASSET';
              const computedComplete = derived ? !blockingIds.has(t.id) && !!readiness : !!t.is_completed;
              return (
                <label key={t.id} className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm',
                  computedComplete ? 'bg-gray-50 border-gray-100 text-gray-400 line-through' : 'border-gray-200 text-gray-700',
                )}>
                  <input
                    type="checkbox"
                    checked={computedComplete}
                    disabled={derived || t.is_completed || completeTask.isPending}
                    onChange={async () => {
                      try { await completeTask.mutateAsync(t.id); } catch { toast.error('Failed to complete task'); }
                    }}
                    className="h-4 w-4 rounded accent-primary-600"
                  />
                  <span className="flex-1">
                    {t.title}
                    {!t.is_required && <span className="ml-2 text-[10px] font-black uppercase text-gray-300">Optional</span>}
                    {derived && <span className="ml-2 text-[10px] font-black uppercase text-primary-400">{t.task_type === 'DOCUMENT' ? 'Auto: e-signature' : 'Auto: asset assignment'}</span>}
                  </span>
                </label>
              );
            })}
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
