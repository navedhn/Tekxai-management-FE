import React, { useState } from 'react';
import { FileStack, Plus, X, History } from 'lucide-react';
import {
  useGetDocumentCategories, useGetDocumentTypes, useGetTemplates,
  useCreateTemplate, useUpdateTemplate, useGetTemplateVersions,
  useGetPlaceholderRegistry, type DocumentTemplate,
} from '@/services/hrDocumentsService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';
const labelCls = 'text-xs font-semibold text-gray-500 block mb-1.5';

function TemplateModal({ template, onClose }: { template?: DocumentTemplate; onClose: () => void }) {
  const toast = useToastContext();
  const { data: categories } = useGetDocumentCategories();
  const isEdit = !!template?.id;
  const [categoryId, setCategoryId] = useState(template?.category_id || '');
  const { data: types } = useGetDocumentTypes(categoryId || undefined);
  const [typeId, setTypeId] = useState(template?.type_id || '');
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.current_version?.content || '');
  const { data: registry } = useGetPlaceholderRegistry();
  const { data: versions } = useGetTemplateVersions(template?.id);
  const [showVersions, setShowVersions] = useState(false);
  const [err, setErr] = useState('');

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSave = () => {
    setErr('');
    if (!categoryId || !typeId || !name.trim() || !content.trim()) {
      setErr('Category, type, name, and content are all required.');
      return;
    }
    const payload = isEdit
      ? { id: template!.id, name, content }
      : { category_id: categoryId, type_id: typeId, name, content };
    mutation.mutate(payload as any, {
      onSuccess: () => { toast.success(isEdit ? 'New version saved' : 'Template created'); onClose(); },
      onError: (e: any) => setErr(e?.message || 'Failed to save'),
    });
  };

  const insertToken = (token: string) => setContent((c) => `${c}{{${token}}}`);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">{isEdit ? 'Edit Template' : 'New Template'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Category <span className="text-red-500">*</span></label>
                <select className={inputCls} value={categoryId} disabled={isEdit} onChange={(e) => { setCategoryId(e.target.value); setTypeId(''); }}>
                  <option value="">Select category</option>
                  {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Document Type <span className="text-red-500">*</span></label>
                <select className={inputCls} value={typeId} disabled={isEdit || !categoryId} onChange={(e) => setTypeId(e.target.value)}>
                  <option value="">Select type</option>
                  {(types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Template Name <span className="text-red-500">*</span></label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Employment Contract" />
            </div>
            <div>
              <label className={labelCls}>
                Content <span className="text-red-500">*</span>
                {isEdit && <span className="ml-2 text-gray-400 font-normal normal-case">Saving creates a new version — the current one is preserved.</span>}
              </label>
              <textarea
                className={cn(inputCls, 'h-72 py-2 font-mono text-xs leading-relaxed resize-none')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dear {{employee_name}}, you are appointed as {{designation}}..."
              />
            </div>
            {isEdit && (
              <button onClick={() => setShowVersions((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700">
                <History size={13} /> {showVersions ? 'Hide' : 'Show'} version history ({versions?.length ?? 0})
              </button>
            )}
            {showVersions && (
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-40 overflow-y-auto">
                {(versions || []).map((v) => (
                  <div key={v.id} className="px-3 py-2 text-xs flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Version {v.version}</span>
                    <span className="text-gray-400">{new Date(v.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Available Placeholders — click to insert</p>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {Object.entries(
                (registry?.placeholders || []).reduce((acc: Record<string, typeof registry.placeholders>, p) => {
                  (acc[p.group] = acc[p.group] || []).push(p);
                  return acc;
                }, {} as any)
              ).map(([group, items]: any) => (
                <div key={group}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((p: any) => (
                      <button
                        key={p.token}
                        type="button"
                        onClick={() => insertToken(p.token)}
                        title={p.label}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-mono text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition-colors"
                      >
                        {`{{${p.token}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {err && <p className="text-red-500 text-xs mt-4">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={mutation.isPending} className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save New Version' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HrDocumentTemplatesPage() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modal, setModal] = useState<any>(null);
  const { data: categories } = useGetDocumentCategories();
  const { data: templates, isLoading } = useGetTemplates(categoryFilter || undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Document Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">Reusable templates with placeholders — versioned, never overwritten.</p>
        </div>
        <button onClick={() => setModal({})} className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />New Template
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="mb-4 max-w-xs">
          <select className={inputCls} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Template', 'Category', 'Type', 'Version', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : (templates || []).length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No templates yet — create one to start generating documents.</td></tr>
              ) : (templates || []).map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <FileStack size={14} className="text-indigo-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{t.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-700">{t.category?.name || '—'}</td>
                  <td className="py-3 px-2 text-gray-700">{t.type?.name || '—'}</td>
                  <td className="py-3 px-2 text-gray-500">v{t.current_version?.version ?? '—'}</td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <button onClick={() => setModal(t)} className="px-3 h-7 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && <TemplateModal template={modal?.id ? modal : undefined} onClose={() => setModal(null)} />}
    </div>
  );
}
