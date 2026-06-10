import React, { useEffect, useRef, useState } from 'react';
import { Plus, FileText, ScrollText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HrDocumentType } from '@/types/marketing';
import { cn } from '@/utils/cn';

interface MemberActionsMenuProps {
  onCreateSalary: () => void;
  onSendDocument: (type: HrDocumentType) => void;
}

const MemberActionsMenu: React.FC<MemberActionsMenuProps> = ({
  onCreateSalary,
  onSendDocument,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        animation="none"
        rounded={false}
        className="rounded-lg text-xs font-bold h-9 px-3 bg-[#005CDA] text-white border-0 hover:bg-[#0047AB] shadow-none hover:shadow-md hover:-translate-y-0"
        onClick={onCreateSalary}
      >
        <Plus size={14} />
        Create Salary
      </Button>

      <div ref={ref} className="relative">
        <Button
          variant="outline"
          size="sm"
          animation="none"
          rounded={false}
          className="rounded-lg text-xs font-bold h-9 px-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-none hover:-translate-y-0"
          onClick={() => setOpen(v => !v)}
        >
          <FileText size={14} />
          HR Docs
          <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
        </Button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 text-left"
              onClick={() => {
                onSendDocument('offer_letter');
                setOpen(false);
              }}
            >
              <FileText size={15} className="text-[#005CDA] shrink-0" />
              Send Offer Letter
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 text-left"
              onClick={() => {
                onSendDocument('contract');
                setOpen(false);
              }}
            >
              <ScrollText size={15} className="text-[#005CDA] shrink-0" />
              Send Contract
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberActionsMenu;
