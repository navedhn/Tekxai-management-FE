import React, { useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileText, Upload, Send, Trash2, Type, Calendar, PenLine, IdCard, Paperclip, AlignLeft, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useFetchUsersQuery } from '@/services/userService';
import {
  useGetClientAccounts, useGetProjectsForClient, useCreateClientNda, useUploadClientNdaPdf,
  useSaveClientNdaFields, useGetClientNdaFields, useSendClientNda,
  ClientNdaFieldType, ClientNdaParty, ClientNdaFieldInput,
} from '@/services/clientNdaService';
import NdaPdfPages, { PdfPageInfo } from '@/components/nda/NdaPdfPages';

const FIELD_META: Record<ClientNdaFieldType, { label: string; icon: React.ElementType; defaultW: number; defaultH: number }> = {
  NAME:        { label: 'Name',      icon: Type,      defaultW: 160, defaultH: 22 },
  DATE:        { label: 'Date',      icon: Calendar,  defaultW: 110, defaultH: 22 },
  SIGNATURE:   { label: 'Signature', icon: PenLine,   defaultW: 180, defaultH: 40 },
  CNIC:        { label: 'CNIC',      icon: IdCard,    defaultW: 150, defaultH: 22 },
  FILE_UPLOAD: { label: 'File Upload', icon: Paperclip, defaultW: 160, defaultH: 28 },
  TEXT:        { label: 'Text',      icon: AlignLeft, defaultW: 160, defaultH: 22 },
};

type DraftField = ClientNdaFieldInput & { _key: string };
function newKey() { return Math.random().toString(36).slice(2); }

