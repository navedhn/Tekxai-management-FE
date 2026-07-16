import React, { useState } from 'react';
import { Search, Plus, X, Tag, Users } from 'lucide-react';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useGetDesignationsQuery, useCreateDesignation, useUpdateDesignation } from '@/services/designationService';

function Modal({ designation, onClose }: { designation?: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name: designation?.name || '',
    department_id: designation?.department_id || '',
    sort_order: designation?.sort_order ?? 0,
  });
  const [err, setErr] = useState('');

  const { data: departments } = useGetDepartmentsQuery();

  const createMutation = useCreateDesignation();
  const updateMutation = useUpdateDesignation();
  const mutation = designation?.id ? updateMutation : createMutation;
  const handleSave = () => {
    setErr('');
    const payload = { ...form, department_id: form.department_id || null };
    const data = designation?.id ? { id: designation.id, ...payload } : payload;
    mutation.mutate(data as any, {
      onSuccess: () => onClose(),
      onError: (e: any) => setErr(e?.message || 'Failed to save'),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">{designation?.id ? 'Edit Designation' : 'Add Designation'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Designation Name <span className="text-red-500">*</span></label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Backend Developer" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Department (optional)</label>
            <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 text-gray-700"
              value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}>
              <option value="">Not department-specific</option>
              {(departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Sort Order</label>
            <input type="number" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: +e.target.value }))} />
          </div>
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

export default function DesignationsPage() {
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<any>(null);

  const { data, isLoading } = useGetDesignationsQuery();

  const designations: any[] = (data || []).filter((d: any) =>
    !q || d.name?.toLowerCase().includes(q.toLowerCase()) || d.department?.name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Designations</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage job designations, optionally scoped to a department</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Add Designation
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            placeholder="Search designations…" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Designation', 'Department', 'Employees', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : designations.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-gray-400 text-sm">No designations found</td></tr>
              ) : designations.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                        <Tag size={14} className="text-teal-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{d.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-700">{d.department?.name || <span className="text-gray-400 italic">Any department</span>}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Users size={13} className="text-gray-400" />
                      {d._count?.users ?? '—'}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <button onClick={() => setModal(d)}
                      className="px-3 h-7 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && <Modal designation={modal?.id ? modal : undefined} onClose={() => setModal(null)} />}
    </div>
  );
}
