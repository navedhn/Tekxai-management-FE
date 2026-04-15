import React, { useState } from 'react';
import { Calendar, X, Paperclip } from 'lucide-react';
import { cn } from '@/utils/cn';
import Modal from '../ui/Modal';
import FormTextarea from '../form/FormTextarea';
import Button from '../ui/Button';

interface RequestTimeOffModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ReviewEditRequestModal: React.FC<RequestTimeOffModalProps> = ({ isOpen, onClose }) => {

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            customClass="max-w-[480px] overflow-hidden"
            title="Edit Request Time Off"
        >
            <div className="flex flex-col gap-6">

                <form className="flex flex-col gap-5">
                    <FormTextarea name='' placeholder='Explain wht this edit' />

                    <div className="flex items-center gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 rounded-xl h-12 font-black border-gray-200 text-gray-600"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        {/* <Button
                            type="button"
                            variant="outline"
                            className="flex-1 rounded-xl h-12 font-black border-gray-200 text-gray-600"
                            onClick={onClose}
                        >
                            Reject
                        </Button> */}
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary-100"
                        >
                            Submit Request
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default ReviewEditRequestModal;
