import React from 'react';
import { Eye, FileDown, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface SalaryActionBarProps {
  onPreview?: () => void;
  onDownload?: () => void;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  className?: string;
}

const SalaryActionBar: React.FC<SalaryActionBarProps> = ({
  onPreview,
  onDownload,
  onSaveDraft,
  onPublish,
  className,
}) => (
  <div
    className={cn(
      'sticky bottom-0 -mx-6 sm:-mx-8 lg:-mx-10 px-6 sm:px-8 lg:px-10 py-4 bg-white/95 backdrop-blur border-t border-gray-100 flex flex-wrap gap-2 sm:gap-3 justify-end',
      className
    )}
  >
    <Button variant="outline" animation="none" rounded={false} className="rounded-lg" onClick={onPreview}>
      <Eye size={16} />
      Preview PDF
    </Button>
    <Button variant="outline" animation="none" rounded={false} className="rounded-lg" onClick={onDownload}>
      <FileDown size={16} />
      Download
    </Button>
    <Button variant="outline" animation="none" rounded={false} className="rounded-lg" onClick={onSaveDraft}>
      <Save size={16} />
      Save as Draft
    </Button>
    <Button
      animation="none"
      rounded={false}
      className="rounded-lg bg-[#067647] hover:bg-[#05603a] text-white border-0"
      onClick={onPublish}
    >
      <Send size={16} />
      Publish Salary
    </Button>
  </div>
);

export default SalaryActionBar;
