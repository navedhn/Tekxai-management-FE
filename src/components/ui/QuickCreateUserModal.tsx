import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import { useCreateUserMutation, useUpdateUserMutation, useChangeUserRoleMutation, useUpdateEmployeeIdMutation } from '@/services/userService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetRolesQuery } from '@/services/roleService';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import { useDepartmentScopedTeams } from '@/services/adminService';
// Same canonical shift source/action the Attendance page's "Assign Shift"
// panel already uses (src/pages/admin/attendance/index.tsx) — GET
// /attendance/shifts for the real list of shift_schedules rows, POST
// /attendance/shifts/assign to create the employee_shifts assignment.
// Deliberately NOT a second shift model/endpoint.
import { useGetShiftsQuery, useAssignShiftMutation } from '@/services/attendanceService';
import { useMyPermissions } from '@/services/permissionsService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export interface QuickEditUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  employee_id?: string | null;
  designation_id?: string | null;

  business_unit_id?: string | null;
  department?: { id: string; business_unit?: { id: string } | null } | null;

  team?: { id: string; name: string } | null;
  role_id?: string | null;
  hire_date?: string | null;

  // Same shape the Employee Directory list API returns (resolve_effective_shifts
  // in be-work's attendance.repository.js) — the row object passed in as
  // editUser already carries this, no extra fetch needed.
  shift_source?: 'ASSIGNED' | 'FALLBACK_DEFAULT' | 'NONE' | null;
  assigned_shift?: { id: string; name: string } | null;
}

interface QuickCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;

  editUser?: QuickEditUser | null;
}

const EMPTY_FORM = { first_name: '', last_name: '', email: '', password: '', employee_id: '', designation_id: '', business_unit_id: '', department_id: '', team_id: '', role_id: '', hire_date: '', shift_id: '' };

// What Quick Edit's save should do about the shift field, given the
// employee's real starting shift_source/assigned_shift and the form's
// current shift_id. Pure/exported so it's directly testable without
// mounting the whole modal (which pulls in ~6 React Query hooks).
//   'ASSIGN'              -> call assignShift({ user_id, shift_id })
//   'CLEAR_UNSUPPORTED'   -> the admin cleared a real assignment; the
//                             backend has no unassign endpoint (assign_shift
//                             only ever creates a new employee_shifts row —
//                             see attendance.repository.js), so this is
//                             surfaced honestly rather than silently no-op'd
//                             or faked as success.
//   'NONE'                -> nothing to do (unchanged, no permission, or
//                             never had/selected a shift)
export function resolveShiftUpdateAction(
  editUser: QuickEditUser | null | undefined,
  formShiftId: string,
  canAssignShift: boolean,
): 'ASSIGN' | 'CLEAR_UNSUPPORTED' | 'NONE' {
  if (!canAssignShift) return 'NONE';
  const initialShiftId = editUser?.shift_source === 'ASSIGNED' ? (editUser.assigned_shift?.id || '') : '';
  if (formShiftId && formShiftId !== initialShiftId) return 'ASSIGN';
  if (!formShiftId && initialShiftId) return 'CLEAR_UNSUPPORTED';
  return 'NONE';
}

export function toFormState(u: QuickEditUser) {
  return {
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    email: u.email || '',
    password: '',
    employee_id: u.employee_id || '',
    designation_id: u.designation_id || '',

    business_unit_id: u.business_unit_id || u.department?.business_unit?.id || '',
    department_id: u.department?.id || '',
    team_id: u.team?.id || '',
    role_id: u.role_id || '',
    hire_date: u.hire_date ? String(u.hire_date).slice(0, 10) : '',
    // Preselect only a REAL per-employee assignment (shift_source ===
    // 'ASSIGNED') — never the org-wide fallback default. Preselecting the
    // fallback would make an unrelated "no personal assignment" employee
    // look like they already have one the moment the field is touched, and
    // saving without changing it would silently create a real assignment
    // row that was never actually chosen by whoever is editing.
    shift_id: u.shift_source === 'ASSIGNED' ? (u.assigned_shift?.id || '') : '',
  };
}

