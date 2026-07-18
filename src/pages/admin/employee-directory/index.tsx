import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, UserPlus, Download, Users, CheckCircle, Clock, UserX, Eye, Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetEmployeeDirectory } from '@/services/employeeService';
import { useDeleteUserMutation, useBulkDeleteUsersMutation } from '@/services/userService';
import { useToastContext } from '@/components/toast/ToastProvider';
import UserFormModal from '@/components/ui/UserFormModal';
import QuickCreateUserModal from '@/components/ui/QuickCreateUserModal';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetRolesQuery } from '@/services/roleService';
import { cn } from '@/utils/cn';
import { EMPLOYMENT_STATUS_LABELS } from '@/constants/employmentStatus';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:      'bg-green-100 text-green-700',
  INACTIVE:    'bg-gray-100 text-gray-500',
  ON_LEAVE:    'bg-amber-100 text-amber-700',
  SUSPENDED:   'bg-blue-100 text-blue-700',
  TERMINATED:  'bg-red-100 text-red-600',
  DECEASED:    'bg-gray-200 text-gray-600',
  PENDING:     'bg-purple-100 text-purple-700',
};

// Employment Status shares the same 6-value vocabulary as users.status.
const EMP_STATUS_STYLE: Record<string, string> = STATUS_STYLE;

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
  const [page, setPage]                   = useState(1);
  const [sortBy, setSortBy]               = useState('hire_date');
  const [sortDir, setSortDir]             = useState<'asc'|'desc'>('desc');
  const limit = 10;

  const { data: rolesData = [] } = useGetRolesQuery();
  const { data: designationsData = [] } = useGetDesignationsQuery();

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };

  const [editEmployee, setEditEmployee]   = useState<any>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<any>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const deleteUser = useDeleteUserMutation();
  const bulkDelete = useBulkDeleteUsersMutation();

  useEffect(() => {
    setStatus(urlStatus);
    setEmpStatus(urlEmpStatus);
    setPage(1);
  }, [urlStatus, urlEmpStatus]);

  // Clear selection when page/filters change
  useEffect(() => { setSelected(new Set()); }, [page, q, status, employmentStatus, employeeIdFilter, roleFilter, designationFilter]);
  // Restart at page 1 whenever a filter changes so results aren't left mid-list.
  useEffect(() => { setPage(1); }, [employeeIdFilter, roleFilter, designationFilter]);

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
  }, [q, divisionId, deptId, teamId, status, employmentStatus, employeeIdFilter, roleFilter, designationFilter, urlFilter, urlLifecycle, sortBy, sortDir, page, limit]);

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
    navigate('/hr/employee-directory', { replace: true });
  };

  const activeFilterCount = [q, divisionId, deptId, teamId, status, employmentStatus, urlFilter, urlLifecycle, employeeIdFilter, roleFilter, designationFilter].filter(Boolean).length;

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

  return (
    <div className="flex flex-col gap-6">
      {/* Edit modal — UserFormModal's own save mutation already invalidates
          ['employee-directory'] on success; no manual refetch needed. */}
      <UserFormModal
        isOpen={!!editEmployee}
        onClose={() => setEditEmployee(null)}
        user={editEmployee}
      />

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
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteUser.isPending}
                className="px-4 py-2 rounded-xl text-sm font-black bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteUser.isPending ? 'Removing…' : 'Remove'}
              </button>
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
              <button onClick={() => setBulkDeleteOpen(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
                className="px-4 py-2 rounded-xl text-sm font-black bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {bulkDelete.isPending ? 'Removing…' : `Remove ${selected.size}`}
              </button>
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
          <button onClick={handleExport} className="flex items-center gap-2 px-4 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            <Download size={16} />Export
          </button>
          <button
            onClick={() => setQuickCreateOpen(true)}
            className="flex items-center gap-2 px-4 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <UserPlus size={16} />Quick Create User
          </button>
          <button
            onClick={() => navigate('/hr/add-employee')}
            className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />Add Employee
          </button>
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
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm min-w-[130px] text-gray-600">
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Permanent</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
            <option value="DECEASED">Deceased</option>
          </select>
          <select value={employmentStatus} onChange={e => { setEmpStatus(e.target.value); setPage(1); }}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm min-w-[150px] text-gray-600">
            <option value="">All Employment Status</option>
            <option value="ACTIVE">Permanent</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
            <option value="DECEASED">Deceased</option>
          </select>
          <input
            value={employeeIdFilter}
            onChange={e => setEmployeeIdFilter(e.target.value)}
            placeholder="Employee ID"
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm min-w-[130px] text-gray-600 focus:outline-none focus:border-primary-400"
          />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm min-w-[130px] text-gray-600">
            <option value="">All Roles</option>
            {rolesData.map((r) => (
              <option key={r.id} value={r.name}>{r.name.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select value={designationFilter} onChange={e => setDesignationFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm min-w-[160px] text-gray-600">
            <option value="">All Designations</option>
            {designationsData.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="h-10 px-3 text-sm text-gray-400 hover:text-gray-600 underline">
              Clear filters
            </button>
          )}
        </div>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="mt-3 flex items-center gap-3 px-4 py-2.5 bg-primary-50 border border-primary-100 rounded-xl">
            <span className="text-sm font-semibold text-primary-700">
              {selected.size} employee{selected.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              Clear selection
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 text-xs font-black text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 size={13} /> Remove {selected.size} selected
            </button>
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
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE.PENDING)}>
                          Pending
                        </span>
                      ) : emp.employment_status ? (
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', EMP_STATUS_STYLE[emp.employment_status] || 'bg-gray-100 text-gray-500')}>
                          {EMP_STATUS_LABEL[emp.employment_status] || emp.employment_status}
                        </span>
                      ) : (
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[emp.status] || 'bg-gray-100 text-gray-500')}>
                          {EMP_STATUS_LABEL[emp.status] || emp.status || '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">
                      {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/hr/employee/${emp.employee_id || emp.id}`)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setEditEmployee(emp)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Employee"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(emp)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Employee"
                        >
                          <Trash2 size={14} />
                        </button>
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
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="h-8 w-8 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">‹</button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={cn('h-8 w-8 border rounded-lg text-sm font-semibold', page === p ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 hover:bg-gray-50')}>
                  {p}
                </button>
              ))}
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="h-8 w-8 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
