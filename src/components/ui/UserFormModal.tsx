import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useGetTeamsQuery } from '@/services/adminService';
import { useCreateUserMutation, useUpdateUserMutation } from '@/services/userService';
import { useToast } from '@/components/ui/Toast';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any; // If provided, we are in Edit mode
}

const departments = [
  { value: 'TekXAI', label: 'TekXAI' },
  { value: 'CE', label: 'CE' }
];

const roles = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EMPLLOYEE', label: 'Employee' }
];

const statuses = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' }
];

const designationsMap: Record<string, { value: string; label: string }[]> = {
  'CE': [
    { value: 'CE', label: 'CE' }
  ],
  'TekXAI': [
    { value: 'UI UX', label: 'UI UX' },
    { value: 'front-end-developer', label: 'Front End Developer' },
    { value: 'back-end-developer', label: 'Back End Developer' },
    { value: 'devops-developer', label: 'DevOps Developer' },
    { value: 'cms-developer', label: 'CMS Developer' },
    { value: 'ai-developer', label: 'AI Developer' },
    { value: 'hr', label: 'Human Resource' },
    { value: 'team-lead', label: 'Team Lead' }
  ]
};

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, user }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    department: '',
    designation: '',
    team_id: '',
    role: 'EMPLLOYEE',
    status: 'ACTIVE'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { showToast } = useToast();
  const { data: teamsData } = useGetTeamsQuery(undefined, isOpen);
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();

  const isEdit = !!user;

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        password: '', // Don't populate password
        department: user.department || '',
        designation: user.designation || '',
        team_id: user.team_memberships?.[0]?.team?.id || user.team_id || '',
        role: user.role?.name || user.role || 'EMPLLOYEE',
        status: user.status || 'ACTIVE'
      });
    } else if (!user && isOpen) {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        department: '',
        designation: '',
        team_id: '',
        role: 'EMPLLOYEE',
        status: 'ACTIVE'
      });
    }
  }, [user, isOpen]);

  const teamsOptions = Array.isArray((teamsData as any)?.payload?.records)
    ? (teamsData as any).payload.records.map((t: any) => ({ value: t.id, label: t.name }))
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (val: string | number) => {
    setFormData(prev => ({ ...prev, [name]: val }));
    
    // Reset dependent fields if department changes
    if (name === 'department') {
      setFormData(prev => ({ ...prev, designation: '', team_id: '' }));
    }
  };

  const handleSubmit = () => {
    const { first_name, last_name, email, department, role, password } = formData;
    
    // Inline validation
    const newErrors: Record<string, string> = {};
    if (!first_name) newErrors.first_name = 'First name is required';
    if (!last_name) newErrors.last_name = 'Last name is required';
    if (!email) newErrors.email = 'Email address is required';
    if (!department) newErrors.department = 'Department selection is required';
    if (!role) newErrors.role = 'System role is required';
    
    if (!isEdit && !password) {
      newErrors.password = 'Password is required for new accounts';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const payload: any = { ...formData, role_id: role };
    delete payload.role;

    if (isEdit) {
      // For update, exclude password if empty
      if (!password) delete payload.password;
      
      updateUser.mutate({ id: user.id, data: payload }, {
        onSuccess: () => {
          showToast('User updated successfully', 'success');
          onClose();
        },
        onError: (err: any) => {
          showToast(err.message || 'Failed to update user', 'error');
        }
      });
    } else {
      createUser.mutate(payload, {
        onSuccess: () => {
          showToast('User created successfully', 'success');
          onClose();
        },
        onError: (err: any) => {
          showToast(err.message || 'Failed to create user', 'error');
        }
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Add New User'}
      size="lg"
    >
      <div className="flex flex-col gap-5 p-2">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name *"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            error={errors.first_name}
            placeholder="John"
            className="h-12 rounded-xl"
          />
          <Input
            label="Last Name *"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            error={errors.last_name}
            placeholder="Doe"
            className="h-12 rounded-xl"
          />
        </div>

        <Input
          label="Email Address *"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          placeholder="user@example.com"
          type="email"
          className="h-12 rounded-xl"
        />

        <Input
          label={isEdit ? 'New Password (Optional)' : 'Password *'}
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          error={errors.password}
          placeholder="••••••••"
          type="password"
          className="h-12 rounded-xl"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="ROLE *"
            options={roles}
            value={formData.role}
            onChange={handleSelectChange('role')}
            error={errors.role}
            className="h-12 !rounded-xl"
          />
          <Select
            label="STATUS *"
            options={statuses}
            value={formData.status}
            onChange={handleSelectChange('status')}
            className="h-12 !rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
         <Select
            label="DEPARTMENT *"
            options={departments}
            value={formData.department}
            onChange={handleSelectChange('department')}
            error={errors.department}
            placeholder="Select Department"
            className="h-12 !rounded-xl"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="TEAM"
              options={teamsOptions}
              value={formData.team_id}
              onChange={handleSelectChange('team_id')}
              placeholder={formData.department ? "Select Team" : "Select Department First"}
              disabled={!formData.department}
              className="h-12 !rounded-xl"
            />
            <Select
              label="DESIGNATION"
              options={designationsMap[formData.department] || []}
              value={formData.designation}
              onChange={handleSelectChange('designation')}
              placeholder={formData.department ? "Select Designation" : "Select Department First"}
              disabled={!formData.department}
              className="h-12 !rounded-xl"
            />
          </div>
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
            loading={createUser.isPending || updateUser.isPending}
            className="h-12 rounded-xl font-bold shadow-lg shadow-primary-100"
            onClick={handleSubmit}
          >
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserFormModal;
