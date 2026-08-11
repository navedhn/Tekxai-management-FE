import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import { useCreateUserMutation, useUpdateUserMutation, useChangeUserRoleMutation } from '@/services/userService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetRolesQuery } from '@/services/roleService';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useGetTeamsQuery } from '@/services/adminService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

// Minimal shape this modal needs from an Employee Directory row to prefill
// Quick Edit — deliberately just the fields the Quick Create form itself
// captures, nothing from the full HR profile.
export interface QuickEditUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  employee_id?: string | null;
  designation_id?: string | null;
  department?: { id: string } | null;
  // Single-team-per-user shape — same as employees.routes.js's directory
  // list response and users.repository.js's normalize_user (see be-work).
  team?: { id: string; name: string } | null;
  role_id?: string | null;
  hire_date?: string | null;
}

interface QuickCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Present -> the modal edits this user (Quick Edit) instead of creating a new one. */
  editUser?: QuickEditUser | null;
}

const EMPTY_FORM = { first_name: '', last_name: '', email: '', password: '', designation_id: '', department_id: '', team_id: '', role_id: '', hire_date: '' };

function toFormState(u: QuickEditUser) {
  return {
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    email: u.email || '',
    password: '',
    designation_id: u.designation_id || '',
    department_id: u.department?.id || '',
    team_id: u.team?.id || '',
    role_id: u.role_id || '',
    hire_date: u.hire_date ? String(u.hire_date).slice(0, 10) : '',
  };
}