export default function ClientNdaBuilderPage() {
  const toast = useToastContext();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const { data: clients } = useGetClientAccounts();
  const [clientId, setClientId] = useState('');
  const { data: projects } = useGetProjectsForClient(clientId || undefined);
  const [projectId, setProjectId] = useState('');
  const { data: usersResp } = useFetchUsersQuery({ limit: 1000 });
  const allUsers: any[] = (usersResp as any)?.records || (usersResp as any) || [];
  const [tekxaiSignerId, setTekxaiSignerId] = useState('');
  const [title, setTitle] = useState('');
  const [clientSignerName, setClientSignerName] = useState('');
  const [clientSignerEmail, setClientSignerEmail] = useState('');

  const createNda = useCreateClientNda();
  const uploadPdf = useUploadClientNdaPdf();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCreateAndUpload(file: File) {
    try {
      if (!title.trim()) return toast.error('Give the NDA a title');
      if (!clientId) return toast.error('Select a client');
      if (!tekxaiSignerId) return toast.error('Select the TekXAI signer');
      const doc = await createNda.mutateAsync({
        title, client_account_id: clientId, project_id: projectId || undefined,
        tekxai_signer_user_id: tekxaiSignerId,
        client_signer_name: clientSignerName || undefined, client_signer_email: clientSignerEmail || undefined,
      });
      setDocumentId(doc.id);
      const uploaded = await uploadPdf.mutateAsync({ documentId: doc.id, file });
      setFileUrl(URL.createObjectURL(file));
      toast.success(`Uploaded — ${uploaded.page_count} page(s)`);
      setStep(2);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create NDA / upload PDF');
    }
  }

  // Step 2 — fields
  const [fields, setFields] = useState<DraftField[]>([]);
  const [armedType, setArmedType] = useState<ClientNdaFieldType | null>(null);
  const [armedParty, setArmedParty] = useState<ClientNdaParty>('CLIENT');
  const saveFieldsMutation = useSaveClientNdaFields();
  const { data: existingFields } = useGetClientNdaFields(documentId || undefined);

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
      _key: newKey(), field_type: armedType, label: `${armedParty === 'CLIENT' ? 'Client' : 'TekXAI'} ${meta.label}`,
      party: armedParty, page_number: page.pageNumber,
      x: Math.max(0, xPt - meta.defaultW / 2), y: Math.max(0, yPt - meta.defaultH / 2),
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
    if (!documentId) return;
    try {
      const payload = fields.map(({ _key, ...rest }) => rest);
      const saved = await saveFieldsMutation.mutateAsync({ documentId, fields: payload });
      setFields(saved.map((f) => ({ ...f, _key: f.id })));
      toast.success('Field placement saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save fields');
    }
  }

  // Step 3 — preview + send
  const send = useSendClientNda();
  const [sent, setSent] = useState<any>(null);

  async function handleSend() {
    if (!documentId) return;
    try {
      const result = await send.mutateAsync(documentId);
      setSent(result);
      toast.success('NDA sent to client');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send');
    }
  }

  const clientFields = fields.filter((f) => f.party === 'CLIENT');
  const tekxaiFields = fields.filter((f) => f.party === 'TEKXAI');
  const hasClientSig = clientFields.some((f) => f.field_type === 'SIGNATURE');
  const hasTekxaiSig = tekxaiFields.some((f) => f.field_type === 'SIGNATURE');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">Client NDA Builder</h1>
      </div>

      <div className="flex items-center gap-2 mb-6 text-sm font-medium">
        {(['1. Setup & Upload', '2. Fields', '3. Preview & Send'] as const).map((label, i) => (
          <React.Fragment key={label}>
            <button
              onClick={() => (i + 1 <= step || documentId) && setStep((i + 1) as any)}
              className={cn('px-3 py-1.5 rounded-full border', step === i + 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200')}
            >{label}</button>
            {i < 2 && <div className="w-6 h-px bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">NDA Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mutual NDA — Acme Corp"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Client</label>
              <select value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(''); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select client…</option>
                {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Project (optional)</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!clientId} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50">
                <option value="">None</option>
                {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Client Signer Name</label>
              <input value={clientSignerName} onChange={(e) => setClientSignerName(e.target.value)} placeholder="Pre-filled from client account if left blank"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Client Signer Email</label>
              <input value={clientSignerEmail} onChange={(e) => setClientSignerEmail(e.target.value)} placeholder="Pre-filled from client account if left blank"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">TekXAI Signer</label>
            <select value={tekxaiSignerId} onChange={(e) => setTekxaiSignerId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Select the authorized TekXAI signer…</option>
              {allUsers.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.designation || u.email}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Upload NDA Document (PDF)</label>
            <div onClick={() => fileInputRef.current?.click()} className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300">
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Click to upload a PDF NDA document</p>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCreateAndUpload(f); }} />
            </div>
            {(createNda.isPending || uploadPdf.isPending) && <p className="text-xs text-gray-400 mt-2">Uploading…</p>}
          </div>
        </Card>
      )}

      {step === 2 && documentId && fileUrl && (
        <div className="grid grid-cols-[240px_1fr] gap-4">
          <Card className="p-4 space-y-2 h-fit sticky top-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Party</p>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3">
              <button onClick={() => setArmedParty('CLIENT')} className={cn('flex-1 py-1.5 rounded-md text-xs font-semibold', armedParty === 'CLIENT' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500')}>Client</button>
              <button onClick={() => setArmedParty('TEKXAI')} className={cn('flex-1 py-1.5 rounded-md text-xs font-semibold', armedParty === 'TEKXAI' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500')}>TekXAI</button>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Field</p>
            {(Object.keys(FIELD_META) as ClientNdaFieldType[]).map((ft) => {
              const meta = FIELD_META[ft];
              const Icon = meta.icon;
              return (
                <button key={ft} onClick={() => setArmedType(ft)}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border', armedType === ft ? (armedParty === 'CLIENT' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-emerald-600 text-white border-emerald-600') : 'bg-white border-gray-200 hover:border-indigo-300')}>
                  <Icon className="w-4 h-4" /> {meta.label}
                </button>
              );
            })}
            {armedType && <p className="text-xs mt-2" style={{ color: armedParty === 'CLIENT' ? '#4338ca' : '#047857' }}>Click on the document to place a {armedParty} {FIELD_META[armedType].label} field.</p>}
            <div className="pt-3 border-t border-gray-100 mt-3 text-xs text-gray-400">
              <p className="text-indigo-600">{clientFields.length} Client field(s)</p>
              <p className="text-emerald-600">{tekxaiFields.length} TekXAI field(s)</p>
              {!hasClientSig && <p className="text-amber-600 mt-1">Missing required Client Signature field.</p>}
              {!hasTekxaiSig && <p className="text-amber-600">Missing required TekXAI Signature field.</p>}
            </div>
            <Button onClick={saveFields} disabled={saveFieldsMutation.isPending} className="w-full mt-2">Save Placement</Button>
            <Button variant="outline" onClick={() => setStep(3)} className="w-full mt-2">Next: Preview & Send</Button>
          </Card>
          <Card className="p-4 overflow-auto max-h-[75vh]">
            <NdaPdfPages
              fileUrl={fileUrl}
              renderPageOverlay={(page, ppp) => (
                <div className="absolute inset-0" style={{ cursor: armedType ? 'crosshair' : 'default' }}
                  onClick={(e) => {
                    if (!armedType) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    addField(page, (e.clientX - rect.left) / ppp, (e.clientY - rect.top) / ppp);
                  }}>
                  {fields.filter((f) => f.page_number === page.pageNumber).map((f) => (
                    <FieldBox key={f._key} field={f} pixelsPerPoint={ppp} onChange={(p) => updateField(f._key, p)} onDelete={() => removeField(f._key)} />
                  ))}
                </div>
              )}
            />
          </Card>
        </div>
      )}

      {step === 3 && documentId && fileUrl && (
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Eye className="w-4 h-4" /> Preview — Client fields (indigo) vs TekXAI fields (emerald)</h2>
            <div className="max-h-[60vh] overflow-auto border border-gray-100 rounded-lg p-3">
              <NdaPdfPages fileUrl={fileUrl} renderPageOverlay={(page, ppp) => (
                <>
                  {fields.filter((f) => f.page_number === page.pageNumber).map((f) => (
                    <div key={f._key}
                      className={cn('absolute border-2 rounded text-[10px] flex items-center justify-center font-medium',
                        f.party === 'CLIENT' ? 'border-indigo-400 bg-indigo-50/60 text-indigo-700' : 'border-emerald-400 bg-emerald-50/60 text-emerald-700')}
                      style={{ left: f.x * ppp, top: f.y * ppp, width: f.width * ppp, height: f.height * ppp }}>
                      {f.label}{f.required ? ' *' : ''}
                    </div>
                  ))}
                </>
              )} />
            </div>
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>{clientFields.length} client field(s) · {tekxaiFields.length} TekXAI field(s)</p>
              {(!hasClientSig || !hasTekxaiSig) && <p className="text-amber-600">Both parties need a required Signature field before sending.</p>}
            </div>
            <Button onClick={handleSend} disabled={send.isPending || !hasClientSig || !hasTekxaiSig} className="flex items-center gap-2">
              <Send className="w-4 h-4" /> Send to Client
            </Button>
          </Card>
          {sent && (
            <Card className="p-4 text-sm text-green-600 font-medium">
              NDA sent — status: {sent.status}. The client will receive an email with their signing link.
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
  const partyColor = field.party === 'CLIENT' ? 'indigo' : 'emerald';

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
      className={cn('absolute border-2 rounded group', partyColor === 'indigo' ? 'border-indigo-500 bg-indigo-50/70' : 'border-emerald-500 bg-emerald-50/70')}
      style={{ left: field.x * pixelsPerPoint, top: field.y * pixelsPerPoint, width: field.width * pixelsPerPoint, height: field.height * pixelsPerPoint }}
      onMouseDown={onDragStart}
    >
      <div className="absolute -top-6 left-0 flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-sm opacity-0 group-hover:opacity-100 z-10" onMouseDown={(e) => e.stopPropagation()}>
        <input value={field.label} onChange={(e) => onChange({ label: e.target.value })} className="text-[10px] w-24 outline-none" />
        <label className="text-[9px] flex items-center gap-0.5 text-gray-500">
          <input type="checkbox" checked={field.required !== false} onChange={(e) => onChange({ required: e.target.checked })} /> req
        </label>
        <button onClick={onDelete} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
      </div>
      <span className={cn('text-[10px] font-medium px-1 truncate block select-none', partyColor === 'indigo' ? 'text-indigo-700' : 'text-emerald-700')}>
        {field.label}{field.required !== false ? ' *' : ''}
      </span>
      <div onMouseDown={onResizeStart} className={cn('absolute bottom-0 right-0 w-3 h-3 rounded-tl cursor-nwse-resize', partyColor === 'indigo' ? 'bg-indigo-500' : 'bg-emerald-500')} />
    </div>
  );
}
