import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useCreateTeamMutation, useUpdateTeamMutation } from '@/services/adminService';
import { useToast } from '@/components/ui/Toast';

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  team?: any; // If provided, we are in Edit mode
}

const teamTypes = [
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'QA', label: 'Quality Assurance' },
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'HR', label: 'Human Resource' },
  { value: 'OTHER', label: 'Other' }
];

const TeamFormModal: React.FC<TeamFormModalProps> = ({ isOpen, onClose, team }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'DEVELOPMENT',
    description: ''
  });

  const { showToast } = useToast();
  const createTeam = useCreateTeamMutation();
  const updateTeam = useUpdateTeamMutation();

  const isEdit = !!team;

  useEffect(() => {
    if (team && isOpen) {
      setFormData({
        name: team.name || '',
        type: team.type || 'DEVELOPMENT',
        description: team.description || ''
      });
    } else if (!team && isOpen) {
      setFormData({
        name: '',
        type: 'DEVELOPMENT',
        description: ''
      });
    }
  }, [team, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (val: string | number) => {
    setFormData(prev => ({ ...prev, type: val as string }));
  };

  const handleSubmit = () => {
    if (!formData.name) {
      showToast('Team name is required', 'error');
      return;
    }

    if (isEdit) {
      updateTeam.mutate({ id: team.id, data: formData }, {
        onSuccess: () => {
          showToast('Team updated successfully', 'success');
          onClose();
        },
        onError: (err: any) => {
          showToast(err.message || 'Failed to update team', 'error');
        }
      });
    } else {
      createTeam.mutate(formData, {
        onSuccess: () => {
          showToast('Team created successfully', 'success');
          onClose();
        },
        onError: (err: any) => {
          showToast(err.message || 'Failed to create team', 'error');
        }
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Team' : 'Add New Team'}
      size="md"
    >
      <div className="flex flex-col gap-5">
        <Input
          label="Team Name *"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g. Frontend Avengers"
          className="h-12 rounded-xl"
        />

        <Select
          label="TEAM TYPE *"
          options={teamTypes}
          value={formData.type}
          onChange={handleSelectChange}
          className="h-12 !rounded-xl text-xs font-bold"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase ml-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="What does this team focus on?"
            className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500 min-h-[100px] text-gray-700 font-medium resize-none transition-all"
          />
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            fullWidth
            className="h-12 rounded-xl"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            loading={createTeam.isPending || updateTeam.isPending}
            className="h-12 rounded-xl font-bold shadow-lg shadow-primary-100"
            onClick={handleSubmit}
          >
            {isEdit ? 'Save Changes' : 'Create Team'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TeamFormModal;