// Lightweight login-account creation — HR/Admin fills in only what's needed
// to grant access; everything else (education, emergency contacts, salary,
// etc.) is deferred to Employee Directory -> Employee Profile later. The
// backend already creates a stub employee_profiles row and assigns the
// employee_id server-side on every user creation (see users.service.js
// create_new_user) — this form is a thin wrapper around the existing
// POST /user endpoint, nothing new on the backend.
//
// Quick Edit (editUser set) reuses the exact same field set against the
// existing PUT /user/:id (base fields + designation/department) and
// PUT /user/:id/role (role) endpoints — no new backend surface for editing
// either. This is deliberately NOT the full Add Employee wizard: employees
// created via Quick Create are edited here, in the same lightweight shape
// they were created in; the full wizard (Detailed Edit) is for employees
// created there.
const QuickCreateUserModal: React.FC<QuickCreateUserModalProps> = ({ isOpen, onClose, editUser = null }) => {
  const toast = useToastContext();
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const changeRole = useChangeUserRoleMutation();
  const { data: designations = [] } = useGetDesignationsQuery();
  const { data: roles = [] } = useGetRolesQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();

  const isEditMode = !!editUser;

  const [formData, setFormData] = useState(EMPTY_FORM);
  // Business Unit -> Division -> Department -> Team -> Employee hierarchy:
  // Team is scoped to whichever Department is currently selected. Filtered
  // server-side via department_id (be-work's teams module) — mirrors the
  // pattern the frontend already uses for Designation/Role, just parameterized.
  const { data: teamsData } = useGetTeamsQuery(
    formData.department_id ? { department_id: formData.department_id } : undefined,
    !!formData.department_id
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Set after a successful create — switches the modal to a confirmation
  // view showing the server-assigned Employee ID, with a "Create Another"
  // option that resets the form without closing the modal. Not used in
  // edit mode — editing just closes on success.
  const [created, setCreated] = useState<{ employeeId: string | null; name: string } | null>(null);
  const [fetchingEmployeeId, setFetchingEmployeeId] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(editUser ? toFormState(editUser) : EMPTY_FORM);
    setErrors({});
    setCreated(null);
  }, [isOpen, editUser]);

  const designationOptions = designations.map((d) => ({ value: d.id, label: d.name }));
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name.replace(/_/g, ' ') }));
  const departmentOptions = departments.map((d: any) => ({ value: d.id, label: d.name }));
  const teamRecords: Array<{ id: string; name: string }> = (teamsData as any)?.payload?.records || [];
  const teamOptions = teamRecords.map((t) => ({ value: t.id, label: t.name }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (val: string | number) => {
    setFormData((prev) => ({ ...prev, [name]: String(val) }));
  };

  // Department -> Team is a hard hierarchy (Business Unit -> Division ->
  // Department -> Team -> Employee) — switching Department immediately
  // clears the selected Team so a stale cross-department pick can never be
  // submitted (e.g. Marketing Department -> Engineering Team).
  const handleDepartmentChange = (val: string | number) => {
    setFormData((prev) => ({ ...prev, department_id: String(val ?? ''), team_id: '' }));
  };

  // Safety net for the case above: once the Team list for the (possibly
  // new) Department finishes loading, drop the current team_id if it isn't
  // actually in that list — covers Quick Edit's initial prefill (Department
  // and Team are both set at once from toFormState, so the explicit-clear
  // handler above never runs) plus any other path that sets both together.
  useEffect(() => {
    if (!formData.team_id || !teamsData) return;
    if (!teamRecords.some((t) => t.id === formData.team_id)) {
      setFormData((prev) => ({ ...prev, team_id: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsData]);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!isEditMode && !formData.password) newErrors.password = 'Password is required';
    else if (formData.password && formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!formData.designation_id) newErrors.designation_id = 'Designation is required';
    if (!formData.role_id) newErrors.role_id = 'Role is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (isEditMode && editUser) {
      const data: Record<string, any> = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        designation_id: formData.designation_id,
        department_id: formData.department_id || null,
        // Always sent (never omitted) in edit mode — team_id === undefined
        // means "leave team membership alone" server-side (see
        // update_existing_user in be-work), but Quick Edit's Team field is a
        // full editor: '' must mean "clear membership", not "don't touch it".
        team_id: formData.team_id || null,
        hire_date: formData.hire_date || undefined,
      };
      if (formData.password) data.password = formData.password;

      updateUser.mutate({ id: editUser.id, data }, {
        onSuccess: () => {
          const roleChanged = formData.role_id && formData.role_id !== editUser.role_id;
          if (roleChanged) {
            changeRole.mutate({ id: editUser.id, role_id: formData.role_id }, {
              onSuccess: () => { toast.success('Employee updated successfully'); onClose(); },
              onError: (err: any) => toast.error(err?.message || 'Profile updated, but role change failed'),
            });
          } else {
            toast.success('Employee updated successfully');
            onClose();
          }
        },
        onError: (err: any) => toast.error(err?.message || 'Failed to update employee'),
      });
      return;
    }

    const payload: Record<string, any> = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      designation_id: formData.designation_id,
      role_id: formData.role_id,
      // Quick Create is for adding someone already actively working, not a
      // formal new-hire onboarding — skips straight to ACTIVE_EMPLOYMENT
      // instead of the ONBOARDING stage the full Add Employee flow uses.
      quick_create: true,
    };
    if (formData.department_id) payload.department_id = formData.department_id;
    if (formData.team_id) payload.team_id = formData.team_id;
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

  const modalTitle = isEditMode ? 'Quick Edit' : 'Quick Create User';
  const isSaving = isEditMode ? (updateUser.isPending || changeRole.isPending) : (createUser.isPending || fetchingEmployeeId);

  if (created) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
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
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="flex flex-col gap-5 p-2">
        <Input
          label="Employee ID"
          value={isEditMode ? (editUser?.employee_id || 'Not yet assigned') : 'Auto-generated on save'}
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

        <Input
          label={isEditMode ? 'Password (leave blank to keep unchanged)' : 'Password *'}
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="••••••••"
          autoComplete="new-password"
          className="h-12 rounded-xl"
        />

        <div className="grid grid-cols-2 gap-4">
          <SearchableSelect
            label="Designation *"
            options={designationOptions}
            value={formData.designation_id}
            onChange={(v) => handleSelectChange('designation_id')(v ?? '')}
            error={errors.designation_id}
            placeholder="Select Designation"
            className="h-12 !rounded-xl"
            clearable={false}
          />
          <SearchableSelect
            label="Role *"
            options={roleOptions}
            value={formData.role_id}
            onChange={(v) => handleSelectChange('role_id')(v ?? '')}
            error={errors.role_id}
            placeholder="Select Role"
            className="h-12 !rounded-xl"
            clearable={false}
          />
        </div>

        <SearchableSelect
          label="Department"
          options={departmentOptions}
          value={formData.department_id}
          onChange={(v) => handleDepartmentChange(v ?? '')}
          placeholder="Select Department"
          className="h-12 !rounded-xl"
          clearable={false}
        />

        <SearchableSelect
          label="Team"
          options={teamOptions}
          value={formData.team_id}
          onChange={(v) => handleSelectChange('team_id')(v ?? '')}
          placeholder={formData.department_id ? 'Select Team' : 'Select a Department first'}
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
            loading={isSaving}
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
