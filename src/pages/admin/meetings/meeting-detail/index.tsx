import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle2, XCircle, GitBranch } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import ActionModal from '@/components/ui/ActionModal';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useMeeting, useAddMeetingNote, useAddMeetingDecision, useCreateActionItem,
  useCompleteActionItem, useCloseMeeting, useCancelMeeting, useMeetingTimeline, useCreateMeeting,
} from '@/services/meetingService';

const MEETING_BADGE: Record<string, 'success' | 'default' | 'warning'> = { SCHEDULED: 'default', COMPLETED: 'success', CANCELLED: 'warning' };
const PRIORITY_BADGE: Record<string, 'success' | 'default' | 'warning' | 'error'> = { LOW: 'default', MEDIUM: 'info' as any, HIGH: 'warning', URGENT: 'error' };
const ACTION_BADGE: Record<string, 'success' | 'default' | 'warning'> = { PENDING: 'default', IN_PROGRESS: 'warning', COMPLETED: 'success' };

export default function MeetingDetailPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const toast = useToastContext();
  const [tab, setTab] = useState('notes');
  const [noteContent, setNoteContent] = useState('');
  const [decisionText, setDecisionText] = useState('');
  const [actionOpen, setActionOpen] = useState(false);
  const [actionForm, setActionForm] = useState({ title: '', assignee_id: '', due_date: '', priority: 'MEDIUM', notes: '' });
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ title: '', scheduled_at: '' });

  const { data: meeting, isLoading } = useMeeting(meetingId || null);
  const { data: timeline } = useMeetingTimeline(tab === 'timeline' ? meetingId || null : null);

  const addNote = useAddMeetingNote();
  const addDecision = useAddMeetingDecision();
  const createActionItem = useCreateActionItem();
  const completeActionItem = useCompleteActionItem();
  const closeMeeting = useCloseMeeting();
  const cancelMeeting = useCancelMeeting();
  const createMeeting = useCreateMeeting();

  if (isLoading || !meeting) return <p className="text-sm text-gray-400">Loading…</p>;
  const editable = meeting.status === 'SCHEDULED';

  const handleAddNote = () => {
    if (!noteContent.trim()) return toast.error('Note content is required');
    addNote.mutate({ id: meetingId!, content: noteContent }, {
      onSuccess: () => { toast.success('Note added'); setNoteContent(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add note'),
    });
  };

  const handleAddDecision = () => {
    if (!decisionText.trim()) return toast.error('Decision text is required');
    addDecision.mutate({ id: meetingId!, decision_text: decisionText }, {
      onSuccess: () => { toast.success('Decision recorded'); setDecisionText(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed to record decision'),
    });
  };

  const handleCreateActionItem = () => {
    if (!actionForm.title.trim() || !actionForm.assignee_id.trim()) return toast.error('Title and assignee are required');
    createActionItem.mutate({ meetingId: meetingId!, data: actionForm as any }, {
      onSuccess: () => { toast.success('Action item created'); setActionOpen(false); setActionForm({ title: '', assignee_id: '', due_date: '', priority: 'MEDIUM', notes: '' }); },
      onError: (e: any) => toast.error(e?.message || 'Failed to create action item'),
    });
  };

  const handleClose = () => closeMeeting.mutate(meetingId!, {
    onSuccess: () => { toast.success('Meeting closed'); setCloseOpen(false); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const handleCancel = () => cancelMeeting.mutate(meetingId!, {
    onSuccess: () => { toast.success('Meeting cancelled'); setCancelOpen(false); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const handleFollowUp = () => {
    if (!followUpForm.title.trim() || !followUpForm.scheduled_at) return toast.error('Title and date/time are required');
    createMeeting.mutate({
      room_id: meeting.room_id, title: followUpForm.title, scheduled_at: followUpForm.scheduled_at,
      previous_meeting_id: meetingId,
    } as any, {
      onSuccess: (m) => { toast.success('Follow-up meeting created'); setFollowUpOpen(false); navigate(`/admin/meetings/meeting/${m.id}`); },
      onError: (e: any) => toast.error(e?.message || 'Failed to create follow-up'),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit" onClick={() => navigate(`/admin/meetings/room/${meeting.room_id}`)}>
        <ArrowLeft size={16} /> Back to room
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-900">{meeting.title}</h1>
            <Badge variant={MEETING_BADGE[meeting.status]}>{meeting.status}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{new Date(meeting.scheduled_at).toLocaleString()} · Room: {meeting.room?.name}</p>
          {meeting.previous_meeting && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <GitBranch size={12} /> Follow-up of{' '}
              <button className="underline" onClick={() => navigate(`/admin/meetings/meeting/${meeting.previous_meeting!.id}`)}>{meeting.previous_meeting.title}</button>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {meeting.status === 'COMPLETED' && (
            <Button onClick={() => setFollowUpOpen(true)}><Plus size={16} className="mr-1" /> Create Follow-up Meeting</Button>
          )}
          {editable && <Button onClick={() => setCloseOpen(true)}><CheckCircle2 size={16} className="mr-1" /> Close Meeting</Button>}
          {editable && <Button variant="outline" onClick={() => setCancelOpen(true)}><XCircle size={16} className="mr-1" /> Cancel</Button>}
        </div>
      </div>

      <Tabs
        options={[
          { label: 'Notes', value: 'notes' },
          { label: 'Decisions', value: 'decisions' },
          { label: 'Action Items', value: 'action-items' },
          { label: 'Agenda', value: 'agenda' },
          { label: 'Timeline', value: 'timeline' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'notes' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
          {editable && (
            <div className="flex gap-2">
              <Textarea containerClassName="flex-1" placeholder="Add a note…" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
              <Button onClick={handleAddNote} loading={addNote.isPending}>Add</Button>
            </div>
          )}
          <ul className="flex flex-col gap-3">
            {(meeting.notes || []).length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
            {(meeting.notes || []).map((n) => (
              <li key={n.id} className="p-3 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.content}</p>
                <p className="text-xs text-gray-400 mt-1">{n.author?.first_name} {n.author?.last_name} · {new Date(n.updated_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'decisions' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
          {editable && (
            <div className="flex gap-2">
              <Input containerClassName="flex-1" placeholder="Record a decision…" value={decisionText} onChange={(e) => setDecisionText(e.target.value)} />
              <Button onClick={handleAddDecision} loading={addDecision.isPending}>Record</Button>
            </div>
          )}
          <ul className="flex flex-col gap-3">
            {(meeting.decisions || []).length === 0 && <p className="text-sm text-gray-400">No decisions recorded yet.</p>}
            {(meeting.decisions || []).map((d) => (
              <li key={d.id} className="p-3 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-800">{d.decision_text}</p>
                <p className="text-xs text-gray-400 mt-1">{d.decider?.first_name} {d.decider?.last_name} · {new Date(d.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'action-items' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-900">Action Items</h2>
            <Button size="sm" onClick={() => setActionOpen(true)}><Plus size={14} className="mr-1" /> New</Button>
          </div>
          <ul className="flex flex-col gap-2">
            {(meeting.action_items || []).length === 0 && <p className="text-sm text-gray-400">No action items yet.</p>}
            {(meeting.action_items || []).map((a) => (
              <li key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-400">
                    {a.assignee?.first_name} {a.assignee?.last_name}
                    {a.due_date ? ` · Due ${new Date(a.due_date).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={PRIORITY_BADGE[a.priority] as any}>{a.priority}</Badge>
                  <Badge variant={ACTION_BADGE[a.status]}>{a.status}</Badge>
                  {a.status !== 'COMPLETED' && (
                    <button
                      className="text-green-600 hover:text-green-700"
                      onClick={() => completeActionItem.mutate(a.id, {
                        onSuccess: () => toast.success('Action item completed'),
                        onError: (e: any) => toast.error(e?.message || 'Failed'),
                      })}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'agenda' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Agenda Items Discussed</h2>
          <ul className="flex flex-col gap-2">
            {(meeting.agenda_items || []).length === 0 && <p className="text-sm text-gray-400">No agenda items linked to this meeting.</p>}
            {(meeting.agenda_items || []).map((item) => (
              <li key={item.id} className="p-3 rounded-xl border border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <Badge variant={item.status === 'COMPLETED' ? 'success' : 'default'}>{item.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Activity Timeline</h2>
          <ul className="flex flex-col gap-3 border-l-2 border-gray-100 pl-4">
            {(timeline?.records || []).length === 0 && <p className="text-sm text-gray-400">No activity yet.</p>}
            {(timeline?.records || []).map((ev: any) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary-500" />
                <p className="text-sm text-gray-800">{ev.description}</p>
                <p className="text-xs text-gray-400">{new Date(ev.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        isOpen={actionOpen}
        onClose={() => setActionOpen(false)}
        title="New Action Item"
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button><Button onClick={handleCreateActionItem} loading={createActionItem.isPending}>Create</Button></div>}
      >
        <div className="flex flex-col gap-4">
          <Input label="Title" value={actionForm.title} onChange={(e) => setActionForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="Assignee User ID" value={actionForm.assignee_id} onChange={(e) => setActionForm((f) => ({ ...f, assignee_id: e.target.value }))} placeholder="user id" />
          <Input type="date" label="Due Date" value={actionForm.due_date} onChange={(e) => setActionForm((f) => ({ ...f, due_date: e.target.value }))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 ml-1">Priority</label>
            <select className="h-[46px] rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700" value={actionForm.priority} onChange={(e) => setActionForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <Textarea label="Notes" value={actionForm.notes} onChange={(e) => setActionForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        isOpen={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        title="Create Follow-up Meeting"
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setFollowUpOpen(false)}>Cancel</Button><Button onClick={handleFollowUp} loading={createMeeting.isPending}>Create</Button></div>}
      >
        <div className="flex flex-col gap-4">
          <Input label="Title" value={followUpForm.title} onChange={(e) => setFollowUpForm((f) => ({ ...f, title: e.target.value }))} />
          <Input type="datetime-local" label="Scheduled At" value={followUpForm.scheduled_at} onChange={(e) => setFollowUpForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
        </div>
      </Modal>

      <ActionModal
        isOpen={closeOpen}
        onClose={() => setCloseOpen(false)}
        onConfirm={handleClose}
        title="Close Meeting"
        description="This marks the meeting as completed. Continue?"
        confirmText="Close Meeting"
        confirmVariant="primary"
        icon="info"
        loading={closeMeeting.isPending}
      />
      <ActionModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Meeting"
        description="Participants will be notified that this meeting is cancelled. Continue?"
        confirmText="Cancel Meeting"
        confirmVariant="danger"
        icon="warning"
        loading={cancelMeeting.isPending}
      />
    </div>
  );
}
