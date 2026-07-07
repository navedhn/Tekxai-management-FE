import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import DatePicker from '@/components/ui/DatePicker';
import Textarea from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { useToastContext } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';

interface CreateMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number | null;
}

const CreateMilestoneModal: React.FC<CreateMilestoneModalProps> = ({ isOpen, onClose, projectId }) => {
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToastContext();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.MILESTONE.CREATE(String(projectId)), {
      method: 'POST',
      body: JSON.stringify(formData),
    }),
    onSuccess: () => {
      toast.success('Milestone created successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(projectId || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MILESTONE.LIST(String(projectId)) });
      setFormData({ title: '', due_date: '', description: '' });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to create milestone'),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, due_date: date }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Milestone title is required';
    if (!formData.due_date) newErrors.due_date = 'Due date is required';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Milestone"
      size="sm"
      customClass="sm:min-w-[500px] w-full"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-1">
        <Input
          label="Milestone Title *"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          error={errors.title}
          placeholder="e.g. Backend API Development"
          className="h-12 rounded-xl"
        />

        <DatePicker
          label="Due Date *"
          placeholder="Select due date"
          value={formData.due_date}
          onChange={handleDateChange}
          error={errors.due_date}
        />

        <Textarea
          label="Description (Optional)"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Add some details about this milestone..."
          className="sm:min-h-[120px]  rounded-xl"
        />

        <div className="flex sm:flex-row w-full flex-col items-center gap-3 mt-2">
          <Button
            type="button"
            variant="outline"
            className="sm:flex-1 w-full h-12 rounded-xl font-bold"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="flex-1 h-12 w-full rounded-xl font-bold shadow-lg shadow-primary-100 disabled:opacity-50"
            leftIcon={Plus}
          >
            {isPending ? 'Creating…' : 'Create Milestone'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateMilestoneModal;
