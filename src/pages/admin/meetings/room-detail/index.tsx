import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle2, Archive, Lock, Paperclip } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import ActionModal from '@/components/ui/ActionModal';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useMeetingRoom, useAgendaItems, useCreateAgendaItem, useCompleteAgendaItem,
  useCreateMeeting, useSetMeetingRoomStatus, useMeetingRoomTimeline, useMeetingAttachments,
} from '@/services/meetingService';
import { useGetProjects } from '@/services/projectService';

const STATUS_BADGE: Record<string, 'success' | 'default' | 'warning'> = { ACTIVE: 'success', CLOSED: 'default', ARCHIVED: 'warning' };
const AGENDA_BADGE: Record<string, 'success' | 'default' | 'warning'> = { PENDING: 'default', IN_PROGRESS: 'warning', COMPLETED: 'success' };
const MEETING_BADGE: Record<string, 'success' | 'default' | 'warning'> = { SCHEDULED: 'default', COMPLETED: 'success', CANCELLED: 'warning' };

export default function MeetingRoomDetailPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const toast = useToastContext();
  const [tab, setTab] = useState('agenda');
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaForm, setAgendaForm] = useState({ title: '', description: '' });
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: '', scheduled_at: '', previous_meeting_id: '', project_id: '' });
  const { data: projects = [] } = useGetProjects();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { data: room, isLoading } = useMeetingRoom(roomId || null);
  const { data: agendaItems } = useAgendaItems(roomId || null);
  const { data: timeline } = useMeetingRoomTimeline(tab === 'timeline' ? roomId || null : null);
  const { data: attachments } = useMeetingAttachments('ROOM', tab === 'attachments' ? roomId || null : null);

  const createAgenda = useCreateAgendaItem();
  const completeAgenda = useCompleteAgendaItem();
  const createMeeting = useCreateMeeting();
  const setStatus = useSetMeetingRoomStatus();

  if (isLoading || !room) return <p className="text-sm text-gray-400">Loading…</p>;

  const handleAddAgenda = () => {
    if (!agendaForm.title.trim()) return toast.error('Title is required');
    createAgenda.mutate(
      { roomId: roomId!, data: agendaForm },
      {
        onSuccess: () => { toast.success('Agenda item added'); setAgendaOpen(false); setAgendaForm({ title: '', description: '' }); },
        onError: (e: any) => toast.error(e?.message || 'Failed to add agenda item'),
      },
    );
  };

  const handleCreateMeeting = () => {
    if (!meetingForm.title.trim() || !meetingForm.scheduled_at) return toast.error('Title and date/time are required');
    createMeeting.mutate(
      {
        room_id: roomId!,
        title: meetingForm.title,
        scheduled_at: meetingForm.scheduled_at,
        previous_meeting_id: meetingForm.previous_meeting_id || undefined,
        project_id: meetingForm.project_id || undefined,
      } as any,
      {
        onSuccess: (m) => { toast.success('Meeting scheduled'); setMeetingOpen(false); navigate(`/admin/meetings/meeting/${m.id}`); },
        onError: (e: any) => toast.error(e?.message || 'Failed to schedule meeting'),
      },
    );
  };

  const handleArchive = () => {
    setStatus.mutate(
      { id: roomId!, status: 'ARCHIVED' },
      {
        onSuccess: () => { toast.success('Room archived'); setArchiveOpen(false); },
        onError: (e: any) => toast.error(e?.message || 'Failed to archive room'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit" onClick={() => navigate('/admin/meetings/rooms')}>
        <ArrowLeft size={16} /> Back to rooms
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-900">{room.name}</h1>
            <Badge variant={STATUS_BADGE[room.status]}>{room.status}</Badge>
          </div>
          {room.description && <p className="text-sm text-gray-500 mt-1">{room.description}</p>}
        </div>
        <div className="flex gap-2">
          {room.status === 'ACTIVE' && (
            <Button onClick={() => setMeetingOpen(true)}><Plus size={16} className="mr-1" /> Schedule Meeting</Button>
          )}
          {room.status === 'ACTIVE' && (
            <Button variant="outline" onClick={() => setArchiveOpen(true)}><Archive size={16} className="mr-1" /> Archive Room</Button>
          )}
          {room.status !== 'ACTIVE' && (
            <span className="flex items-center gap-1 text-xs text-gray-400"><Lock size={14} /> Read-only</span>
          )}
        </div>
      </div>

      <Tabs
        options={[
          { label: 'Agenda', value: 'agenda' },
          { label: 'Meetings', value: 'meetings' },
          { label: 'Members', value: 'members' },
          { label: 'Attachments', value: 'attachments' },
          { label: 'Timeline', value: 'timeline' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'agenda' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-900">Agenda Items</h2>
            {room.status === 'ACTIVE' && (
              <Button size="sm" onClick={() => setAgendaOpen(true)}><Plus size={14} className="mr-1" /> Add Item</Button>
            )}
          </div>
          <ul className="flex flex-col gap-2">
            {(agendaItems || []).length === 0 && <p className="text-sm text-gray-400">No agenda items yet.</p>}
            {(agendaItems || []).map((item) => (
              <li key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{item.title}</p>
                  {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={AGENDA_BADGE[item.status]}>{item.status}</Badge>
                  {item.status !== 'COMPLETED' && room.status === 'ACTIVE' && (
                    <button
                      className="text-green-600 hover:text-green-700"
                      title="Mark complete"
                      onClick={() => completeAgenda.mutate({ roomId: roomId!, agendaId: item.id }, {
                        onSuccess: () => toast.success('Agenda item completed'),
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

      {tab === 'meetings' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Meeting History</h2>
          <ul className="flex flex-col gap-2">
            {(room.meetings || []).length === 0 && <p className="text-sm text-gray-400">No meetings scheduled yet.</p>}
            {(room.meetings || []).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/meetings/meeting/${m.id}`)}
              >
                <div>
                  <p className="font-semibold text-sm text-gray-800">{m.title}</p>
                  <p className="text-xs text-gray-400">{new Date(m.scheduled_at).toLocaleString()} · Organizer: {m.organizer?.first_name} {m.organizer?.last_name}</p>
                </div>
                <Badge variant={MEETING_BADGE[m.status]}>{m.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'members' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Members</h2>
          <ul className="flex flex-col gap-2">
            {(room.members || []).map((m) => (
              <li key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{m.user?.first_name} {m.user?.last_name}</p>
                  <p className="text-xs text-gray-400">{m.user?.email}</p>
                </div>
                <Badge variant={m.role === 'OWNER' ? 'info' as any : 'default'}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'attachments' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Paperclip size={16} /> Attachments</h2>
          <ul className="flex flex-col gap-2">
            {(attachments || []).length === 0 && <p className="text-sm text-gray-400">No attachments on this room.</p>}
            {(attachments || []).map((a) => (
              <li key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                <a href={a.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary-600 hover:underline">{a.file_name}</a>
                <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</span>
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
        isOpen={agendaOpen}
        onClose={() => setAgendaOpen(false)}
        title="Add Agenda Item"
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAgendaOpen(false)}>Cancel</Button><Button onClick={handleAddAgenda} loading={createAgenda.isPending}>Add</Button></div>}
      >
        <div className="flex flex-col gap-4">
          <Input label="Title" value={agendaForm.title} onChange={(e) => setAgendaForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" value={agendaForm.description} onChange={(e) => setAgendaForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        isOpen={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        title="Schedule Meeting"
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMeetingOpen(false)}>Cancel</Button><Button onClick={handleCreateMeeting} loading={createMeeting.isPending}>Schedule</Button></div>}
      >
        <div className="flex flex-col gap-4">
          <Input label="Title" value={meetingForm.title} onChange={(e) => setMeetingForm((f) => ({ ...f, title: e.target.value }))} />
          <Input type="datetime-local" label="Scheduled At" value={meetingForm.scheduled_at} onChange={(e) => setMeetingForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 ml-1">Link to Project (optional)</label>
            <select
              className="h-[46px] rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700"
              value={meetingForm.project_id}
              onChange={(e) => setMeetingForm((f) => ({ ...f, project_id: e.target.value }))}
            >
              <option value="">None</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          {(room.meetings || []).length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 ml-1">Follow-up of (optional)</label>
              <select
                className="h-[46px] rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700"
                value={meetingForm.previous_meeting_id}
                onChange={(e) => setMeetingForm((f) => ({ ...f, previous_meeting_id: e.target.value }))}
              >
                <option value="">None</option>
                {(room.meetings || []).map((m) => <option key={m.id} value={m.id}>{m.title} — {new Date(m.scheduled_at).toLocaleDateString()}</option>)}
              </select>
            </div>
          )}
        </div>
      </Modal>

      <ActionModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        title="Archive Meeting Room"
        description="Archived rooms remain fully readable/searchable but cannot be edited. Continue?"
        confirmText="Archive"
        confirmVariant="warning"
        icon="warning"
        loading={setStatus.isPending}
      />
    </div>
  );
}
