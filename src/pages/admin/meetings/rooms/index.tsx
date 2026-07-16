import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Users2 } from 'lucide-react';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useMeetingRooms, useCreateMeetingRoom } from '@/services/meetingService';

const STATUS_BADGE: Record<string, 'success' | 'default' | 'warning'> = {
  ACTIVE: 'success',
  CLOSED: 'default',
  ARCHIVED: 'warning',
};

export default function MeetingRoomsPage() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const params = useMemo(() => ({ search: search || undefined, status: status || undefined }), [search, status]);
  const { data, isLoading } = useMeetingRooms(params);
  const createRoom = useCreateMeetingRoom();

  const rooms = data?.records || [];

  const handleCreate = () => {
    if (!form.name.trim()) return toast.error('Room name is required');
    createRoom.mutate(
      { name: form.name, description: form.description },
      {
        onSuccess: (room) => {
          toast.success('Meeting room created');
          setCreateOpen(false);
          setForm({ name: '', description: '' });
          navigate(`/admin/meetings/room/${room.id}`);
        },
        onError: (e: any) => toast.error(e?.message || 'Failed to create room'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Meeting Rooms</h1>
          <p className="text-sm text-gray-500">One room per topic, project, client or department</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-1" /> New Room
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <Input
          leftIcon={Search}
          placeholder="Search rooms, agenda, meetings, decisions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="max-w-xs"
        />
        <select
          className="h-[46px] rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="CLOSED">Closed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <p className="text-sm text-gray-400">Loading rooms…</p>}
        {!isLoading && rooms.length === 0 && <p className="text-sm text-gray-400">No meeting rooms found.</p>}
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm cursor-pointer hover:shadow-md transition-all"
            onClick={() => navigate(`/admin/meetings/room/${room.id}`)}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-gray-900">{room.name}</h3>
              <Badge variant={STATUS_BADGE[room.status] || 'default'}>{room.status}</Badge>
            </div>
            {room.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{room.description}</p>}
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Users2 size={14} /> {room.members?.length ?? 0} members</span>
              <span>{room._count?.meetings ?? 0} meetings</span>
              <span>{room._count?.agenda_items ?? 0} agenda items</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Meeting Room"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createRoom.isPending}>Create</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Room Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Weekly HR Meeting" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
        </div>
      </Modal>
    </div>
  );
}
