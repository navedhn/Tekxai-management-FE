import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateUserMutation } from '@/services/userService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetRolesQuery } from '@/services/roleService';
import { useToastContext } from '@/components/toast/ToastProvider';

interface QuickCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Lightweight login-account creation — HR/Admin fills in only what's needed
// to grant access; everything else (education, emergency contacts, salary,
// etc.) is deferred to Employee Directory -> Employee Profile later. The
// backend already creates a stub employee_profiles row and assigns the
// employee_id server-side on every user creation (see users.service.js
// create_new_user) — this form is a thin wrapper around the existing
// POST /user endpoint, nothing new on the backend.
const QuickCreateUserModal: React.FC<QuickCreateUserModalProps> = ({ isOpen, onClose }) => {
  const toast = useToastContext();
  const createUser = useCreateUserMutation();
  const { data: designations = [] } = useGetDesignationsQuery();
  const { data: roles = [] } = useGetRolesQuery();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    designation_id: '',
    role_id: '',
    hire_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setFormData({ first_name: '', last_name: '', email: '', designation_id: '', role_id: '', hire_date: '' });
    setErrors({});
  }, [isOpen]);

  const designationOptions = designations.map((d) => ({ value: d.id, label: d.name }));
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name.replace(/_/g, ' ') }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (val: string | number) => {
    setFormData((prev) => ({ ...prev, [name]: String(val) }));
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.designation_id) newErrors.designation_id = 'Designation is required';
    if (!formData.role_id) newErrors.role_id = 'Role is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload: Record<string, any> = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      designation_id: formData.designation_id,
      role_id: formData.role_id,
    };
    if (formData.hire_date) payload.hire_date = formData.hire_date;

    createUser.mutate(payload, {
      onSuccess: (res: any) => {
        const employeeId = res?.payload?.employee_id || res?.employee_id;
        toast.success(employeeId ? `User created — Employee ID ${employeeId}` : 'User created successfully');
        onClose();
      },
      onError: (err: any) => toast.error(err?.message || 'Failed to create user'),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Create User" size="lg">
      <div className="flex flex-col gap-5 p-2">
        <Input
          label="Employee ID"
          value="Auto-generated on save"
          disabled
          readOnly
          className="h-12 rounded-xl bg-gray-50 text-gray-400"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name *"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            error={errors.first_name}
            placeholder="John"
            className="h-12 rounded-xl"
          />
          <Input
            label="Last Name *"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            error={errors.last_name}
            placeholder="Doe"
            className="h-12 rounded-xl"
          />
        </div>

        <Input
          label="Email Address *"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="user@example.com"
          className="h-12 rounded-xl"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Designation *"
            options={designationOptions}
            value={formData.designation_id}
            onChange={handleSelectChange('designation_id')}
            error={errors.designation_id}
            placeholder="Select Designation"
            className="h-12 !rounded-xl"
          />
          <Select
            label="Role *"
            options={roleOptions}
            value={formData.role_id}
            onChange={handleSelectChange('role_id')}
            error={errors.role_id}
            placeholder="Select Role"
            className="h-12 !rounded-xl"
          />
        </div>

        <Input
          label="Hiring Date"
          name="hire_date"
          type="date"
          value={formData.hire_date}
          onChange={handleChange}
          className="h-12 rounded-xl"
        />

        <div className="flex gap-3 mt-4">
          <Button variant="outline" fullWidth className="h-12 rounded-xl" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            loading={createUser.isPending}
            className="h-12 rounded-xl font-bold shadow-lg shadow-primary-100"
            onClick={handleSubmit}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default QuickCreateUserModal;
