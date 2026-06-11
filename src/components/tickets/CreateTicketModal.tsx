import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CreateTicketPayload, TicketPriority } from '@/types/ticket';
import { TICKET_RECIPIENTS, useCreateTicketMutation } from '@/services/ticketService';
import { useToastContext } from '@/components/toast/ToastProvider';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  createdBy: string;
  createdByEmail: string;
}

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const RECIPIENT_OPTIONS = TICKET_RECIPIENTS.map(r => ({
  label: r.role === 'other' ? r.label : `${r.label} — ${r.name}`,
  value: r.id,
}));

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  createdBy,
  createdByEmail,
}) => {
  const toast = useToastContext();
  const createMutation = useCreateTicketMutation();

  const [recipientId, setRecipientId] = useState('tl');
  const [customName, setCustomName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  useEffect(() => {
    if (!isOpen) return;
    setRecipientId('tl');
    setCustomName('');
    setSubject('');
    setDescription('');
    setPriority('medium');
  }, [isOpen]);

  const isOther = recipientId === 'other';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in subject and description.');
      return;
    }
    if (isOther && !customName.trim()) {
      toast.error('Please enter who this ticket is for.');
      return;
    }

    const payload: CreateTicketPayload = {
      subject,
      description,
      recipientId,
      customRecipientName: isOther ? customName : undefined,
      priority,
      createdBy,
      createdByEmail,
    };

    try {
      const ticket = await createMutation.mutateAsync(payload);
      toast.success(`Ticket ${ticket.ticketNumber} sent successfully!`);
      onClose();
    } catch {
      toast.error('Failed to send ticket. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Raise a Support Ticket"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" animation="none" rounded={false} className="rounded-lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            animation="none"
            rounded={false}
            className="rounded-lg bg-[#005CDA] text-white border-0 hover:bg-[#0047AB]"
            loading={createMutation.isPending}
            onClick={handleSubmit}
          >
            <Send size={16} />
            Send Ticket
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-gray-500 font-medium">
          Raise a ticket against your Team Lead, Office Boy, HR, Admin, or anyone else.
        </p>

        <Select
          label="Raise ticket to"
          options={RECIPIENT_OPTIONS}
          value={recipientId}
          onChange={v => setRecipientId(String(v))}
        />

        {isOther && (
          <Input
            label="Person / department name"
            placeholder="e.g. IT Support, Facility Manager"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
          />
        )}

        <Input
          label="Subject"
          placeholder="Brief summary of your issue"
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />

        <Textarea
          label="Description"
          placeholder="Describe your issue or request in detail..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
        />

        <Select
          label="Priority"
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={v => setPriority(v as TicketPriority)}
        />
      </form>
    </Modal>
  );
};

export default CreateTicketModal;
