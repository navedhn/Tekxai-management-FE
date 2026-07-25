import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { FileText, Plus, RotateCw, PenLine, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetContracts, useGetTemplates, useCreateContract, useCreateTemplate,
  useRenewContract, CONTRACT_TYPE_CODES,
} from '@/services/contractService';
import { useGetDocumentCategories, useGetDocumentTypes } from '@/services/hrDocumentsService';
import { useFetchUsersQuery } from '@/services/userService';

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-gray-50 text-gray-500 border-gray-100',
  GENERATED: 'bg-blue-50 text-blue-600 border-blue-100',
  SENT:      'bg-amber-50 text-amber-600 border-amber-100',
  VIEWED:    'bg-purple-50 text-purple-600 border-purple-100',
  SIGNED:    'bg-green-50 text-green-600 border-green-100',
  REJECTED:  'bg-red-50 text-red-500 border-red-100',
  CANCELLED: 'bg-gray-100 text-gray-400 border-gray-200',
  EXPIRED:   'bg-orange-50 text-orange-600 border-orange-100',
  ARCHIVED:  'bg-gray-50 text-gray-400 border-gray-100',
};

const TYPE_LABELS: Record<string, string> = {
  EMPLOYMENT_CONTRACT: 'Employment Contract',
  NDA: 'NDA',
  CONSULTANCY_AGREEMENT: 'Consultancy Agreement',
};

const TABS = ['All', ...CONTRACT_TYPE_CODES.map((c) => TYPE_LABELS[c])];

const DAY_MS = 24 * 60 * 60 * 1000;

function expiry_badge(validUntil?: string | null) {
  if (!validUntil) return null;
  const days = Math.ceil((new Date(validUntil).getTime() - Date.now()) / DAY_MS);
  if (days < 0) return <Badge className="text-[10px] font-bold border rounded-lg px-2 py-0.5 bg-red-100 text-red-700 border-red-200 ml-2">Expired</Badge>;
  if (days <= 30) return <Badge className="text-[10px] font-bold border rounded-lg px-2 py-0.5 bg-amber-100 text-amber-700 border-amber-200 ml-2">{days}d left</Badge>;
  return null;
}

