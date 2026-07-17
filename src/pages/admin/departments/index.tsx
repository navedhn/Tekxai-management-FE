import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, X, Building2, Users } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import ActionModal from '@/components/ui/ActionModal';
import BulkDeleteBar from '@/components/ui/BulkDeleteBar';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetDepartmentsQuery, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useBulkDeleteDepartments } from '@/services/departmentService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { summarizeBulkDelete } from '@/utils/bulkDeleteSummary';
import { cn } from '@/utils/cn';

function Modal({ dept, onClose }: { dept?: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name: dept?.name || '',
    description: dept?.description || '',
    head_user_id: dept?.head_user_id || '',
    business_unit_id: dept?.business_unit_id || dept?.business_unit?.id || '',
  });
  const [err, setErr] = useState('');

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || [],
  });

  const { data: businessUnits } = useGetBusinessUnitsQuery();

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const mutation = dept?.id ? updateMutation : createMutation;
  const handleSave = () => {
    setErr('');
    if (!form.business_unit_id) { setErr('Business unit is required'); return; }
    const payload = dept?.id ? { id: dept.id, ...form } : form;
    mutation.mutate(payload as any, {
      onSuccess: () => onClose(),
      onError: (e: any) => setErr(e?.message || 'Failed to save'),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">{dept?.id ? 'Edit Department' : 'Add Department'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Business Unit <span className="text-red-500">*</span></label>
            <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 text-gray-700"
              value={form.business_unit_id} onChange={e => setForm(p => ({ ...p, business_unit_id: e.target.value }))}>
              <option value="">Select business unit</option>
              {(businessUnits || []).map((bu: any) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Department Name <span className="text-red-500">*</span></label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Engineering" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
            <textarea className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Department description…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Department Head</label>
            <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 text-gray-700"
              value={form.head_user_id} onChange={e => setForm(p => ({ ...p, head_user_id: e.target.value }))}>
              <option value="">Select head</option>
              {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.name || !form.business_unit_id || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const toast = useToastContext();
  const [q, setQ] = useState('');
  const [buFilter, setBuFilter] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useGetDepartmentsQuery();
  const { data: businessUnits } = useGetBusinessUnitsQuery();

  const departments: any[] = (data || []).filter((d: any) =>
    (!q || d.name?.toLowerCase().includes(q.toLowerCase()) || d.description?.toLowerCase().includes(q.toLowerCase())) &&
    (!buFilter || d.business_unit_id === buFilter || d.business_unit?.id === buFilter)
  );

  const { selected, allOnPageSelected, toggleAll, toggleOne, clear } =
    useBulkSelection(departments.map(d => d.id));
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const deleteMutation = useDeleteDepartment();
  const bulkDelete = useBulkDeleteDepartments();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Department deleted');
        setDeleteTarget(null);
      },
      onError: (e: any) => toast.error(e?.message || 'Failed to delete department'),
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    bulkDelete.mutate(ids, {
      onSuccess: (results) => {
        const byId = new Map(departments.map(d => [d.id, d.name]));
        const { successMessage, errorMessage } = summarizeBulkDelete(results, 'department', id => byId.get(id) || id);
        toast.success(successMessage);
        if (errorMessage) toast.error(errorMessage, 6000);
        clear();
        setBulkDeleteOpen(false);
      },
      onError: (e: any) => toast.error(e?.message || 'Bulk delete failed'),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Departments</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage organizational departments</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Add Department
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              placeholder="Search departments…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 text-gray-700 sm:w-56"
            value={buFilter} onChange={e => setBuFilter(e.target.value)}>
            <option value="">All Business Units</option>
            {(businessUnits || []).map((bu: any) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
          </select>
        </div>

        <BulkDeleteBar
          count={selected.size}
          entityLabel="department"
          onClear={clear}
          onDelete={() => setBulkDeleteOpen(true)}
        />

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 px-2 w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                    title={allOnPageSelected ? 'Deselect all' : 'Select all'}
                  />
                </th>
                {['Department', 'Business Unit', 'Description', 'Head', 'Employees', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : departments.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">No departments found</td></tr>
              ) : departments.map((dept: any) => (
                <tr key={dept.id} className={cn('hover:bg-gray-50 transition-colors', selected.has(dept.id) && 'bg-primary-50')}>
                  <td className="py-3 px-2">
                    <input
                      type="checkbox"
                      checked={selected.has(dept.id)}
                      onChange={() => toggleOne(dept.id)}
                      className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Building2 size={14} className="text-primary-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{dept.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-600">{dept.business_unit?.name || '—'}</td>
                  <td className="py-3 px-2 text-gray-500 max-w-[240px] truncate">{dept.description || '—'}</td>
                  <td className="py-3 px-2 text-gray-700">
                    {dept.head ? `${dept.head.first_name} ${dept.head.last_name}` : dept.head_name || '—'}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Users size={13} className="text-gray-400" />
                      {dept.employee_count ?? dept._count?.users ?? '—'}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModal(dept)}
                        className="px-3 h-7 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(dept)}
                        className="px-3 h-7 border border-red-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && <Modal dept={modal?.id ? modal : undefined} onClose={() => setModal(null)} />}

      <ActionModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Department"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        icon="delete"
        loading={deleteMutation.isPending}
      />

      <ActionModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Departments"
        description={`Delete ${selected.size} selected department(s)? Any department still referenced by divisions or employees will fail and be reported separately.`}
        confirmText="Delete"
        confirmVariant="danger"
        icon="delete"
        loading={bulkDelete.isPending}
      />
    </div>
  );
}
