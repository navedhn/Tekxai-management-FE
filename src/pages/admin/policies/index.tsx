import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Plus, Send, Upload, FileText as FileIcon, X as XIcon, Download, Pencil, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetPolicies, useCreatePolicy, useUpdatePolicy, usePublishPolicy, useGetPolicyFile } from '@/services/policyService';
import { useMyPermissions } from '@/services/permissionsService';

const EMPTY_FORM = { title: '', category: 'GENERAL', content: '', version: '1.0', is_mandatory: true };

const PoliciesPage: React.FC = () => {
  const toast = useToastContext();
  const { data: myPerms } = useMyPermissions();
  const isSuperAdmin = !!myPerms?.is_super_admin;
  const has = (perm: string) => isSuperAdmin || !!myPerms?.permissions?.includes(perm);
  // Each granular permission, OR'd with the broad 'manage' alias — matches
  // the backend's can_any(<granular>, 'hr.policies.manage') gates exactly,
  // so a user never sees an action their request would just 403 on.
  const canCreate = has('hr.policies.create') || has('hr.policies.manage');
  const canEdit = has('hr.policies.edit') || has('hr.policies.manage');
  const canPublish = has('hr.policies.publish') || has('hr.policies.manage');

  const { data: policies = [], isLoading } = useGetPolicies();
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const publishPolicy = usePublishPolicy();
  const getPolicyFile = useGetPolicyFile();
  const [showModal, setShowModal] = useState(false);
  // 'create' | 'edit' | 'view' — 'view' is read-only (Content card row's
  // View action) and never submits, distinct from 'edit' even when the
  // viewer also happens to have edit permission, so a plain "look at this
  // policy" click can never accidentally save/duplicate anything.
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM); setFile(null); setMode('create'); };

  const openCreate = () => { setMode('create'); setEditingId(null); setForm(EMPTY_FORM); setFile(null); setShowModal(true); };
  const openEdit = (p: any) => {
    setMode('edit');
    setEditingId(p.id);
    setForm({ title: p.title, category: p.category, content: p.content || '', version: p.version, is_mandatory: p.is_mandatory });
    setFile(null);
    setShowModal(true);
  };
  const openView = (p: any) => {
    setMode('view');
    setEditingId(p.id);
    setForm({ title: p.title, category: p.category, content: p.content || '', version: p.version, is_mandatory: p.is_mandatory });
    setFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;
    if (!form.title) { toast.error('Title is required'); return; }
    if (mode === 'create' && !form.content && !file) { toast.error('Provide policy content or upload a document'); return; }
    try {
      if (mode === 'edit' && editingId) {
        await updatePolicy.mutateAsync({ id: editingId, data: form });
        toast.success('Policy updated');
      } else {
        await createPolicy.mutateAsync({ ...form, file });
        toast.success('Policy created');
      }
      closeModal();
    } catch { toast.error('Failed'); }
  };

  const handleViewFile = async (id: string) => {
    try {
      const { url } = await getPolicyFile.mutateAsync(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch { toast.error('Failed to open document'); }
  };

  const columns: Column<any>[] = [
    { header: 'Policy', key: 'title', render: (p) => <span className="font-black">{p.title}</span> },
    { header: 'Category', key: 'category', render: (p) => <span className="text-gray-600">{p.category}</span> },
    { header: 'Version', key: 'version', render: (p) => <span className="font-mono text-xs">{p.version}</span> },
    { header: 'Mandatory', key: 'is_mandatory', render: (p) => p.is_mandatory ? <span className="text-red-500 font-bold text-xs">Yes</span> : <span className="text-gray-300 text-xs">No</span> },
    { header: 'Document', key: 'file_key', render: (p) => p.file_key ? (
      <button type="button" onClick={() => handleViewFile(p.id)} className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-bold">
        <Download size={12} /> {p.file_name || 'View'}
      </button>
    ) : <span className="text-gray-300 text-xs">—</span> },
    { header: 'Status', key: 'is_published', render: (p) => (
      <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5',
        p.is_published ? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100')}>
        {p.is_published ? 'Published' : 'Draft'}
      </Badge>
    )},
    { header: 'Actions', key: 'id', align: 'right', render: (p) => (
      <div className="flex items-center justify-end gap-1.5">
        {p.content && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => openView(p)}>
            <Eye size={12} /> View
          </Button>
        )}
        {canEdit && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => openEdit(p)}>
            <Pencil size={12} /> Edit
          </Button>
        )}
        {!p.is_published && canPublish && (
          <Button size="sm" variant="primary" className="rounded-xl gap-1 h-8 text-xs"
            onClick={() => publishPolicy.mutate(p.id, { onSuccess: () => toast.success('Policy published') })}>
            <Send size={12} /> Publish
          </Button>
        )}
      </div>
    ) },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Company Policies</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage HR policies, attendance policies and compliance documents.</p>
        </div>
        {canCreate && (
          <Button variant="primary" className="rounded-xl gap-2 h-10 px-5 font-black" onClick={openCreate}>
            <Plus size={16} /> New Policy
          </Button>
        )}
      </div>

      <Card className="border-none shadow-sm">
        <Table columns={columns} data={policies as any[]} isLoading={isLoading} emptyMessage="No policies yet." />
      </Card>

      <Modal isOpen={showModal} onClose={closeModal} title={mode === 'edit' ? 'Edit Policy' : mode === 'view' ? 'View Policy' : 'Create Policy'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {[{ label: 'Title *', key: 'title', ph: 'e.g. Leave Policy 2026' }, { label: 'Version', key: 'version', ph: '1.0' }].map(({ label, key, ph }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{label}</label>
              <input value={(form as any)[key]} onChange={(e) => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                disabled={mode === 'view'}
                className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none disabled:bg-gray-50 disabled:text-gray-400" />
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Category</label>
            <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
              disabled={mode === 'view'}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none disabled:bg-gray-50 disabled:text-gray-400">
              {['GENERAL','LEAVE','ATTENDANCE','EQUIPMENT','REMOTE_WORK','CODE_OF_CONDUCT'].map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Content{!file ? ' *' : ''}</label>
            <textarea rows={6} value={form.content} onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Policy content..."
              disabled={mode === 'view'}
              className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none resize-none disabled:bg-gray-50 disabled:text-gray-400" />
          </div>
          {mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Upload Document{!form.content ? ' *' : ' (optional)'}</label>
              {file ? (
                <div className="flex items-center justify-between h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium">
                  <span className="flex items-center gap-2 truncate"><FileIcon size={14} className="text-primary-600 shrink-0" /> {file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><XIcon size={14} /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 h-11 px-4 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500 cursor-pointer hover:border-primary-300 hover:text-primary-600">
                  <Upload size={14} />
                  Choose a PDF/DOCX file (max 5MB)
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
                      setFile(f);
                    }}
                  />
                </label>
              )}
              <p className="text-xs text-gray-400">Provide typed content, an uploaded document, or both.</p>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_mandatory} onChange={(e) => setForm(p => ({ ...p, is_mandatory: e.target.checked }))}
              disabled={mode === 'view'}
              className="w-4 h-4 rounded accent-primary-600" />
            <span className="text-sm font-bold text-gray-700">Mandatory acknowledgement required</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={closeModal}>{mode === 'view' ? 'Close' : 'Cancel'}</Button>
            {mode !== 'view' && (
              <Button type="submit" variant="primary" fullWidth loading={createPolicy.isPending || updatePolicy.isPending}>
                {mode === 'edit' ? 'Save Changes' : 'Create Policy'}
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PoliciesPage;
