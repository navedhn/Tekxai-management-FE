import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select, { SelectOption } from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { useToastContext } from '@/components/toast/ToastProvider';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneId: string | number | null;
  members: any[];
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, milestoneId, members }) => {
  const [formData, setFormData] = useState({
    title: '',
    assignee: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToastContext();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string | number) => {
    setFormData(prev => ({ ...prev, assignee: String(value) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Task title is required';
    if (!formData.assignee) newErrors.assignee = 'Assignee is required';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Since there's no API yet, we'll just mock the success
    console.log('Adding Task to milestone:', milestoneId, formData);
    toast.success('Task added successfully (Mock)');
    
    // Reset form and close
    setFormData({ title: '', assignee: '', description: '' });
    onClose();
  };

  const memberOptions: SelectOption[] = members.map(m => ({
    label: `${m.first_name} ${m.last_name}`,
    value: m.id,
    icon: m.avatar ? (
      <img src={m.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
    ) : (
      <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white">
        {m.first_name?.charAt(0)}
      </div>
    )
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Task"
      size="sm"
      customClass="sm:min-w-[500px] w-full"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-1">
        <Input
          label="Task Title *"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          error={errors.title}
          placeholder="e.g. Design System Implementation"
          className="h-12 rounded-xl"
        />

        <Select
          label="Assignee *"
          options={memberOptions}
          value={formData.assignee}
          onChange={handleSelectChange}
          error={errors.assignee}
          placeholder="Select a team member"
        />

        <Textarea
          label="Description (Optional)"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Add some details about this task..."
          className="sm:min-h-[120px] rounded-xl"
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
            className="flex-1 h-12 w-full rounded-xl font-bold shadow-lg shadow-primary-100"
            leftIcon={Plus}
          >
            Add Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTaskModal;
