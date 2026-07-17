import React, { useState } from 'react';
import { Search, Plus, X, Landmark, Building2 } from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import BulkDeleteBar from '@/components/ui/BulkDeleteBar';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetBusinessUnitsQuery, useCreateBusinessUnit, useUpdateBusinessUnit,
  useDeleteBusinessUnit, useBulkDeleteBusinessUnits,
} from '@/services/businessUnitService';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { summarizeBulkDelete } from '@/utils/bulkDeleteSummary';
import { cn } from '@/utils/cn';

function Modal({ bu, onClose }: { bu?: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name: bu?.name || '',
    code: bu?.code || '',
    description: bu?.description || '',
    is_active: bu?.is_active ?? true,
  });
  const [err, setErr] = useState('');

  const createMutation = useCreateBusinessUnit();
  const updateMutation = useUpdateBusinessUnit();
  const mutation = bu?.id ? updateMutation : createMutation;
  const handleSave = () => {
    setErr('');
    const payload = bu?.id ? { id: bu.id, ...form } : form;
    mutation.mutate(payload as any, {
      onSuccess: () => onClose(),
      onError: (e: any) => setErr(e?.message || 'Failed to save'),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">{bu?.id ? 'Edit Business Unit' : 'Add Business Unit'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Business Unit Name <span className="text-red-500">*</span></label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. TekxAI Software House" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Code</label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. SOFTWARE_HOUSE" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
            <textarea className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Business unit description…" />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <input type="checkbox" className="w-4 h-4 rounded accent-primary-600"
              checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
            Active
          </label>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.name || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessUnitsPage() {
  const toast = useToastContext();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useGetBusinessUnitsQuery();

  const businessUnits: any[] = (data || []).filter((b: any) =>
    !q || b.name?.toLowerCase().includes(q.toLowerCase()) || b.code?.toLowerCase().includes(q.toLowerCase())
  );

  const { selected, allOnPageSelected, toggleAll, toggleOne, clear } =
    useBulkSelection(businessUnits.map(b => b.id));
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const deleteMutation = useDeleteBusinessUnit();
  const bulkDelete = useBulkDeleteBusinessUnits();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Business unit deleted');
        setDeleteTarget(null);
      },
      onError: (e: any) => toast.error(e?.message || 'Failed to delete business unit'),
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    bulkDelete.mutate(ids, {
      onSuccess: (results) => {
        const byId = new Map(businessUnits.map(b => [b.id, b.name]));
        const { successMessage, errorMessage } = summarizeBulkDelete(results, 'business unit', id => byId.get(id) || id);
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
          <h1 className="text-2xl font-black text-gray-900">Business Units</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage top-level business units (e.g. TekxAI Software House, TekxAI Cost Estimators)</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Add Business Unit
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            placeholder="Search business units…" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        <BulkDeleteBar
          count={selected.size}
          entityLabel="business unit"
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
                {['Business Unit', 'Code', 'Description', 'Departments', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : businessUnits.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">No business units found</td></tr>
              ) : businessUnits.map((bu: any) => (
                <tr key={bu.id} className={cn('hover:bg-gray-50 transition-colors', selected.has(bu.id) && 'bg-primary-50')}>
                  <td className="py-3 px-2">
                    <input
                      type="checkbox"
                      checked={selected.has(bu.id)}
                      onChange={() => toggleOne(bu.id)}
                      className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Landmark size={14} className="text-primary-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{bu.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{bu.code || '—'}</td>
                  <td className="py-3 px-2 text-gray-500 max-w-[240px] truncate">{bu.description || '—'}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Building2 size={13} className="text-gray-400" />
                      {bu._count?.departments ?? '—'}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn('px-2 py-0.5 rounded-lg text-xs font-semibold',
                      bu.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500')}>
                      {bu.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModal(bu)}
                        className="px-3 h-7 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(bu)}
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

      {modal !== null && <Modal bu={modal?.id ? modal : undefined} onClose={() => setModal(null)} />}

      <ActionModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Business Unit"
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
        title="Delete Business Units"
        description={`Delete ${selected.size} selected business unit(s)? Any business unit still referenced by departments will fail and be reported separately.`}
        confirmText="Delete"
        confirmVariant="danger"
        icon="delete"
        loading={bulkDelete.isPending}
      />
    </div>
  );
}
