import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, X, Layers, Users } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import {
  useGetDivisionsQuery, useGetDepartmentsQuery, useCreateDivision, useUpdateDivision,
  useDeleteDivision, useBulkDeleteDivisions,
} from '@/services/departmentService';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { summarizeBulkDelete } from '@/utils/bulkDeleteSummary';
import ActionModal from '@/components/ui/ActionModal';
import BulkDeleteBar from '@/components/ui/BulkDeleteBar';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';

function Modal({ division, onClose }: { division?: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name: division?.name || '',
    description: division?.description || '',
    department_id: division?.department_id || '',
  });
  const [err, setErr] = useState('');

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.DEPARTMENT.LIST),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const createMutation = useCreateDivision();
  const updateMutation = useUpdateDivision();
  const mutation = division?.id ? updateMutation : createMutation;

  const handleSave = () => {
    setErr('');
    const { department_id, ...rest } = form;
    const payload = division?.id ? { id: division.id, ...rest } : { department_id, ...rest };
    mutation.mutate(payload as any, {
      onSuccess: () => onClose(),
      onError: (e: any) => setErr(e?.message || 'Failed to save'),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">{division?.id ? 'Edit Division' : 'Add Division'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Department <span className="text-red-500">*</span></label>
            <select
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
              value={form.department_id}
              disabled={!!division?.id}
              onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}
            >
              <option value="">Select department</option>
              {(departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Division Name <span className="text-red-500">*</span></label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Backend Engineering" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
            <textarea className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Division description…" />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.name || !form.department_id || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DivisionsPage() {
  const toast = useToastContext();
  const [q, setQ] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data, isLoading } = useGetDivisionsQuery(departmentFilter || undefined);
  const { data: departments } = useGetDepartmentsQuery();

  const divisions: any[] = (data || []).filter((d: any) =>
    !q || d.name?.toLowerCase().includes(q.toLowerCase()) || d.department?.name?.toLowerCase().includes(q.toLowerCase())
  );

  const { selected, allOnPageSelected, toggleAll, toggleOne, clear } =
    useBulkSelection(divisions.map(d => d.id));
  useEffect(() => { clear(); }, [q, departmentFilter]);

  const deleteMutation = useDeleteDivision();
  const bulkDelete = useBulkDeleteDivisions();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Division deleted'); setDeleteTarget(null); },
      onError: (e: any) => toast.error(e?.message || 'Failed to delete division'),
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    bulkDelete.mutate(ids, {
      onSuccess: (results) => {
        const byId = new Map(divisions.map(d => [d.id, d.name]));
        const { successMessage, errorMessage } = summarizeBulkDelete(results, 'division', id => byId.get(id) || id);
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
          <h1 className="text-2xl font-black text-gray-900">Divisions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage divisions within each department</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Add Division
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              placeholder="Search divisions…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-primary-400 min-w-[200px]"
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {(departments || []).map((dep: any) => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
          </select>
        </div>

        <BulkDeleteBar
          count={selected.size}
          entityLabel="division"
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
                {['Division', 'Department', 'Description', 'Employees', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : divisions.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No divisions found</td></tr>
              ) : divisions.map((div: any) => {
                const isChecked = selected.has(div.id);
                return (
                  <tr key={div.id} className={cn('hover:bg-gray-50 transition-colors', isChecked && 'bg-primary-50')}>
                    <td className="py-3 px-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(div.id)}
                        className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Layers size={14} className="text-purple-600" />
                        </div>
                        <span className="font-semibold text-gray-900">{div.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{div.department?.name || '—'}</td>
                    <td className="py-3 px-2 text-gray-500 max-w-[240px] truncate">{div.description || '—'}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Users size={13} className="text-gray-400" />
                        {div._count?.users ?? '—'}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModal(div)}
                          className="px-3 h-7 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => setDeleteTarget(div)}
                          className="px-3 h-7 border border-red-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && <Modal division={modal?.id ? modal : undefined} onClose={() => setModal(null)} />}

      <ActionModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Division"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone. Divisions still referenced by employees or teams cannot be deleted.`}
        confirmText="Delete"
        confirmVariant="danger"
        icon="delete"
        loading={deleteMutation.isPending}
      />

      <ActionModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Divisions"
        description={`Delete ${selected.size} selected division(s)? Any division still referenced by employees or teams will fail and be reported separately.`}
        confirmText="Delete"
        confirmVariant="danger"
        icon="delete"
        loading={bulkDelete.isPending}
      />
    </div>
  );
}
