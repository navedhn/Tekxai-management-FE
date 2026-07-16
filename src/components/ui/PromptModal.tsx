import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MessageSquare } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  placeholder = 'Optional…',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
}) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) setValue('');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center p-2">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-6 bg-blue-50">
          <MessageSquare className="text-blue-500" size={24} />
        </div>

        <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 font-medium leading-relaxed mb-4 px-4">{description}</p>
        )}

        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full h-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none mb-6"
        />

        <div className="flex justify-center items-center w-full gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-12 w-full rounded-xl font-bold text-gray-500 border-gray-200 hover:bg-gray-50 transition-all"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => onConfirm(value.trim())}
            loading={loading}
            className="h-12 w-full rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 bg-primary-600 hover:bg-primary-700 shadow-primary-100"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PromptModal;
