import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import FormInput from '@/components/form/FormInput';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useGetTeamsQuery } from '@/services/adminService';
import { useCreateUserMutation, useUpdateUserMutation } from '@/services/userService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

const statuses = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

// Roles hidden from non-super-admin users
const SUPER_ADMIN_ONLY_ROLES = ['SUPER_ADMIN'];

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, user }) => {
  const currentRole = useAuthStore(s => s.role);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    department_id: '',
    designation: '',
    team_id: '',
    role_id: '',
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toast = useToastContext();
  const { data: teamsData } = useGetTeamsQuery(undefined, true);
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();

  const { data: rolesData = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.ROLE.LIST);
      return (res?.payload || res || []) as { id: string; name: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: departmentsData = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.DEPARTMENT.LIST);
      return (res?.payload?.records || res?.payload || res || []) as { id: string; name: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  const roleOptions = rolesData
    .filter((r: any) => isSuperAdmin || !SUPER_ADMIN_ONLY_ROLES.includes(r.name))
    .map((r: any) => ({ value: r.id, label: r.name.replace(/_/g, ' ') }));

  const departmentOptions = departmentsData.map((d: any) => ({ value: d.id, label: d.name }));

  const teamsOptions = Array.isArray((teamsData as any)?.payload?.records)
    ? (teamsData as any).payload.records.map((t: any) => ({ value: t.id, label: t.name }))
    : [];

  const defaultRoleId = rolesData.find((r: any) => r.name === 'EMPLOYEE')?.id || '';

  const isEdit = !!user;

  useEffect(() => {
    if (!isOpen) return;
    if (user) {
      const currentRoleId = user.roles?.[0]?.role?.id || user.role_id || defaultRoleId;
      const deptId = user.department?.id || user.department_id || '';
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        password: '',
        department_id: deptId,
        designation: user.designation || '',
        team_id: user.team_memberships?.[0]?.team?.id || user.team_id || '',
        role_id: currentRoleId,
        status: user.status || 'ACTIVE',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        department_id: '',
        designation: '',
        team_id: '',
        role_id: defaultRoleId,
        status: 'ACTIVE',
      });
    }
    setErrors({});
  // Only re-initialize when the modal opens or the user changes, not when async data loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (val: string | number) => {
    setFormData(prev => ({ ...prev, [name]: String(val) }));
  };

  const handleSubmit = () => {
    const { first_name, last_name, email, department_id, password, role_id } = formData;
    const newErrors: Record<string, string> = {};
    if (!first_name) newErrors.first_name = 'First name is required';
    if (!last_name) newErrors.last_name = 'Last name is required';
    if (!email) newErrors.email = 'Email address is required';
    if (!department_id) newErrors.department_id = 'Department is required';
    if (!role_id) newErrors.role_id = 'Role is required';
    if (!isEdit && !password) newErrors.password = 'Password is required for new accounts';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const selectedRole = rolesData.find((r: any) => r.id === role_id);
    const payload: any = {
      ...formData,
      role: selectedRole?.name || 'EMPLOYEE',
      role_id,
    };

    if (isEdit) {
      if (!password) delete payload.password;
      updateUser.mutate({ id: user.id, data: payload }, {
        onSuccess: () => { toast.success('User updated successfully'); onClose(); },
        onError: (err: any) => toast.error(err.message || 'Failed to update user'),
      });
    } else {
      createUser.mutate(payload, {
        onSuccess: () => { toast.success('User created successfully'); onClose(); },
        onError: (err: any) => toast.error(err.message || 'Failed to create user'),
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit User' : 'Add New User'} size="lg">
      <div className="flex flex-col gap-5 p-2">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *" name="first_name" value={formData.first_name}
            onChange={handleInputChange} error={errors.first_name} placeholder="John" className="h-12 rounded-xl" />
          <Input label="Last Name *" name="last_name" value={formData.last_name}
            onChange={handleInputChange} error={errors.last_name} placeholder="Doe" className="h-12 rounded-xl" />
        </div>

        <Input label="Email Address *" name="email" value={formData.email}
          onChange={handleInputChange} error={errors.email} placeholder="user@example.com"
          type="email" className="h-12 rounded-xl" />

        <FormInput label={isEdit ? 'New Password (Optional)' : 'Password *'} name="password"
          value={formData.password} onChange={handleInputChange} error={errors.password}
          placeholder="••••••••" type="password" autoComplete="new-password" />

        <div className="grid grid-cols-2 gap-4">
          <Select label="ROLE *" options={roleOptions} value={formData.role_id}
            onChange={handleSelectChange('role_id')} error={errors.role_id}
            placeholder="Select Role" className="h-12 !rounded-xl" />
          <Select label="STATUS *" options={statuses} value={formData.status}
            onChange={handleSelectChange('status')} className="h-12 !rounded-xl" />
        </div>

        <Select label="DEPARTMENT *" options={departmentOptions} value={formData.department_id}
          onChange={handleSelectChange('department_id')} error={errors.department_id}
          placeholder="Select Department" className="h-12 !rounded-xl" />

        <div className="grid grid-cols-2 gap-4">
          <Select label="TEAM" options={teamsOptions} value={formData.team_id}
            onChange={handleSelectChange('team_id')} placeholder="Select Team"
            className="h-12 !rounded-xl" />
          <Input label="Designation" name="designation" value={formData.designation}
            onChange={handleInputChange} placeholder="e.g. Frontend Developer"
            className="h-12 rounded-xl" />
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" fullWidth className="h-12 rounded-xl" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth loading={createUser.isPending || updateUser.isPending}
            className="h-12 rounded-xl font-bold shadow-lg shadow-primary-100" onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserFormModal;
