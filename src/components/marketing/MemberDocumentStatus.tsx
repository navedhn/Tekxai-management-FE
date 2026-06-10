import React from 'react';
import { FileText, ScrollText } from 'lucide-react';
import { HrDocumentStatus } from '@/types/marketing';
import { cn } from '@/utils/cn';

const STATUS_STYLES: Record<HrDocumentStatus, string> = {
  not_sent: 'bg-gray-100 text-gray-500 border-gray-200',
  sent: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
  signed: 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]',
};

const STATUS_LABELS: Record<HrDocumentStatus, string> = {
  not_sent: 'Not sent',
  sent: 'Sent',
  signed: 'Signed',
};

interface MemberDocumentStatusProps {
  offerLetterStatus?: HrDocumentStatus;
  contractStatus?: HrDocumentStatus;
}

const DocPill: React.FC<{ icon: React.ReactNode; label: string; status: HrDocumentStatus }> = ({
  icon,
  label,
  status,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold whitespace-nowrap',
      STATUS_STYLES[status]
    )}
    title={`${label}: ${STATUS_LABELS[status]}`}
  >
    {icon}
    {STATUS_LABELS[status]}
  </span>
);

const MemberDocumentStatus: React.FC<MemberDocumentStatusProps> = ({
  offerLetterStatus = 'not_sent',
  contractStatus = 'not_sent',
}) => (
  <div className="flex flex-col gap-1.5">
    <DocPill icon={<FileText size={11} />} label="Offer Letter" status={offerLetterStatus} />
    <DocPill icon={<ScrollText size={11} />} label="Contract" status={contractStatus} />
  </div>
);

export default MemberDocumentStatus;
