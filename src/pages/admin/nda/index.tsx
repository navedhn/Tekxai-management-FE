import React, { useMemo, useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileText, Upload, Users, Eye, Send, Trash2, Type, Calendar, PenLine, IdCard, Paperclip, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetDocumentCategories, useGetDocumentTypes, useCreateTemplate, useGetTemplates } from '@/services/hrDocumentsService';
import { useFetchUsersQuery } from '@/services/userService';
import {
  useUploadTemplatePdf, useSaveFields, useGetFields, usePublishNda,
  NdaField, NdaFieldInput, NdaFieldType,
} from '@/services/ndaService';
import NdaPdfPages, { PdfPageInfo } from '@/components/nda/NdaPdfPages';

const FIELD_META: Record<NdaFieldType, { label: string; icon: React.ElementType; defaultW: number; defaultH: number }> = {
  NAME:         { label: 'Name',      icon: Type,      defaultW: 160, defaultH: 22 },
  DATE:         { label: 'Date',      icon: Calendar,  defaultW: 110, defaultH: 22 },
  SIGNATURE:    { label: 'Signature', icon: PenLine,   defaultW: 180, defaultH: 40 },
  CNIC:         { label: 'CNIC',      icon: IdCard,    defaultW: 150, defaultH: 22 },
  FILE_UPLOAD:  { label: 'File Upload', icon: Paperclip, defaultW: 160, defaultH: 28 },
};

type DraftField = NdaFieldInput & { _key: string };

function newKey() { return Math.random().toString(36).slice(2); }

