import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, X, Search, Eye, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFetchUsersQuery } from '@/services/userService';
import {
  useGetDocumentCategories, useGetDocumentTypes, useGetTemplates,
  useGetDocuments, useGenerateDocument, usePreviewRender,
  type DocumentStatus,
} from '@/services/hrDocumentsService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';
const labelCls = 'text-xs font-semibold text-gray-500 block mb-1.5';

const STATUS_STYLE: Record<DocumentStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  GENERATED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-amber-100 text-amber-700',
  VIEWED: 'bg-purple-100 text-purple-700',
  SIGNED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
  EXPIRED: 'bg-orange-100 text-orange-700',
  ARCHIVED: 'bg-gray-100 text-gray-400',
};

// New Document: Employee -> Category -> Type -> Template -> Preview -> Generate
function NewDocumentModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: (id: string) => void }) {
  const toast = useToastContext();
  const [userId, setUserId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<{ rendered: string; unresolved: string[] } | null>(null);
  const [err, setErr] = useState('');

  const { data: users } = useFetchUsersQuery({ search: '' });
  const { data: categories } = useGetDocumentCategories();
  const { data: types } = useGetDocumentTypes(categoryId || undefined);
  const { data: templates } = useGetTemplates(categoryId || undefined, typeId || undefined);
  const selectedTemplate = useMemo(() => (templates || []).find((t) => t.id === templateId), [templates, templateId]);

  const previewMutation = usePreviewRender();
  const generateMutation = useGenerateDocument();

  useEffect(() => { setTypeId(''); setTemplateId(''); }, [categoryId]);
  useEffect(() => { setTemplateId(''); }, [typeId]);
  useEffect(() => { setPreview(null); }, [userId, templateId, rawContent]);

  const contentSource = selectedTemplate?.current_version?.content ?? rawContent;

  const handlePreview = () => {
    setErr('');
    if (!userId) { setErr('Select an employee first to preview placeholder substitution.'); return; }
    if (!contentSource.trim()) { setErr('Select a template or write content to preview.'); return; }
    previewMutation.mutate({ content: contentSource, user_id: userId }, {
      onSuccess: (data) => setPreview(data),
      onError: (e: any) => setErr(e?.message || 'Preview failed'),
    });
  };

  const handleGenerate = () => {
    setErr('');
    if (!userId || !categoryId || !typeId) { setErr('Employee, category, and document type are required.'); return; }
    if (!templateId && !rawContent.trim()) { setErr('Select a template or write content.'); return; }
    generateMutation.mutate(
      {
        user_id: userId, category_id: categoryId, type_id: typeId,
        template_id: templateId || undefined,
        raw_content: templateId ? undefined : rawContent,
        title: title.trim() || undefined,
      },
      {
        onSuccess: (res: any) => {
          toast.success('Document generated');
          onGenerated(res?.payload?.id);
          onClose();
        },
        onError: (e: any) => setErr(e?.message || 'Failed to generate document'),
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">New Document</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Employee <span className="text-red-500">*</span></label>
            <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select employee</option>
              {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category <span className="text-red-500">*</span></label>
              <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select category</option>
                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Document Type <span className="text-red-500">*</span></label>
              <select className={inputCls} value={typeId} disabled={!categoryId} onChange={(e) => setTypeId(e.target.value)}>
                <option value="">Select type</option>
                {(types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Template</label>
            <select className={inputCls} value={templateId} disabled={!typeId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">No template — write content manually</option>
              {(templates || []).map((t) => <option key={t.id} value={t.id}>{t.name} (v{t.current_version?.version})</option>)}
            </select>
          </div>

          {!templateId && (
            <div>
              <label className={labelCls}>Content (manual, placeholders still work)</label>
              <textarea
                className={cn(inputCls, 'h-40 py-2 font-mono text-xs resize-none')}
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="Dear {{employee_name}}, ..."
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Title (optional — defaults to type name)</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. John Doe — Offer Letter" />
          </div>

          <div className="flex items-center justify-between">
            <button onClick={handlePreview} disabled={previewMutation.isPending} className="flex items-center gap-2 px-4 h-9 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <Eye size={14} />{previewMutation.isPending ? 'Rendering…' : 'Preview'}
            </button>
          </div>

          {preview && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Preview</p>
              <div className="whitespace-pre-wrap text-sm text-gray-700 max-h-64 overflow-y-auto">{preview.rendered}</div>
              {preview.unresolved.length > 0 && (
                <p className="text-xs text-amber-600 font-semibold mt-3">
                  ⚠ Unresolved placeholders (left as-is, unknown tokens): {preview.unresolved.map((t) => `{{${t}}}`).join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {err && <p className="text-red-500 text-xs mt-4">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleGenerate} disabled={generateMutation.isPending} className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {generateMutation.isPending ? 'Generating…' : 'Generate Document'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HrDocumentsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const { data, isLoading } = useGetDocuments({ status: statusFilter || undefined });

  const documents = (data?.records || []).filter((d) =>
    !q || d.title.toLowerCase().includes(q.toLowerCase()) ||
    `${d.user?.first_name || ''} ${d.user?.last_name || ''}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">HR Documents</h1>
          <p className="text-sm text-gray-400 mt-0.5">Generate, send, and track employee documents from versioned templates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/hr/document-templates')} className="flex items-center gap-2 px-4 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Manage Templates
          </button>
          <button onClick={() => setShowNewModal(true)} className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
            <Plus size={16} />New Document
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              placeholder="Search by title or employee…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={cn(inputCls, 'w-auto min-w-[160px]')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.keys(STATUS_STYLE).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Document', 'Employee', 'Category', 'Type', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : documents.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">No documents yet.</td></tr>
              ) : documents.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                        <FileText size={14} className="text-primary-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{d.title}</span>
                      {d.previous_document_id && <RotateCw size={12} className="text-gray-400" titleAccess="Renewal" />}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-700">{d.user ? `${d.user.first_name} ${d.user.last_name}` : '—'}</td>
                  <td className="py-3 px-2 text-gray-700">{d.category?.name || '—'}</td>
                  <td className="py-3 px-2 text-gray-700">{d.type?.name || '—'}</td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[d.status])}>{d.status}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-2">
                    <button onClick={() => navigate(`/hr/documents/${d.id}`)} className="px-3 h-7 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewModal && (
        <NewDocumentModal
          onClose={() => setShowNewModal(false)}
          onGenerated={(id) => id && navigate(`/hr/documents/${id}`)}
        />
      )}
    </div>
  );
}