const ContractsPage: React.FC = () => {
  const toast = useToastContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [showContract, setShowContract] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  const { data: contracts = [], isLoading: cLoading } = useGetContracts();
  const { data: templates = [], isLoading: tLoading } = useGetTemplates();
  const { data: categories = [] } = useGetDocumentCategories();
  const { data: users = [] } = useFetchUsersQuery({});
  const createContract = useCreateContract();
  const createTemplate = useCreateTemplate();
  const renewContract = useRenewContract();

  // Only EMPLOYMENT + LEGAL categories are relevant to contracts (Employment
  // Contract lives under EMPLOYMENT, NDA + Consultancy Agreement under LEGAL).
  const contractCategoryIds = useMemo(
    () => categories.filter((c) => ['EMPLOYMENT', 'LEGAL'].includes(c.code)).map((c) => c.id),
    [categories]
  );
  const { data: allTypes = [] } = useGetDocumentTypes();
  const contractTypes = useMemo(
    () => allTypes.filter((t) => CONTRACT_TYPE_CODES.includes(t.code)),
    [allTypes]
  );

  const [contractForm, setContractForm] = useState({
    user_id: '', title: '', type_id: '', category_id: '',
    content: '', valid_from: '', valid_until: '', template_id: '',
  });
  const [templateForm, setTemplateForm] = useState({ name: '', type_id: '', category_id: '', content: '' });

  const filteredContracts = useMemo(() => {
    if (activeTab === 'All') return contracts;
    const code = Object.entries(TYPE_LABELS).find(([, label]) => label === activeTab)?.[0];
    return (contracts as any[]).filter((c) => c.type === code);
  }, [contracts, activeTab]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.user_id || !contractForm.title || !contractForm.type_id) {
      toast.error('Employee, title and document type are required'); return;
    }
    if (!contractForm.template_id && !contractForm.content) {
      toast.error('Select a template or write content'); return;
    }
    try {
      const type = contractTypes.find((t) => t.id === contractForm.type_id);
      await createContract.mutateAsync({ ...contractForm, category_id: type?.category_id });
      toast.success('Contract created');
      setShowContract(false);
      setContractForm({ user_id: '', title: '', type_id: '', category_id: '', content: '', valid_from: '', valid_until: '', template_id: '' });
    } catch { toast.error('Failed to create contract'); }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.content || !templateForm.type_id) { toast.error('Name, type and content required'); return; }
    try {
      const type = contractTypes.find((t) => t.id === templateForm.type_id);
      await createTemplate.mutateAsync({ ...templateForm, category_id: type?.category_id });
      toast.success('Template saved');
      setShowTemplate(false);
      setTemplateForm({ name: '', type_id: '', category_id: '', content: '' });
    } catch { toast.error('Failed to save template'); }
  };

  const handleRenew = async (c: any) => {
    try {
      await renewContract.mutateAsync({ id: c.id });
      toast.success('Renewal generated');
    } catch (e: any) { toast.error(e?.message || 'Failed to renew'); }
  };

  const contractCols: Column<any>[] = [
    {
      header: 'Contract',
      key: 'title',
      render: (c) => (
        <div>
          <button className="font-black text-gray-900 hover:text-primary-600 hover:underline text-left" onClick={() => navigate(`/admin/documents/${c.id}`)}>
            {c.title}
          </button>
          <p className="text-xs text-gray-400">{TYPE_LABELS[c.type] || c.type_name || c.type}</p>
        </div>
      ),
    },
    {
      header: 'Employee',
      key: 'user',
      render: (c) => c.user ? `${c.user.first_name} ${c.user.last_name}` : c.user_id.slice(0, 8),
    },
    {
      header: 'Template / Version',
      key: 'template_version',
      render: (c) => c.template_version ? `${c.template?.name || 'Template'} (v${c.template_version.version})` : <span className="text-gray-300">— custom —</span>,
    },
    {
      header: 'Valid Until',
      key: 'valid_until',
      render: (c) => (
        <span className="flex items-center whitespace-nowrap">
          {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : '—'}
          {expiry_badge(c.valid_until)}
        </span>
      ),
    },
    {
      header: 'Approval / Status',
      key: 'status',
      render: (c) => (
        <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5', STATUS_COLORS[c.status] || '')}>
          {c.status === 'DRAFT' ? 'Pending Approval' : c.status}
        </Badge>
      ),
    },
    {
      header: 'Signatures',
      key: 'signatures',
      render: (c) => {
        const signed = (c.signatures || []).filter((s: any) => s.signed_at);
        if (!signed.length) return <span className="text-xs text-gray-300">Unsigned</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {signed.map((s: any) => (
              <span key={s.id} className="flex items-center gap-1 text-[11px] text-green-600 font-semibold">
                <ShieldCheck size={12} /> {s.signer_role} · {new Date(s.signed_at).toLocaleDateString()}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Renewal',
      key: 'renewal',
      render: (c) => (
        <div className="flex items-center gap-2">
          {c.previous_document && <span className="text-[10px] text-gray-400">Renewed from prior</span>}
          {c.renewals?.length > 0 && <span className="text-[10px] text-gray-400">Renewed ×{c.renewals.length}</span>}
          {['SIGNED', 'EXPIRED', 'REJECTED'].includes(c.status) && (
            <button
              onClick={() => handleRenew(c)}
              disabled={renewContract.isPending}
              className="flex items-center gap-1 px-2 h-7 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <RotateCw size={11} />Renew
            </button>
          )}
        </div>
      ),
    },
    {
      header: '',
      key: 'actions',
      render: (c) => (
        <button
          onClick={() => navigate(`/admin/documents/${c.id}`)}
          className="flex items-center gap-1 px-3 h-7 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
        >
          <PenLine size={11} />Manage
        </button>
      ),
    },
  ];

  const templateCols: Column<any>[] = [
    { header: 'Name', key: 'name', render: (t) => <span className="font-black">{t.name}</span> },
    { header: 'Type', key: 'type', render: (t) => TYPE_LABELS[t.type?.code] || t.type?.name },
    { header: 'Current Version', key: 'current_version', render: (t) => t.current_version ? `v${t.current_version.version}` : '—' },
    { header: 'Approval Required', key: 'requires_approval', render: (t) => t.requires_approval ? <Badge className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] px-2 py-0.5 rounded-lg">Yes</Badge> : <span className="text-gray-300 text-xs">No</span> },
    { header: 'Created', key: 'created_at', render: (t) => new Date(t.created_at).toLocaleDateString() },
  ];

  const inputClass = 'h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none';
  const labelClass = 'text-[10px] font-black text-gray-400 tracking-widest uppercase';

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Contracts</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Employment contracts, NDAs, and consultancy agreements — expiry, renewals, and digital signatures.</p>
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

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              'px-4 h-9 rounded-xl text-xs font-bold border transition-colors',
              activeTab === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <Table columns={contractCols} data={filteredContracts as any[]} isLoading={cLoading} emptyMessage="No contracts yet." />
      </Card>

      <div>
        <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide mb-3">Contract Templates</h2>
        <Card className="border-none shadow-sm">
          <Table columns={templateCols} data={templates as any[]} isLoading={tLoading} emptyMessage="No templates yet." />
        </Card>
      </div>

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
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Contract Type *</label>
            <select value={contractForm.type_id} onChange={(e) => setContractForm(p => ({ ...p, type_id: e.target.value, template_id: '' }))} className={inputClass}>
              <option value="">Select type</option>
              {contractTypes.map((t) => <option key={t.id} value={t.id}>{TYPE_LABELS[t.code] || t.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Template (optional)</label>
            <select
              value={contractForm.template_id}
              disabled={!contractForm.type_id}
              onChange={(e) => setContractForm(p => ({ ...p, template_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">No template — write content manually</option>
              {(templates as any[]).filter((t) => t.type_id === contractForm.type_id).map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.current_version ? ` (v${t.current_version.version})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Contract Title *</label>
            <input value={contractForm.title} onChange={(e) => setContractForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Employment Contract 2026" className={inputClass} />
          </div>
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
          {!contractForm.template_id && (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Contract Content *</label>
              <textarea rows={6} value={contractForm.content} onChange={(e) => setContractForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Full contract text... {{employee_name}}, {{start_date}}, {{salary}} placeholders supported"
                className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none resize-none" />
            </div>
          )}
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
            <label className={labelClass}>Type *</label>
            <select value={templateForm.type_id} onChange={(e) => setTemplateForm(p => ({ ...p, type_id: e.target.value }))} className={inputClass}>
              <option value="">Select type</option>
              {contractTypes.map((t) => <option key={t.id} value={t.id}>{TYPE_LABELS[t.code] || t.name}</option>)}
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
