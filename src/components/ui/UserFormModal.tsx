import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import FormInput from '@/components/form/FormInput';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useGetTeamsQuery } from '@/services/adminService';
import { useCreateUserMutation, useUpdateUserMutation, useChangeUserRoleMutation } from '@/services/userService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useGetDesignationsQuery } from '@/services/designationService';
import ActionModal from '@/components/ui/ActionModal';

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
    designation_id: '',
    team_id: '',
    role_id: '',
    status: 'ACTIVE',
    hire_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // The role this user actually had when the modal opened — used to detect
  // whether the operator genuinely changed the role selection, vs. it just
  // carrying through untouched in the generic profile-save payload (which is
  // exactly the mechanism that silently demoted a SUPER_ADMIN to EMPLOYEE).
  const [originalRoleId, setOriginalRoleId] = useState('');
  const [pendingRoleChange, setPendingRoleChange] = useState<{ id: string; role_id: string; roleName: string } | null>(null);

  const toast = useToastContext();
  const { data: teamsData } = useGetTeamsQuery(undefined, true);
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const changeUserRole = useChangeUserRoleMutation();

  const { data: rolesData = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.ROLE.LIST);
      return (res?.payload || res || []) as { id: string; name: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: departmentsData = [] } = useGetDepartmentsQuery();
  const { data: designationsData = [] } = useGetDesignationsQuery();

  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  const roleOptions = rolesData
    .filter((r: any) => isSuperAdmin || !SUPER_ADMIN_ONLY_ROLES.includes(r.name))
    .map((r: any) => ({ value: r.id, label: r.name.replace(/_/g, ' ') }));

  const departmentOptions = departmentsData.map((d: any) => ({ value: d.id, label: d.name }));
  const designationOptions = designationsData.map((d: any) => ({ value: d.id, label: d.name }));

  const teamsOptions = Array.isArray((teamsData as any)?.payload?.records)
    ? (teamsData as any).payload.records.map((t: any) => ({ value: t.id, label: t.name }))
    : [];

  const defaultRoleId = rolesData.find((r: any) => r.name === 'EMPLOYEE')?.id || '';

  const isEdit = !!user;

  useEffect(() => {
    if (!isOpen) return;
    if (user) {
      // RBAC fix: the old chain `user.roles?.[0]?.role?.id || user.role_id`
      // never matched either backend shape this modal is actually fed
      // (Users admin page returns `user.role.id`; Employee Directory returns
      // a bare `user.role_id` after the accompanying backend fix) — it
      // always fell through to defaultRoleId (EMPLOYEE), silently. Reading
      // both real shapes here means the dropdown now reflects the user's
      // TRUE current role instead of defaulting.
      const currentRoleId = user.role?.id || user.role_id || defaultRoleId;
      setOriginalRoleId(currentRoleId);
      const deptId = user.department?.id || user.department_id || '';
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        password: '',
        department_id: deptId,
        // designation_id is the FK-based single write path (change_user_designation,
        // same one Employee Profile's Organization card uses) — the legacy
        // free-text `designation` string column is no longer read/written here.
        designation_id: user.designation_ref?.id || user.designation_id || '',
        team_id: user.team_memberships?.[0]?.team?.id || user.team_id || '',
        role_id: currentRoleId,
        status: user.status || 'ACTIVE',
        hire_date: user.hire_date ? new Date(user.hire_date).toISOString().slice(0, 10) : '',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        department_id: '',
        designation_id: '',
        team_id: '',
        role_id: defaultRoleId,
        status: 'ACTIVE',
        hire_date: '',
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

    if (isEdit) {
      // RBAC ISOLATION: the profile-update payload never includes role_id —
      // this is the fix for the SUPER_ADMIN -> EMPLOYEE corruption bug. Role
      // changes, if any, are submitted separately below via the dedicated
      // change-role endpoint, gated behind an explicit confirmation.
      const { role_id: _omit, ...profileFields } = formData;
      const payload: any = { ...profileFields };
      if (!password) delete payload.password;
      updateUser.mutate({ id: user.id, data: payload }, {
        onSuccess: () => {
          if (role_id && role_id !== originalRoleId) {
            setPendingRoleChange({ id: user.id, role_id, roleName: selectedRole?.name || role_id });
          } else {
            toast.success('User updated successfully');
            onClose();
          }
        },
        onError: (err: any) => toast.error(err.message || 'Failed to update user'),
      });
    } else {
      const payload: any = { ...formData, role: selectedRole?.name || 'EMPLOYEE', role_id };
      createUser.mutate(payload, {
        onSuccess: () => { toast.success('User created successfully'); onClose(); },
        onError: (err: any) => toast.error(err.message || 'Failed to create user'),
      });
    }
  };

  const confirmRoleChange = () => {
    if (!pendingRoleChange) return;
    changeUserRole.mutate({ id: pendingRoleChange.id, role_id: pendingRoleChange.role_id }, {
      onSuccess: () => {
        toast.success('User updated successfully');
        setPendingRoleChange(null);
        onClose();
      },
      onError: (err: any) => {
        toast.error(err.message || 'Failed to change role');
        setPendingRoleChange(null);
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit User' : 'Add New User'} size="lg">
      <div className="flex flex-col gap-5 p-2">
        {isEdit && (
          <Input
            label="Employee ID"
            value={user?.employee_id || 'Not assigned'}
            disabled
            readOnly
            className="h-12 rounded-xl bg-gray-50 text-gray-400"
          />
        )}

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
          <Select label="DESIGNATION" options={designationOptions} value={formData.designation_id}
            onChange={handleSelectChange('designation_id')} placeholder="Select Designation"
            className="h-12 !rounded-xl" />
        </div>

        <Input label="Hiring Date" name="hire_date" type="date" value={formData.hire_date}
          onChange={handleInputChange} className="h-12 rounded-xl" />

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

      <ActionModal
        isOpen={!!pendingRoleChange}
        onClose={() => setPendingRoleChange(null)}
        onConfirm={confirmRoleChange}
        title="Change User Role"
        description={`Change this user's role to "${pendingRoleChange?.roleName}"? This affects what they can access across the entire system.`}
        confirmText="Change Role"
        confirmVariant="warning"
        icon="warning"
        loading={changeUserRole.isPending}
      />
    </Modal>
  );
};

export default UserFormModal;