export default function NdaBuilderPage() {
  const toast = useToastContext();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 — template + upload
  const { data: categories } = useGetDocumentCategories();
  const { data: types } = useGetDocumentTypes();
  const { data: templates, refetch: refetchTemplates } = useGetTemplates();
  const createTemplate = useCreateTemplate();
  const uploadPdf = useUploadTemplatePdf();

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ndaType = useMemo(() => (types || []).find((t) => t.code === 'NDA'), [types]);

  async function handleCreateAndUpload(file: File) {
    try {
      if (!title.trim()) return toast.error('Give the NDA a name/title first');
      if (!categoryId || !typeId) return toast.error('Select a category and document type');
      const template = await createTemplate.mutateAsync({
        // A minimal non-empty placeholder — required by the generic
        // template validator (shared with the plain-text template flow).
        // upload_template_pdf() immediately forks a real UPLOADED_PDF
        // version right after this and repoints current_version_id to it,
        // so this v1 stub is never actually shown/used.
        category_id: categoryId, type_id: typeId, name: title, content: `${title} (native NDA — see uploaded PDF)`,
      } as any) as any;
      const created = template?.payload || template;
      setTemplateId(created.id);
      const version = await uploadPdf.mutateAsync({ templateId: created.id, file });
      setVersionId(version.id);
      setPageCount(version.page_count);
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      toast.success(`Uploaded — ${version.page_count} page(s)`);
      setStep(2);
      refetchTemplates();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create NDA / upload PDF');
    }
  }

  // Step 2 — fields
  const [fields, setFields] = useState<DraftField[]>([]);
  const [armedType, setArmedType] = useState<NdaFieldType | null>(null);
  const saveFieldsMutation = useSaveFields();
  const { data: existingFields } = useGetFields(versionId || undefined);

  React.useEffect(() => {
    if (existingFields && existingFields.length && fields.length === 0) {
      setFields(existingFields.map((f) => ({ ...f, _key: f.id })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingFields]);

  function addField(page: PdfPageInfo, xPt: number, yPt: number) {
    if (!armedType) return;
    const meta = FIELD_META[armedType];
    setFields((prev) => [...prev, {
      _key: newKey(), field_type: armedType, label: meta.label, signer_role: 'EMPLOYEE',
      page_number: page.pageNumber, x: Math.max(0, xPt - meta.defaultW / 2), y: Math.max(0, yPt - meta.defaultH / 2),
      width: meta.defaultW, height: meta.defaultH, required: true,
    }]);
    setArmedType(null);
  }

  function updateField(key: string, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f) => (f._key === key ? { ...f, ...patch } : f)));
  }
  function removeField(key: string) {
    setFields((prev) => prev.filter((f) => f._key !== key));
  }

  async function saveFields() {
    if (!versionId) return;
    try {
      const payload = fields.map(({ _key, ...rest }) => rest);
      const saved = await saveFieldsMutation.mutateAsync({ versionId, fields: payload });
      setFields(saved.map((f) => ({ ...f, _key: f.id })));
      toast.success('Field placement saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save fields');
    }
  }

  // Step 3 — employees
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: usersResp } = useFetchUsersQuery({ limit: 1000 });
  const allUsers: any[] = (usersResp as any)?.records || (usersResp as any) || [];
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u: any) =>
      `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q));
  }, [allUsers, search]);

  // Step 4 — preview + publish
  const publish = usePublishNda();
  const [publishResult, setPublishResult] = useState<{ assigned: any[]; failed: any[] } | null>(null);

  async function handlePublish() {
    if (!templateId) return;
    if (selected.size === 0) return toast.error('Select at least one employee');
    if (fields.length === 0) return toast.error('Add at least one field before publishing');
    try {
      const result = await publish.mutateAsync({
        templateId, user_ids: Array.from(selected), category_id: categoryId, type_id: typeId, title,
      });
      setPublishResult(result);
      if (result.assigned.length) toast.success(`Published to ${result.assigned.length} employee(s)`);
      if (result.failed.length) toast.error(`${result.failed.length} assignment(s) failed`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to publish');
    }
  }

  const requiredFieldTypesPresent = new Set(fields.map((f) => f.field_type));
  const hasSignature = requiredFieldTypesPresent.has('SIGNATURE');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">Employee NDA Builder</h1>
      </div>

      <div className="flex items-center gap-2 mb-6 text-sm font-medium">
        {(['1. Upload', '2. Fields', '3. Employees', '4. Preview & Publish'] as const).map((label, i) => (
          <React.Fragment key={label}>
            <button
              onClick={() => (i + 1 <= step || versionId) && setStep((i + 1) as any)}
              className={cn('px-3 py-1.5 rounded-full border', step === i + 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200')}
            >{label}</button>
            {i < 3 && <div className="w-6 h-px bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">NDA Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Standard Employee NDA 2026"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select…</option>
                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Document Type</label>
              <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select…</option>
                {(types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {ndaType && !typeId && (
                <button className="text-xs text-indigo-600 mt-1" onClick={() => setTypeId(ndaType.id)}>Use existing "NDA" type</button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Upload NDA Document (PDF)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300"
            >
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Click to upload a PDF NDA document</p>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCreateAndUpload(f); }} />
            </div>
            {(createTemplate.isPending || uploadPdf.isPending) && <p className="text-xs text-gray-400 mt-2">Uploading…</p>}
          </div>
        </Card>
      )}

      {step === 2 && versionId && fileUrl && (
        <div className="grid grid-cols-[220px_1fr] gap-4">
          <Card className="p-4 space-y-2 h-fit sticky top-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Field</p>
            {(Object.keys(FIELD_META) as NdaFieldType[]).map((ft) => {
              const meta = FIELD_META[ft];
              const Icon = meta.icon;
              return (
                <button key={ft} onClick={() => setArmedType(ft)}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border', armedType === ft ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 hover:border-indigo-300')}>
                  <Icon className="w-4 h-4" /> {meta.label}
                </button>
              );
            })}
            {armedType && <p className="text-xs text-indigo-600 mt-2">Click on the document to place a {FIELD_META[armedType].label} field.</p>}
            <div className="pt-3 border-t border-gray-100 mt-3">
              <p className="text-xs text-gray-400 mb-2">{fields.length} field(s) placed</p>
              {!hasSignature && <p className="text-xs text-amber-600 mb-2">A Signature field is required before publishing.</p>}
              <Button onClick={saveFields} disabled={saveFieldsMutation.isPending} className="w-full">Save Placement</Button>
              <Button variant="outline" onClick={() => setStep(3)} disabled={!hasSignature} className="w-full mt-2">Next: Select Employees</Button>
            </div>
          </Card>
          <Card className="p-4 overflow-auto max-h-[75vh]">
            <NdaPdfPages
              fileUrl={fileUrl}
              renderPageOverlay={(page, ppp) => (
                <div
                  className="absolute inset-0"
                  style={{ cursor: armedType ? 'crosshair' : 'default' }}
                  onClick={(e) => {
                    if (!armedType) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const xPt = (e.clientX - rect.left) / ppp;
                    const yPt = (e.clientY - rect.top) / ppp;
                    addField(page, xPt, yPt);
                  }}
                >
                  {fields.filter((f) => f.page_number === page.pageNumber).map((f) => (
                    <FieldBox key={f._key} field={f} pixelsPerPoint={ppp} onChange={(p) => updateField(f._key, p)} onDelete={() => removeField(f._key)} />
                  ))}
                </div>
              )}
            />
          </Card>
        </div>
      )}

      {step === 3 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4" /> Select Employees</h2>
            <span className="text-sm text-gray-500">{selected.size} selected</span>
          </div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-300 absolute left-3 top-2.5" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…"
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>
          <div className="max-h-96 overflow-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
            {filteredUsers.map((u: any) => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.has(u.id)} onChange={(e) => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(u.id); else next.delete(u.id);
                    return next;
                  });
                }} />
                <span className="font-medium text-gray-800">{u.first_name} {u.last_name}</span>
                <span className="text-gray-400">{u.email}</span>
              </label>
            ))}
            {filteredUsers.length === 0 && <p className="text-sm text-gray-400 p-4 text-center">No employees found</p>}
          </div>
          <div className="flex items-center justify-between mt-4">
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear selection
            </button>
            <Button onClick={() => setStep(4)} disabled={selected.size === 0}>Next: Preview</Button>
          </div>
        </Card>
      )}

      {step === 4 && versionId && fileUrl && (
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Eye className="w-4 h-4" /> Preview — exactly as the employee will see it</h2>
            <div className="max-h-[60vh] overflow-auto border border-gray-100 rounded-lg p-3">
              <NdaPdfPages
                fileUrl={fileUrl}
                renderPageOverlay={(page, ppp) => (
                  <>
                    {fields.filter((f) => f.page_number === page.pageNumber).map((f) => (
                      <div key={f._key} className="absolute border-2 border-indigo-400 bg-indigo-50/60 rounded text-[10px] flex items-center justify-center text-indigo-700 font-medium"
                        style={{ left: f.x * ppp, top: f.y * ppp, width: f.width * ppp, height: f.height * ppp }}>
                        {f.label}{f.required ? ' *' : ''}
                      </div>
                    ))}
                  </>
                )}
              />
            </div>
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>{fields.length} field(s) · {selected.size} employee(s) selected</p>
              {!hasSignature && <p className="text-amber-600">Missing a required Signature field — cannot publish.</p>}
            </div>
            <Button onClick={handlePublish} disabled={publish.isPending || !hasSignature} className="flex items-center gap-2">
              <Send className="w-4 h-4" /> Publish NDA
            </Button>
          </Card>
          {publishResult && (
            <Card className="p-4 text-sm">
              <p className="text-green-600 font-medium">{publishResult.assigned.length} employee(s) assigned successfully.</p>
              {publishResult.failed.length > 0 && (
                <div className="text-red-500 mt-2">
                  {publishResult.failed.map((f) => <p key={f.user_id}>{f.user_id}: {f.message}</p>)}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function FieldBox({ field, pixelsPerPoint, onChange, onDelete }: {
  field: DraftField; pixelsPerPoint: number;
  onChange: (patch: Partial<DraftField>) => void; onDelete: () => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  function onDragStart(e: React.MouseEvent) {
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: field.x, origY: field.y };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / pixelsPerPoint;
      const dy = (ev.clientY - dragRef.current.startY) / pixelsPerPoint;
      onChange({ x: Math.max(0, dragRef.current.origX + dx), y: Math.max(0, dragRef.current.origY + dy) });
    };
    const up = () => { dragRef.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function onResizeStart(e: React.MouseEvent) {
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: field.width, origH: field.height };
    const move = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dw = (ev.clientX - resizeRef.current.startX) / pixelsPerPoint;
      const dh = (ev.clientY - resizeRef.current.startY) / pixelsPerPoint;
      onChange({ width: Math.max(30, resizeRef.current.origW + dw), height: Math.max(16, resizeRef.current.origH + dh) });
    };
    const up = () => { resizeRef.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  return (
    <div
      className="absolute border-2 border-indigo-500 bg-indigo-50/70 rounded group"
      style={{ left: field.x * pixelsPerPoint, top: field.y * pixelsPerPoint, width: field.width * pixelsPerPoint, height: field.height * pixelsPerPoint }}
      onMouseDown={onDragStart}
    >
      <div className="absolute -top-6 left-0 flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-sm opacity-0 group-hover:opacity-100 z-10" onMouseDown={(e) => e.stopPropagation()}>
        <input value={field.label} onChange={(e) => onChange({ label: e.target.value })} className="text-[10px] w-20 outline-none" />
        <label className="text-[9px] flex items-center gap-0.5 text-gray-500">
          <input type="checkbox" checked={field.required !== false} onChange={(e) => onChange({ required: e.target.checked })} /> req
        </label>
        <button onClick={onDelete} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
      </div>
      <span className="text-[10px] text-indigo-700 font-medium px-1 truncate block select-none">{field.label}{field.required !== false ? ' *' : ''}</span>
      <div onMouseDown={onResizeStart} className="absolute bottom-0 right-0 w-3 h-3 bg-indigo-500 rounded-tl cursor-nwse-resize" />
    </div>
  );
}
