import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, UserPlus, Download, Users, CheckCircle, Clock, UserX, Eye, Edit2, Trash2, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetEmployeeDirectory } from '@/services/employeeService';
import { useDeleteUserMutation, useBulkDeleteUsersMutation, useSetLifecycleStageMutation } from '@/services/userService';
import { useToastContext } from '@/components/toast/ToastProvider';
import QuickCreateUserModal from '@/components/ui/QuickCreateUserModal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetRolesQuery } from '@/services/roleService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import { useGetGradesQuery } from '@/services/gradeService';
import { cn } from '@/utils/cn';
import { EMPLOYMENT_STATUS_LABELS } from '@/constants/employmentStatus';
import StatusBadge from '@/components/ui/StatusBadge';
import Button, { IconButton } from '@/components/ui/Button';

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'FREELANCE', label: 'Freelance' },
];

const LIFECYCLE_STAGE_OPTIONS = [
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'ACTIVE_EMPLOYMENT', label: 'Active Employment' },
  { value: 'NOTICE_PERIOD', label: 'Notice Period' },
  { value: 'EXIT_CLEARANCE', label: 'Exit Clearance' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const EMP_STATUS_LABEL: Record<string, string> = EMPLOYMENT_STATUS_LABELS;

function StatCard({ icon: Icon, color, label, value }: any) {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [searchParams] = useSearchParams();

  const urlStatus    = searchParams.get('status') || '';
  const urlEmpStatus = searchParams.get('employment_status') || '';
  const urlFilter    = searchParams.get('filter') || '';
  const urlLifecycle = searchParams.get('lifecycle_stage') || '';

  const [q, setQ]                         = useState('');
  const [divisionId, setDiv]              = useState('');
  const [deptId, setDept]                 = useState('');
  const [teamId, setTeam]                 = useState('');
  const [status, setStatus]               = useState(urlStatus);
  const [employmentStatus, setEmpStatus]  = useState(urlEmpStatus);
  const [employeeIdFilter, setEmployeeIdFilter] = useState('');
  const [roleFilter, setRoleFilter]             = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');
  const [workLocationFilter, setWorkLocationFilter] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [gradeFilter, setGradeFilter]           = useState('');
  const [page, setPage]                   = useState(1);
  const [sortBy, setSortBy]               = useState('hire_date');
  const [sortDir, setSortDir]             = useState<'asc'|'desc'>('desc');
  const limit = 10;

  const { data: rolesData = [] } = useGetRolesQuery();
  const { data: designationsData = [] } = useGetDesignationsQuery();
  const { data: businessUnitsData = [] } = useGetBusinessUnitsQuery();
  const { data: gradesData = [] } = useGetGradesQuery();
  // Same query key ('user-list-brief') used by Add Employee's Reporting
  // Manager picker and others — shares the cache instead of a new fetch.
  const { data: managersData = [] } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<any>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkLifecycleOpen, setBulkLifecycleOpen] = useState(false);
  const [bulkLifecycleStage, setBulkLifecycleStage] = useState('ACTIVE_EMPLOYMENT');
  const deleteUser = useDeleteUserMutation();
  const bulkDelete = useBulkDeleteUsersMutation();
  const setLifecycleStage = useSetLifecycleStageMutation();

  useEffect(() => {
    setStatus(urlStatus);
    setEmpStatus(urlEmpStatus);
    setPage(1);
  }, [urlStatus, urlEmpStatus]);

  // Clear selection when page/filters change
  useEffect(() => { setSelected(new Set()); }, [page, q, status, employmentStatus, employeeIdFilter, roleFilter, designationFilter, businessUnitFilter, employmentTypeFilter, workLocationFilter, supervisorFilter, gradeFilter]);
  // Restart at page 1 whenever a filter changes so results aren't left mid-list.
  useEffect(() => { setPage(1); }, [employeeIdFilter, roleFilter, designationFilter, businessUnitFilter, employmentTypeFilter, workLocationFilter, supervisorFilter, gradeFilter]);

  const filters = useMemo(() => {
    const f: Record<string, any> = {
      q: q || undefined,
      division_id: divisionId || undefined,
      department_id: deptId || undefined,
      team_id: teamId || undefined,
      status: status || undefined,
      employment_status: employmentStatus || undefined,
      employee_id: employeeIdFilter || undefined,
      role: roleFilter || undefined,
      designation_id: designationFilter || undefined,
      lifecycle_stage: urlLifecycle || undefined,
      business_unit_id: businessUnitFilter || undefined,
      employment_type: employmentTypeFilter || undefined,
      work_location: workLocationFilter || undefined,
      supervisor_id: supervisorFilter || undefined,
      grade_id: gradeFilter || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      limit,
    };
    if (urlFilter === 'new_this_month') {
      const now = new Date();
      f.hire_from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    }
    return f;
  }, [q, divisionId, deptId, teamId, status, employmentStatus, employeeIdFilter, roleFilter, designationFilter, businessUnitFilter, employmentTypeFilter, workLocationFilter, supervisorFilter, gradeFilter, urlFilter, urlLifecycle, sortBy, sortDir, page, limit]);

  const { data, isLoading } = useGetEmployeeDirectory(filters);
  const records: any[] = data?.records || [];
  const stats = data?.stats || {};
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Employee ID', 'Department', 'Designation', 'Status', 'Hire Date'];
    const rows = records.map((e: any) => [
      `${e.first_name || ''} ${e.last_name || ''}`.trim(),
      e.email || '',
      e.employee_id || '',
      e.department?.name || '',
      e.designation || '',
      e.status || '',
      e.hire_date ? new Date(e.hire_date).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'employees.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiRequest<any>(`api/v1/department`),
    select: (r: any) => r?.payload?.records || [],
    staleTime: 300000,
  });

  const clearFilters = () => {
    setQ(''); setDiv(''); setDept(''); setTeam('');
    setStatus(''); setEmpStatus(''); setPage(1);
    setEmployeeIdFilter(''); setRoleFilter(''); setDesignationFilter('');
    setBusinessUnitFilter(''); setEmploymentTypeFilter(''); setWorkLocationFilter('');
    setSupervisorFilter(''); setGradeFilter('');
    navigate('/admin/employee-directory', { replace: true });
  };

  const activeFilterCount = [q, divisionId, deptId, teamId, status, employmentStatus, urlFilter, urlLifecycle, employeeIdFilter, roleFilter, designationFilter, businessUnitFilter, employmentTypeFilter, workLocationFilter, supervisorFilter, gradeFilter].filter(Boolean).length;

  const filterLabel = () => {
    if (urlFilter === 'new_this_month') return '  · New This Month';
    if (urlLifecycle === 'PROBATION') return '  · Probation';
    if (status === 'PENDING') return '  · Pending';
    if (employmentStatus) return `  · ${EMP_STATUS_LABEL[employmentStatus] || employmentStatus}`;
    if (status) return `  · ${EMP_STATUS_LABEL[status] || status.replace(/_/g, ' ')}`;
    return '';
  };

  // Selection helpers
  const pageIds = records.map(r => r.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected(prev => { const n = new Set(prev); pageIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => new Set([...prev, ...pageIds]));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    // deleteUser's own onSuccess already invalidates ['employee-directory']
    // (invalidateUserAndDependents, userService.ts) — no manual refetch needed.
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`${deleteTarget.full_name || deleteTarget.email} removed`);
        setDeleteTarget(null);
      },
      onError: (e: any) => toast.error(e?.message || 'Failed to delete'),
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    bulkDelete.mutate(ids, {
      onSuccess: () => {
        toast.success(`${ids.length} employee(s) removed`);
        setSelected(new Set());
        setBulkDeleteOpen(false);
      },
      onError: (e: any) => toast.error(e?.message || 'Failed to delete'),
    });
  };

  const handleBulkLifecycle = () => {
    const ids = Array.from(selected);
    setLifecycleStage.mutate(
      { user_ids: ids, lifecycle_stage: bulkLifecycleStage },
      {
        onSuccess: () => {
          toast.success(`Lifecycle stage updated for ${ids.length} employee(s)`);
          setSelected(new Set());
          setBulkLifecycleOpen(false);
        },
        onError: (e: any) => toast.error(e?.message || 'Failed to update lifecycle stage'),
      }
    );
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Quick Create User — lightweight login-only creation, full profile filled in later */}
      <QuickCreateUserModal
        isOpen={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
      />

      {/* Single delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-black text-gray-900 mb-2">Remove Employee?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will deactivate <strong>{deleteTarget.full_name || deleteTarget.email}</strong> and revoke their access.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" animation="none" rounded={false} onClick={() => setDeleteTarget(null)} className="!px-4 !py-2 h-auto !shadow-none text-sm !text-gray-500">Cancel</Button>
              <Button
                variant="danger"
                size="sm"
                animation="none"
                rounded={false}
                onClick={handleDelete}
                loading={deleteUser.isPending}
                className="!px-4 !py-2 h-auto !shadow-none text-sm"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-black text-gray-900 mb-2">Remove {selected.size} Employee{selected.size > 1 ? 's' : ''}?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will deactivate <strong>{selected.size} selected employee{selected.size > 1 ? 's' : ''}</strong> and revoke their access. This action can be reversed by re-activating accounts individually.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" animation="none" rounded={false} onClick={() => setBulkDeleteOpen(false)} className="!px-4 !py-2 h-auto !shadow-none text-sm !text-gray-500">Cancel</Button>
              <Button
                variant="danger"
                size="sm"
                animation="none"
                rounded={false}
                onClick={handleBulkDelete}
                loading={bulkDelete.isPending}
                className="!px-4 !py-2 h-auto !shadow-none text-sm"
              >
                {`Remove ${selected.size}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Employee Directory{filterLabel()}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">View and manage all employees across the organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" animation="none" leftIcon={Download} onClick={handleExport} className="!h-10">
            Export
          </Button>
          <Button variant="outline" size="sm" animation="none" leftIcon={UserPlus} onClick={() => setQuickCreateOpen(true)} className="!h-10">
            Quick Create User
          </Button>
          <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => navigate('/admin/add-employee')} className="!h-10">
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users}       color="bg-blue-500"   label="Total Employees"    value={stats.total_employees} />
        <StatCard icon={CheckCircle} color="bg-green-500"  label="Permanent"          value={stats.active} />
        <StatCard icon={Clock}       color="bg-amber-500"  label="On Leave"           value={stats.on_leave} />
        <StatCard icon={UserX}       color="bg-gray-400"   label="Inactive"           value={stats.inactive} />
        <StatCard icon={Users}       color="bg-purple-500" label="Pending"            value={stats.pending} />
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              placeholder="Search by name, employee ID, email, or designation..."
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <SearchableSelect
            options={[
              { label: 'Pending', value: 'PENDING' },
              { label: 'Permanent', value: 'ACTIVE' },
              { label: 'Inactive', value: 'INACTIVE' },
              { label: 'On Leave', value: 'ON_LEAVE' },
              { label: 'Suspended', value: 'SUSPENDED' },
              { label: 'Terminated', value: 'TERMINATED' },
              { label: 'Deceased', value: 'DECEASED' },
            ]}
            value={status || null}
            onChange={v => { setStatus((v as string) ?? ''); setPage(1); }}
            placeholder="All Status"
            containerClassName="min-w-[130px] w-auto"
            className="h-10"
          />
          <SearchableSelect
            options={[
              { label: 'Permanent', value: 'ACTIVE' },
              { label: 'Inactive', value: 'INACTIVE' },
              { label: 'On Leave', value: 'ON_LEAVE' },
              { label: 'Suspended', value: 'SUSPENDED' },
              { label: 'Terminated', value: 'TERMINATED' },
              { label: 'Deceased', value: 'DECEASED' },
            ]}
            value={employmentStatus || null}
            onChange={v => { setEmpStatus((v as string) ?? ''); setPage(1); }}
            placeholder="All Employment Status"
            containerClassName="min-w-[150px] w-auto"
            className="h-10"
          />
          <input
            value={employeeIdFilter}
            onChange={e => setEmployeeIdFilter(e.target.value)}
            placeholder="Employee ID"
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm min-w-[130px] text-gray-600 focus:outline-none focus:border-primary-400"
          />
          <SearchableSelect
            options={rolesData.map((r) => ({ label: r.name.replace(/_/g, ' '), value: r.name }))}
            value={roleFilter || null}
            onChange={v => setRoleFilter((v as string) ?? '')}
            placeholder="All Roles"
            containerClassName="min-w-[130px] w-auto"
            className="h-10"
          />
          <SearchableSelect
            options={designationsData.map((d) => ({ label: d.name, value: d.id }))}
            value={designationFilter || null}
            onChange={v => setDesignationFilter((v as string) ?? '')}
            placeholder="All Designations"
            containerClassName="min-w-[160px] w-auto"
            className="h-10"
          />
          <SearchableSelect
            options={businessUnitsData.map((bu: any) => ({ label: bu.name, value: bu.id }))}
            value={businessUnitFilter || null}
            onChange={v => setBusinessUnitFilter((v as string) ?? '')}
            placeholder="All Business Units"
            containerClassName="min-w-[160px] w-auto"
            className="h-10"
          />
          <SearchableSelect
            options={EMPLOYMENT_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
            value={employmentTypeFilter || null}
            onChange={v => setEmploymentTypeFilter((v as string) ?? '')}
            placeholder="All Employment Types"
            containerClassName="min-w-[150px] w-auto"
            className="h-10"
          />
          <input
            value={workLocationFilter}
            onChange={e => setWorkLocationFilter(e.target.value)}
            placeholder="Work Location"
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm min-w-[140px] text-gray-600 focus:outline-none focus:border-primary-400"
          />
          <SearchableSelect
            options={managersData.map((m: any) => ({ label: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email, value: m.id }))}
            value={supervisorFilter || null}
            onChange={v => setSupervisorFilter((v as string) ?? '')}
            placeholder="All Reporting Managers"
            containerClassName="min-w-[170px] w-auto"
            className="h-10"
          />
          <SearchableSelect
            options={gradesData.map((g: any) => ({ label: g.name, value: g.id }))}
            value={gradeFilter || null}
            onChange={v => setGradeFilter((v as string) ?? '')}
            placeholder="All Grades"
            containerClassName="min-w-[130px] w-auto"
            className="h-10"
          />
          {activeFilterCount > 0 && (
            <Button variant="link" size="sm" animation="none" rounded={false} onClick={clearFilters} className="!h-10 !px-3 !shadow-none text-sm !text-gray-400 hover:!text-gray-600">
              Clear filters
            </Button>
          )}
        </div>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="mt-3 flex items-center gap-3 px-4 py-2.5 bg-primary-50 border border-primary-100 rounded-xl">
            <span className="text-sm font-semibold text-primary-700">
              {selected.size} employee{selected.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              animation="none"
              rounded={false}
              onClick={() => setSelected(new Set())}
              className="!px-3 !py-1.5 h-auto !shadow-none text-xs !text-gray-500 hover:!text-gray-700 hover:!bg-white"
            >
              Clear selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              animation="none"
              rounded={false}
              leftIcon={RefreshCw}
              onClick={() => setBulkLifecycleOpen(true)}
              className="!px-3 !py-1.5 h-auto !shadow-none text-xs !text-primary-700 !bg-white !border-primary-200 hover:!bg-primary-50"
            >
              Set Lifecycle Stage
            </Button>
            <Button
              variant="danger"
              size="sm"
              animation="none"
              rounded={false}
              leftIcon={Trash2}
              onClick={() => setBulkDeleteOpen(true)}
              className="!px-3 !py-1.5 h-auto !shadow-none text-xs"
            >
              Remove {selected.size} selected
            </Button>
          </div>
        )}

        {/* Bulk lifecycle-stage confirmation */}
        {bulkLifecycleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-base font-black text-gray-900 mb-2">Set Lifecycle Stage for {selected.size} Employee{selected.size > 1 ? 's' : ''}</h3>
              <p className="text-sm text-gray-500 mb-4">
                This directly overrides the lifecycle stage for the selected employee{selected.size > 1 ? 's' : ''}, bypassing the normal approval workflow. Use for correcting stuck/incorrect stages, not routine transitions.
              </p>
              <SearchableSelect
                options={LIFECYCLE_STAGE_OPTIONS}
                value={bulkLifecycleStage}
                onChange={(value) => setBulkLifecycleStage(String(value))}
                className="mb-5"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" animation="none" rounded={false} onClick={() => setBulkLifecycleOpen(false)} className="!px-4 !py-2 h-auto !shadow-none text-sm !text-gray-500">Cancel</Button>
                <Button
                  variant="primary"
                  size="sm"
                  rounded={false}
                  onClick={handleBulkLifecycle}
                  loading={setLifecycleStage.isPending}
                  className="!px-4 !py-2 h-auto text-sm"
                >
                  {`Update ${selected.size}`}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {/* Checkbox column */}
                <th className="py-3 px-2 w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                    title={allOnPageSelected ? 'Deselect all on page' : 'Select all on page'}
                  />
                </th>
                {[
                  { label: 'Employee',    col: 'name' },
                  { label: 'Employee ID', col: null },
                  { label: 'Designation', col: 'designation' },
                  { label: 'Department',  col: null },
                  { label: 'Team',        col: null },
                  { label: 'Manager',     col: null },
                  { label: 'Status',      col: 'status' },
                  { label: 'Join Date',   col: 'hire_date' },
                  { label: 'Actions',     col: null },
                ].map(({ label, col }) => (
                  <th key={label}
                    onClick={() => col && toggleSort(col)}
                    className={cn(
                      'text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap',
                      col ? 'cursor-pointer hover:text-gray-700 select-none' : ''
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {col && (
                        sortBy === col
                          ? sortDir === 'asc' ? <ChevronUp size={12} className="text-primary-500" /> : <ChevronDown size={12} className="text-primary-500" />
                          : <ChevronsUpDown size={12} className="text-gray-300" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={10} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400 text-sm">No employees found</td></tr>
              ) : records.map(emp => {
                const isChecked = selected.has(emp.id);
                return (
                  <tr key={emp.id} className={cn('hover:bg-gray-50 transition-colors', isChecked && 'bg-primary-50')}>
                    <td className="py-3 px-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(emp.id)}
                        className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-black text-sm flex-shrink-0">
                          {emp.avatar ? <img src={emp.avatar} className="w-9 h-9 rounded-full object-cover" alt="" /> : (emp.first_name?.[0] || '?')}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm leading-tight">{emp.full_name}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-600 font-mono text-xs">{emp.employee_id || '—'}</td>
                    <td className="py-3 px-2 text-gray-700">{emp.designation || '—'}</td>
                    <td className="py-3 px-2 text-gray-600">{emp.department?.name || '—'}</td>
                    <td className="py-3 px-2 text-gray-600">{emp.team?.name || '—'}</td>
                    <td className="py-3 px-2">
                      {emp.manager ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {emp.manager.first_name?.[0]}
                          </div>
                          <span className="text-gray-600 text-xs">{emp.manager.first_name?.[0]}. {emp.manager.last_name}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-2">
                      {emp.profile_status === 'DRAFT' ? (
                        <StatusBadge status="PENDING" label="Pending" size="sm" />
                      ) : emp.employment_status ? (
                        <StatusBadge status={emp.employment_status} label={EMP_STATUS_LABEL[emp.employment_status] || emp.employment_status} size="sm" />
                      ) : (
                        <StatusBadge status={emp.status} label={EMP_STATUS_LABEL[emp.status] || emp.status || '—'} size="sm" />
                      )}
                    </td>
                    <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">
                      {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon={Eye}
                          variant="ghost"
                          size="sm"
                          aria-label="View Profile"
                          title="View Profile"
                          onClick={() => navigate(`/admin/employee/${emp.employee_id || emp.id}`)}
                          className="!h-auto !w-auto p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                        />
                        <IconButton
                          icon={Edit2}
                          variant="ghost"
                          size="sm"
                          aria-label="Edit Employee"
                          title="Edit Employee"
                          onClick={() => navigate(`/admin/add-employee/${emp.id}`)}
                          className="!h-auto !w-auto p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        />
                        <IconButton
                          icon={Trash2}
                          variant="ghost"
                          size="sm"
                          aria-label="Remove Employee"
                          title="Remove Employee"
                          onClick={() => setDeleteTarget(emp)}
                          className="!h-auto !w-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} employees
              {someSelected && <span className="ml-2 text-primary-600 font-semibold">· {selected.size} selected</span>}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" animation="none" rounded={false} disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="!h-8 !w-8 !p-0 !shadow-none text-sm">‹</Button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
                <Button key={p} variant={page === p ? 'primary' : 'outline'} size="sm" animation="none" rounded={false} onClick={() => setPage(p)}
                  className="!h-8 !w-8 !p-0 !shadow-none text-sm font-semibold">
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="sm" animation="none" rounded={false} disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="!h-8 !w-8 !p-0 !shadow-none text-sm">›</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
