import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react';

interface DeleteTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  ticketNumber: string;
  loading?: boolean;
}

const DeleteTicketModal: React.FC<DeleteTicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ticketNumber,
  loading = false,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setReason('');
    }
  }, [isOpen]);

  const canConfirm = confirmText.trim() === ticketNumber;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center p-2">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-6 bg-red-50">
          <Trash2 className="text-red-500" size={24} />
        </div>

        <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Delete Ticket</h3>
        <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6 px-2">
          Are you sure you want to permanently delete this ticket? This action cannot be undone.
        </p>

        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)…"
          className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none mb-4"
        />

        <div className="w-full text-left mb-6">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">
            Please type <span className="font-black text-gray-900">{ticketNumber}</span> to continue
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={ticketNumber}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 font-mono"
          />
        </div>

        <div className="flex justify-center items-center w-full gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-12 w-full rounded-xl font-bold text-gray-500 border-gray-200 hover:bg-gray-50 transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm || loading}
            loading={loading}
            className="h-12 w-full rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 bg-red-600 hover:bg-red-700 shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Ticket
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteTicketModal;