const QuickCreateUserModal: React.FC<QuickCreateUserModalProps> = ({ isOpen, onClose, editUser = null }) => {
  const toast = useToastContext();
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const changeRole = useChangeUserRoleMutation();
  const changeEmployeeId = useUpdateEmployeeIdMutation();
  const { data: designations = [] } = useGetDesignationsQuery();
  const { data: roles = [] } = useGetRolesQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const { data: businessUnits = [] } = useGetBusinessUnitsQuery();
  const { data: shifts = [] } = useGetShiftsQuery();
  const assignShift = useAssignShiftMutation();
  const { data: myPerms } = useMyPermissions();
  // Same permission the Attendance page's shift-assign action already
  // requires server-side (MANAGER = can('erp.attendance.edit') in
  // be-work's attendance.routes.js) — not a new permission invented for
  // this form. The backend enforces this regardless of what this hides;
  // this only controls whether the field is shown at all.
  const canAssignShift = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.attendance.edit');

  const isEditMode = !!editUser;

  const [formData, setFormData] = useState(EMPTY_FORM);

  const { teamsData, teamRecords, teamOptions } = useDepartmentScopedTeams(formData.department_id);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  const businessUnitOptions = businessUnits.map((bu: any) => ({ value: bu.id, label: bu.name }));
  // Real shift_schedules rows from GET /attendance/shifts — same source the
  // Attendance page's Assign Shift panel lists, never a hardcoded set.
  const shiftOptions = shifts.map((s: any) => ({ value: s.id, label: `${s.name} (${s.start_time}–${s.end_time})` }));

  const departmentOptions = departments
    .filter((d: any) => !formData.business_unit_id || (d.business_unit_id || d.business_unit?.id) === formData.business_unit_id)
    .map((d: any) => ({ value: d.id, label: d.name }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (val: string | number) => {
    setFormData((prev) => ({ ...prev, [name]: String(val) }));
  };

  const handleDepartmentChange = (val: string | number) => {
    setFormData((prev) => ({ ...prev, department_id: String(val ?? ''), team_id: '' }));
  };

  const handleBusinessUnitChange = (val: string | number) => {
    setFormData((prev) => ({ ...prev, business_unit_id: String(val ?? ''), department_id: '', team_id: '' }));
  };

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
    if (isEditMode && !formData.employee_id.trim()) newErrors.employee_id = 'Employee ID is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (isEditMode && editUser) {
      const data: Record<string, any> = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        designation_id: formData.designation_id,
        department_id: formData.department_id || null,

        business_unit_id: formData.business_unit_id || null,

        team_id: formData.team_id || null,
        hire_date: formData.hire_date || undefined,
      };
      if (formData.password) data.password = formData.password;

      const roleChanged = formData.role_id && formData.role_id !== editUser.role_id;
      const employeeIdChanged = formData.employee_id.trim() && formData.employee_id.trim() !== (editUser.employee_id || '');
      const shiftAction = resolveShiftUpdateAction(editUser, formData.shift_id, canAssignShift);

      updateUser.mutate({ id: editUser.id, data }, {
        onSuccess: async () => {
          try {
            if (roleChanged) await changeRole.mutateAsync({ id: editUser.id, role_id: formData.role_id });
            if (employeeIdChanged) await changeEmployeeId.mutateAsync({ id: editUser.id, employee_id: formData.employee_id.trim() });
            if (shiftAction === 'ASSIGN') await assignShift.mutateAsync({ user_id: editUser.id, shift_id: formData.shift_id });
            if (shiftAction === 'CLEAR_UNSUPPORTED') {
              toast.error('Employee updated, but removing an assigned shift isn’t supported yet — choose a different shift instead of clearing it.');
            } else {
              toast.success('Employee updated successfully');
            }
            onClose();
          } catch (err: any) {
            toast.error(err?.message || err?.response?.data?.message || 'Profile updated, but a follow-up change failed');
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

      quick_create: true,
    };
    if (formData.department_id) payload.department_id = formData.department_id;
    if (formData.business_unit_id) payload.business_unit_id = formData.business_unit_id;
    if (formData.team_id) payload.team_id = formData.team_id;
    if (formData.hire_date) payload.hire_date = formData.hire_date;

    createUser.mutate(payload, {
      onSuccess: async (res: any) => {
        const newUser = res?.payload || res;
        const name = `${payload.first_name} ${payload.last_name}`.trim();

        // No shift selected -> the employee is simply created without one
        // (resolves to the org fallback default via shift_source, same as
        // any other employee with no personal assignment) — never invents
        // a shift on their behalf.
        if (canAssignShift && formData.shift_id) {
          try {
            await assignShift.mutateAsync({ user_id: newUser.id, shift_id: formData.shift_id });
          } catch (err: any) {
            toast.error(err?.message || err?.response?.data?.message || 'User created, but assigning the shift failed — assign it from Employee Directory.');
          }
        }
        toast.success('User created successfully');

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
  const isSaving = isEditMode ? (updateUser.isPending || changeRole.isPending || changeEmployeeId.isPending) : (createUser.isPending || fetchingEmployeeId);

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
        {isEditMode ? (
          <Input
            label="Employee ID *"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleChange}
            error={errors.employee_id}
            placeholder="Not yet assigned"
            className="h-12 rounded-xl font-mono"
          />
        ) : (
          <Input
            label="Employee ID"
            value="Auto-generated on save"
            disabled
            readOnly
            className="h-12 rounded-xl bg-gray-50 text-gray-400"
          />
        )}

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
          label="Business Unit"
          options={businessUnitOptions}
          value={formData.business_unit_id}
          onChange={(v) => handleBusinessUnitChange(v ?? '')}
          placeholder="Select Business Unit"
          className="h-12 !rounded-xl"
        />

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

        {canAssignShift && (
          <SearchableSelect
            label="Shift"
            options={shiftOptions}
            value={formData.shift_id}
            onChange={(v) => handleSelectChange('shift_id')(v ?? '')}
            placeholder="Select Shift (optional)"
            className="h-12 !rounded-xl"
          />
        )}

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
