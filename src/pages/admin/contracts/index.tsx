import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import { FileText, Plus, Pen } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetContracts, useGetTemplates, useCreateContract, useCreateTemplate } from '@/services/contractService';
import { useFetchUsersQuery } from '@/services/userService';

const STATUS_COLORS: Record<string, string> = {
  DRAFT:  'bg-gray-50 text-gray-500 border-gray-100',
  SENT:   'bg-blue-50 text-blue-600 border-blue-100',
  SIGNED: 'bg-green-50 text-green-600 border-green-100',
  EXPIRED:'bg-red-50 text-red-400 border-red-100',
};

const TABS = ['Contracts', 'Templates'];

const ContractsPage: React.FC = () => {
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState('Contracts');
  const [showContract, setShowContract] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  const { data: contracts = [], isLoading: cLoading } = useGetContracts();
  const { data: templates = [], isLoading: tLoading } = useGetTemplates();
  const { data: users = [] } = useFetchUsersQuery({});
  const createContract = useCreateContract();
  const createTemplate = useCreateTemplate();

  const [contractForm, setContractForm] = useState({
    user_id: '', title: '', type: 'EMPLOYMENT',
    content: '', valid_from: '', valid_until: '', template_id: '',
  });
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'EMPLOYMENT', content: '' });

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.user_id || !contractForm.title || !contractForm.content) {
      toast.error('User, title and content are required'); return;
    }
    try {
      await createContract.mutateAsync(contractForm);
      toast.success('Contract created');
      setShowContract(false);
    } catch { toast.error('Failed to create contract'); }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.content) { toast.error('Name and content required'); return; }
    try {
      await createTemplate.mutateAsync(templateForm);
      toast.success('Template saved');
      setShowTemplate(false);
    } catch { toast.error('Failed to save template'); }
  };

  const contractCols: Column<any>[] = [
    {
      header: 'Contract',
      key: 'title',
      render: (c) => (
        <div>
          <p className="font-black text-gray-900">{c.title}</p>
          <p className="text-xs text-gray-400">{c.type}</p>
        </div>
      ),
    },
    {
      header: 'Employee',
      key: 'user',
      render: (c) => c.user ? `${c.user.first_name} ${c.user.last_name}` : c.user_id.slice(0, 8),
    },
    {
      header: 'Valid From',
      key: 'valid_from',
      render: (c) => c.valid_from ? new Date(c.valid_from).toLocaleDateString() : '—',
    },
    {
      header: 'Valid Until',
      key: 'valid_until',
      render: (c) => c.valid_until ? new Date(c.valid_until).toLocaleDateString() : '—',
    },
    {
      header: 'Status',
      key: 'status',
      render: (c) => (
        <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5', STATUS_COLORS[c.status] || '')}>
          {c.status}
        </Badge>
      ),
    },
    { header: 'Signed', key: 'signed_at', render: (c) => c.signed_at ? new Date(c.signed_at).toLocaleDateString() : '—' },
  ];

  const templateCols: Column<any>[] = [
    { header: 'Name', key: 'name', render: (t) => <span className="font-black">{t.name}</span> },
    { header: 'Type', key: 'type' },
    { header: 'Created', key: 'created_at', render: (t) => new Date(t.created_at).toLocaleDateString() },
  ];

  const inputClass = 'h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none';
  const labelClass = 'text-[10px] font-black text-gray-400 tracking-widest uppercase';

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Contracts</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage employment contracts, NDAs, and digital signatures.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl gap-2 h-10 px-4 font-bold" onClick={() => setShowTemplate(true)}>
            <Plus size={14} /> Template
          </Button>
          <Button variant="primary" className="rounded-xl gap-2 h-10 px-5 font-black" onClick={() => setShowContract(true)}>
            <FileText size={16} /> New Contract
          </Button>
        </div>
      </div>

      <Tabs options={TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'Contracts' && (
        <Card className="border-none shadow-sm">
          <Table columns={contractCols} data={contracts as any[]} isLoading={cLoading} emptyMessage="No contracts yet." />
        </Card>
      )}

      {activeTab === 'Templates' && (
        <Card className="border-none shadow-sm">
          <Table columns={templateCols} data={templates as any[]} isLoading={tLoading} emptyMessage="No templates yet." />
        </Card>
      )}

      {/* New Contract */}
      <Modal isOpen={showContract} onClose={() => setShowContract(false)} title="New Contract">
        <form onSubmit={handleCreateContract} className="flex flex-col gap-4 mt-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Employee *</label>
            <select value={contractForm.user_id} onChange={(e) => setContractForm(p => ({ ...p, user_id: e.target.value }))} className={inputClass}>
              <option value="">Select employee</option>
              {(users as any[]).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          {[
            { label: 'Contract Title *', key: 'title', ph: 'e.g. Employment Contract 2026' },
          ].map(({ label, key, ph }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className={labelClass}>{label}</label>
              <input value={(contractForm as any)[key]} onChange={(e) => setContractForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={ph} className={inputClass} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Valid From</label>
              <input type="date" value={contractForm.valid_from} onChange={(e) => setContractForm(p => ({ ...p, valid_from: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Valid Until</label>
              <input type="date" value={contractForm.valid_until} onChange={(e) => setContractForm(p => ({ ...p, valid_until: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Contract Content *</label>
            <textarea rows={6} value={contractForm.content} onChange={(e) => setContractForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Full contract text..."
              className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowContract(false)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={createContract.isPending}>Create Contract</Button>
          </div>
        </form>
      </Modal>

      {/* New Template */}
      <Modal isOpen={showTemplate} onClose={() => setShowTemplate(false)} title="Contract Template">
        <form onSubmit={handleCreateTemplate} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Template Name *</label>
            <input value={templateForm.name} onChange={(e) => setTemplateForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Standard Employment Contract" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Type</label>
            <select value={templateForm.type} onChange={(e) => setTemplateForm(p => ({ ...p, type: e.target.value }))} className={inputClass}>
              {['EMPLOYMENT','NDA','FREELANCE','INTERNSHIP'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Template Content *</label>
            <textarea rows={6} value={templateForm.content} onChange={(e) => setTemplateForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Use {{employee_name}}, {{start_date}}, {{salary}} as placeholders..."
              className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowTemplate(false)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={createTemplate.isPending}>Save Template</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContractsPage;
