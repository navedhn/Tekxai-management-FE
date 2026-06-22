import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { UserPlus, Send, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetCandidates, useCreateCandidate, useCreateOffer, useSendOffer } from '@/services/onboardingService';

const STATUS_COLORS: Record<string, string> = {
  INVITED:  'bg-yellow-50 text-yellow-600 border-yellow-100',
  ACCEPTED: 'bg-green-50 text-green-600 border-green-100',
  REJECTED: 'bg-red-50 text-red-600 border-red-100',
};

const OnboardingPage: React.FC = () => {
  const toast = useToastContext();
  const { data: candidates = [], isLoading } = useGetCandidates();
  const createCandidate = useCreateCandidate();
  const createOffer = useCreateOffer();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', position: '', phone: '' });

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
    { header: 'Actions', key: 'id', align: 'right', render: (c) => (
      <div className="flex gap-2 justify-end">
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
          <Button size="sm" variant="primary" className="rounded-xl gap-1 h-8 text-xs" onClick={async () => {
            // Send via useSendOffer - simplified here
            toast.info('Use offer management to send');
          }}>
            <Send size={12} /> Send
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
    </div>
  );
};

export default OnboardingPage;
