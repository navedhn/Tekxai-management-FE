import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateUserMutation } from '@/services/userService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetRolesQuery } from '@/services/roleService';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

interface QuickCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_FORM = { first_name: '', last_name: '', email: '', designation_id: '', department_id: '', role_id: '', hire_date: '' };

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
  const { data: departments = [] } = useGetDepartmentsQuery();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Set after a successful create — switches the modal to a confirmation
  // view showing the server-assigned Employee ID, with a "Create Another"
  // option that resets the form without closing the modal.
  const [created, setCreated] = useState<{ employeeId: string | null; name: string } | null>(null);
  const [fetchingEmployeeId, setFetchingEmployeeId] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(EMPTY_FORM);
    setErrors({});
    setCreated(null);
  }, [isOpen]);

  const designationOptions = designations.map((d) => ({ value: d.id, label: d.name }));
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name.replace(/_/g, ' ') }));
  const departmentOptions = departments.map((d: any) => ({ value: d.id, label: d.name }));

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
    if (formData.department_id) payload.department_id = formData.department_id;
    if (formData.hire_date) payload.hire_date = formData.hire_date;

    createUser.mutate(payload, {
      onSuccess: async (res: any) => {
        const newUser = res?.payload || res;
        const name = `${payload.first_name} ${payload.last_name}`.trim();
        toast.success('User created successfully');

        // POST /user doesn't return employee_id (users.repository.js's
        // USER_SELECT excludes it), but GET /employee/:id — the same
        // endpoint the Employee Directory already uses — does. Reusing it
        // here avoids any backend change just to surface the assigned ID.
        setFetchingEmployeeId(true);
        try {
          const detail = await apiRequest<any>(API_ENDPOINTS.EMPLOYEE.DETAIL(newUser.id));
          setCreated({ employeeId: detail?.payload?.employee_id || null, name });
        } catch {
          setCreated({ employeeId: null, name });
        } finally {
          setFetchingEmployeeId(false);
        }
      },
      onError: (err: any) => toast.error(err?.message || 'Failed to create user'),
    });
  };

  const handleCreateAnother = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setCreated(null);
  };

  if (created) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Quick Create User" size="lg">
        <div className="flex flex-col items-center text-center gap-4 p-6">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">{created.name} created</h3>
            <p className="text-sm text-gray-500 mt-1">
              {created.employeeId
                ? <>Employee ID <span className="font-mono font-bold text-gray-900">{created.employeeId}</span> was assigned automatically.</>
                : 'The account was created successfully.'}
            </p>
            <p className="text-xs text-gray-400 mt-2">HR can complete the rest of the profile later from Employee Directory.</p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <Button variant="outline" fullWidth className="h-12 rounded-xl" onClick={handleCreateAnother}>
              Create Another
            </Button>
            <Button variant="primary" fullWidth className="h-12 rounded-xl font-bold" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

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

        <Select
          label="Department"
          options={departmentOptions}
          value={formData.department_id}
          onChange={handleSelectChange('department_id')}
          placeholder="Select Department"
          className="h-12 !rounded-xl"
        />

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
            loading={createUser.isPending || fetchingEmployeeId}
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
