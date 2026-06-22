import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { ShieldCheck, Plus, Send } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetPolicies, useCreatePolicy, usePublishPolicy } from '@/services/policyService';

const PoliciesPage: React.FC = () => {
  const toast = useToastContext();
  const { data: policies = [], isLoading } = useGetPolicies();
  const createPolicy = useCreatePolicy();
  const publishPolicy = usePublishPolicy();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'GENERAL', content: '', version: '1.0', is_mandatory: true });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) { toast.error('Title and content required'); return; }
    try {
      await createPolicy.mutateAsync(form);
      toast.success('Policy created');
      setShowModal(false);
      setForm({ title: '', category: 'GENERAL', content: '', version: '1.0', is_mandatory: true });
    } catch { toast.error('Failed'); }
  };

  const columns: Column<any>[] = [
    { header: 'Policy', key: 'title', render: (p) => <span className="font-black">{p.title}</span> },
    { header: 'Category', key: 'category', render: (p) => <span className="text-gray-600">{p.category}</span> },
    { header: 'Version', key: 'version', render: (p) => <span className="font-mono text-xs">{p.version}</span> },
    { header: 'Mandatory', key: 'is_mandatory', render: (p) => p.is_mandatory ? <span className="text-red-500 font-bold text-xs">Yes</span> : <span className="text-gray-300 text-xs">No</span> },
    { header: 'Status', key: 'is_published', render: (p) => (
      <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5',
        p.is_published ? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100')}>
        {p.is_published ? 'Published' : 'Draft'}
      </Badge>
    )},
    { header: 'Actions', key: 'id', align: 'right', render: (p) => !p.is_published ? (
      <Button size="sm" variant="primary" className="rounded-xl gap-1 h-8 text-xs"
        onClick={() => publishPolicy.mutate(p.id, { onSuccess: () => toast.success('Policy published') })}>
        <Send size={12} /> Publish
      </Button>
    ) : null },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Company Policies</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage HR policies, attendance policies and compliance documents.</p>
        </div>
        <Button variant="primary" className="rounded-xl gap-2 h-10 px-5 font-black" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Policy
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <Table columns={columns} data={policies as any[]} isLoading={isLoading} emptyMessage="No policies yet." />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Policy">
        <form onSubmit={handleCreate} className="flex flex-col gap-4 mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {[{ label: 'Title *', key: 'title', ph: 'e.g. Leave Policy 2026' }, { label: 'Version', key: 'version', ph: '1.0' }].map(({ label, key, ph }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{label}</label>
              <input value={(form as any)[key]} onChange={(e) => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Category</label>
            <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none">
              {['GENERAL','LEAVE','ATTENDANCE','EQUIPMENT','REMOTE_WORK','CODE_OF_CONDUCT'].map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Content *</label>
            <textarea rows={6} value={form.content} onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Policy content..."
              className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_mandatory} onChange={(e) => setForm(p => ({ ...p, is_mandatory: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
            <span className="text-sm font-bold text-gray-700">Mandatory acknowledgement required</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={createPolicy.isPending}>Create Policy</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PoliciesPage;
