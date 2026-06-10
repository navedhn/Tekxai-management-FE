import React, { useEffect, useState } from 'react';
import { FileText, Send, Eye } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { HrDocumentType, TeamMember } from '@/types/marketing';
import { getTeamLabel, HR_DOCUMENT_TEMPLATES } from '@/services/marketingService';
import { useToastContext } from '@/components/toast/ToastProvider';

interface SendHrDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  documentType: HrDocumentType;
  onSent: (memberId: string, type: HrDocumentType) => void;
}

const DOC_LABELS: Record<HrDocumentType, string> = {
  offer_letter: 'Offer Letter',
  contract: 'Employment Contract',
};

const SendHrDocumentModal: React.FC<SendHrDocumentModalProps> = ({
  isOpen,
  onClose,
  member,
  documentType,
  onSent,
}) => {
  const toast = useToastContext();
  const [templateId, setTemplateId] = useState('standard');
  const [startDate, setStartDate] = useState('');
  const [packagePkr, setPackagePkr] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const templates = HR_DOCUMENT_TEMPLATES[documentType];

  useEffect(() => {
    if (!isOpen || !member) return;
    setTemplateId('standard');
    setStartDate('');
    setPackagePkr('');
    setMessage(
      `Dear ${member.name.split(' ')[0]},\n\nPlease find attached your ${DOC_LABELS[documentType].toLowerCase()} from TekXAI. Review the details and let us know if you have any questions.\n\nBest regards,\nTekXAI HR Team`
    );
    setShowPreview(false);
  }, [isOpen, member, documentType]);

  if (!member) return null;

  const handleSend = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    onSent(member.id, documentType);
    toast.success(`${DOC_LABELS[documentType]} sent to ${member.email}`);
    setSending(false);
    onClose();
  };

  const previewBody = `TEKXAI — ${DOC_LABELS[documentType]}

To: ${member.name}
Email: ${member.email}
Role: ${member.role}
Team: ${getTeamLabel(member.teamId)}
${startDate ? `Start Date: ${startDate}` : ''}
${packagePkr ? `Package: PKR ${Number(packagePkr).toLocaleString()}` : ''}

${message}

— This document will be sent for e-signature once the backend is connected.`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <span className="inline-flex items-center gap-2">
          <FileText size={20} className="text-[#005CDA]" />
          Send {DOC_LABELS[documentType]}
        </span>
      }
      footer={
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" animation="none" rounded={false} className="rounded-lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            animation="none"
            rounded={false}
            className="rounded-lg"
            onClick={() => setShowPreview(v => !v)}
          >
            <Eye size={16} />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button
            animation="none"
            rounded={false}
            className="rounded-lg bg-[#005CDA] text-white border-0 hover:bg-[#0047AB]"
            loading={sending}
            onClick={handleSend}
          >
            <Send size={16} />
            Send to {member.name.split(' ')[0]}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-[#F8F8F8] border border-gray-100 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#005CDA] text-white flex items-center justify-center text-sm font-bold shrink-0">
            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 truncate">{member.name}</p>
            <p className="text-xs text-gray-500 truncate">{member.email} · {member.role}</p>
          </div>
        </div>

        <Select
          label="Document template"
          options={templates}
          value={templateId}
          onChange={v => setTemplateId(String(v))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <Input
            label="Package (PKR)"
            type="number"
            min={0}
            placeholder="e.g. 70000"
            value={packagePkr}
            onChange={e => setPackagePkr(e.target.value)}
          />
        </div>

        <Textarea
          label="Email message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
        />

        {showPreview && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Document preview</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{previewBody}</pre>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SendHrDocumentModal;
