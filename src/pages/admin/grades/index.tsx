import React, { useState } from 'react';
import { Search, Plus, X, BarChart3, Users } from 'lucide-react';
import { useGetGradesQuery, useCreateGrade, useUpdateGrade } from '@/services/gradeService';

function Modal({ grade, onClose }: { grade?: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name: grade?.name || '',
    level: grade?.level ?? 1,
    description: grade?.description || '',
  });
  const [err, setErr] = useState('');

  const createMutation = useCreateGrade();
  const updateMutation = useUpdateGrade();
  const mutation = grade?.id ? updateMutation : createMutation;

  const handleSave = () => {
    setErr('');
    const payload = grade?.id ? { id: grade.id, ...form } : form;
    mutation.mutate(payload as any, {
      onSuccess: () => onClose(),
      onError: (e: any) => setErr(e?.message || 'Failed to save'),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">{grade?.id ? 'Edit Grade' : 'Add Grade'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Grade Name <span className="text-red-500">*</span></label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Senior, L3, Manager" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Level (rank) <span className="text-red-500">*</span></label>
            <input type="number" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.level} onChange={e => setForm(p => ({ ...p, level: +e.target.value }))} placeholder="Higher number = more senior" />
            <p className="text-[11px] text-gray-400 mt-1">Determines ordering — lower number is more junior.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
            <textarea className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
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

export default function GradesPage() {
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<any>(null);

  const { data, isLoading } = useGetGradesQuery();

  const grades: any[] = ((data as any[]) || []).filter((g: any) => !q || g.name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Grades / Levels</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage the seniority ladder, ordered by rank</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Add Grade
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            placeholder="Search grades…" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Level', 'Grade', 'Description', 'Employees', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : grades.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No grades found</td></tr>
              ) : grades.map((g: any) => (
                <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-700 text-xs font-black tabular-nums">
                      {g.level}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <BarChart3 size={14} className="text-blue-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{g.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-500 max-w-[240px] truncate">{g.description || '—'}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Users size={13} className="text-gray-400" />
                      {g._count?.users ?? '—'}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <button onClick={() => setModal(g)}
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

      {modal !== null && <Modal grade={modal?.id ? modal : undefined} onClose={() => setModal(null)} />}
    </div>
  );
}
