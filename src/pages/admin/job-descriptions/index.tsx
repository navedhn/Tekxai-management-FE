import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { FileText, Plus, Edit2 } from 'lucide-react';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useFetchUsersQuery } from '@/services/userService';
import { useGetUserJD, useUpsertJDMutation } from '@/services/jdService';

const JDForm: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const toast = useToastContext();
  const { data: existing } = useGetUserJD(userId);
  const upsert = useUpsertJDMutation(userId);
  const [form, setForm] = useState({
    title: (existing as any)?.title || '',
    summary: (existing as any)?.summary || '',
    responsibilities: (existing as any)?.responsibilities || '',
    qualifications: (existing as any)?.qualifications || '',
    kpi_targets: (existing as any)?.kpi_targets || '',
    employment_type: (existing as any)?.employment_type || 'FULL_TIME',
  });

  const textarea = (label: string, key: string, placeholder: string) => (
    <div key={key} className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{label}</label>
      <textarea value={(form as any)[key]} rows={3}
        onChange={(e) => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none resize-none" />
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await upsert.mutateAsync(form); toast.success('JD saved'); onClose(); }
    catch { toast.error('Failed to save JD'); }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Job Title</label>
        <input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="e.g. Senior Frontend Developer"
          className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
      </div>
      {textarea('Summary', 'summary', 'Brief role description...')}
      {textarea('Responsibilities', 'responsibilities', 'Key duties and responsibilities...')}
      {textarea('Qualifications', 'qualifications', 'Required skills and experience...')}
      {textarea('KPI Targets', 'kpi_targets', 'Performance targets and metrics...')}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Employment Type</label>
        <select value={form.employment_type} onChange={(e) => setForm(p => ({ ...p, employment_type: e.target.value }))}
          className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none">
          {['FULL_TIME','PART_TIME','CONTRACT','INTERN'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" fullWidth loading={upsert.isPending}>Save JD</Button>
      </div>
    </form>
  );
};

const JobDescriptionsPage: React.FC = () => {
  const { data: users = [], isLoading } = useFetchUsersQuery({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const columns: Column<any>[] = [
    { header: 'Employee', key: 'first_name', render: (u) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-black text-sm">
          {u.first_name?.[0]}{u.last_name?.[0]}
        </div>
        <div>
          <p className="font-black text-gray-900">{u.first_name} {u.last_name}</p>
          <p className="text-xs text-gray-400">{u.email}</p>
        </div>
      </div>
    )},
    { header: 'Department', key: 'department', render: (u) => <span className="text-gray-600">{(u as any).department?.name || (u as any).department || '—'}</span> },
    { header: 'Designation', key: 'designation', render: (u) => <span className="text-gray-600">{u.designation || '—'}</span> },
    { header: 'Actions', key: 'id', align: 'right', render: (u) => (
      <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-xs" onClick={() => setSelectedUser(u.id)}>
        <Edit2 size={12} /> Manage JD
      </Button>
    )},
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Job Descriptions</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Create and manage employee JDs, responsibilities and KPI targets.</p>
      </div>
      <Card className="border-none shadow-sm">
        <Table columns={columns} data={users} isLoading={isLoading} emptyMessage="No employees found." />
      </Card>
      {selectedUser && (
        <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="Job Description">
          <JDForm userId={selectedUser} onClose={() => setSelectedUser(null)} />
        </Modal>
      )}
    </div>
  );
};

export default JobDescriptionsPage;
