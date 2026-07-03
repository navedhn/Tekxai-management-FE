import React from 'react';
import {  Clock, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { EditRequest, useApproveEditRequestMutation, useRejectEditRequestMutation } from '@/services/timesheetService';
import { useToastContext } from '@/components/toast/ToastProvider';

interface ReviewEditRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: EditRequest | null;
}

const ReviewEditRequestModal: React.FC<ReviewEditRequestModalProps> = ({ isOpen, onClose, request }) => {
    const toast = useToastContext();
    const approveMutation = useApproveEditRequestMutation();
    const rejectMutation = useRejectEditRequestMutation();

    const handleApprove = async () => {
        if (!request) return;
        try {
            await approveMutation.mutateAsync(request.id);
            toast.success('Edit request approved');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve request');
        }
    };

    const handleReject = async () => {
        if (!request) return;
        try {
            await rejectMutation.mutateAsync(request.id);
            toast.success('Edit request rejected');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject request');
        }
    };

    if (!request) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title="Review Edit Request"
        >
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-6">
                    {/* User Info */}
                    <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                        <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xl border-4 border-white shadow-sm uppercase">
                            {request.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">{request.name}</h3>
                            <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                                <Clock size={12} />
                                {request.time}
                            </div>
                        </div>
                    </div>

                    {/* Request Details */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Adjustment</span>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm italic text-gray-600 font-medium leading-relaxed">
                                "{request.reason}"
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                        <p className="text-[13px] font-bold text-amber-700 leading-snug">
                            Approving this will update the student's timesheet record with the requested changes.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 rounded-xl h-14 font-black border-red-100 text-red-500 hover:bg-red-50"
                        onClick={handleReject}
                        loading={rejectMutation.isPending}
                        disabled={approveMutation.isPending}
                    >
                        Reject Request
                    </Button>
                    <Button
                        variant="primary"
                        className="flex-1 rounded-xl h-14 font-black shadow-lg shadow-primary-100"
                        onClick={handleApprove}
                        loading={approveMutation.isPending}
                        disabled={rejectMutation.isPending}
                    >
                        Approve & Update
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ReviewEditRequestModal;

