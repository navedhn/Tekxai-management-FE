import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Upload } from 'lucide-react';
import {
  useGetPublicClientNda, useClientSaveProgress, useClientSubmit, useClientUploadFieldFile,
} from '@/services/clientNdaService';
import NdaPdfPages from '@/components/nda/NdaPdfPages';
import SignaturePad from '@/components/hr-documents/SignaturePad';

// Public, unauthenticated page — resolved strictly by the token in the URL.
// Deliberately does not import any admin/auth chrome (Sidebar, TopBar,
// ProtectedRoute) — a client must never see anything beyond this NDA.
export default function ClientNdaSignPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error, refetch } = useGetPublicClientNda(token);
  const saveProgress = useClientSaveProgress();
  const submit = useClientSubmit();
  const uploadFile = useClientUploadFieldFile();

  const [values, setValues] = useState<Record<string, { field_id: string; value_text?: string; value_image?: string; value_file_key?: string }>>({});
  const [missing, setMissing] = useState<{ id: string; label: string }[] | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const fileUrl = data?.file_url || null;

  useEffect(() => {
    if (!data?.fields) return;
    const initial: Record<string, any> = {};
    for (const f of data.fields) if (f.value) initial[f.id] = { field_id: f.id, value_text: f.value.value_text, value_image: f.value.value_image, value_file_key: f.value.value_file_key };
    setValues(initial);
  }, [data]);

  const doc = data?.document;
  const fields = data?.fields || [];
  const isCompleted = doc?.status === 'TEKXAI_SIGNATURE_PENDING' || doc?.status === 'COMPLETED';
  const isFillable = doc && ['SENT_TO_CLIENT', 'CLIENT_VIEWED'].includes(doc.status);
  const missingIds = useMemo(() => new Set((missing || []).map((m) => m.id)), [missing]);

  function setFieldValue(fieldId: string, patch: Partial<{ value_text: string; value_image: string; value_file_key: string }>) {
    setValues((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], ...patch, field_id: fieldId } }));
  }

  async function handleSaveProgress() {
    if (!token) return;
    const result = await saveProgress.mutateAsync({ token, values: Object.values(values) });
    setMissing(result.missing_fields.length ? result.missing_fields : null);
  }

  async function handleSubmit() {
    if (!token) return;
    try {
      await submit.mutateAsync({ token, values: Object.values(values) });
      setMissing(null);
      refetch();
    } catch (e: any) {
      if (e?.data?.code === 'NDA_INCOMPLETE') setMissing(e.data.missing_fields);
    }
  }

  async function handleFieldFileUpload(fieldId: string, file: File) {
    if (!token) return;
    setUploadingField(fieldId);
    try {
      const { file_key } = await uploadFile.mutateAsync({ token, fieldId, file });
      setFieldValue(fieldId, { value_file_key: file_key });
    } finally {
      setUploadingField(null);
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">This signing link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h1 className="text-xl font-bold text-gray-900">{doc?.title}</h1>
          <p className="text-sm text-gray-500 mt-1">Please review and complete the required fields below to sign this NDA.</p>
        </div>

        {isCompleted && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle2 className="w-5 h-5" /> Thank you — your signature has been recorded. TekXAI will countersign shortly.
          </div>
        )}
        {missing && missing.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 text-red-700 text-sm">
            <p className="font-semibold flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> Please complete:</p>
            <ul className="list-disc list-inside">{missing.map((m) => <li key={m.id}>{m.label}</li>)}</ul>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 overflow-auto max-h-[70vh]">
          {fileUrl && (
            <NdaPdfPages fileUrl={fileUrl} renderPageOverlay={(page, ppp) => (
              <>
                {fields.filter((f) => f.page_number === page.pageNumber).map((f) => (
                  <ClientFieldInput key={f.id} field={f} pixelsPerPoint={ppp} value={values[f.id]} readOnly={!isFillable}
                    missing={missingIds.has(f.id)} uploading={uploadingField === f.id}
                    onChange={(patch: any) => setFieldValue(f.id, patch)}
                    onUploadFile={(file: File) => handleFieldFileUpload(f.id, file)} />
                ))}
              </>
            )} />
          )}
        </div>

        {isFillable && (
          <div className="flex items-center justify-end gap-3">
            <button onClick={handleSaveProgress} disabled={saveProgress.isPending} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Save Progress</button>
            <button onClick={handleSubmit} disabled={submit.isPending} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Sign & Submit</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientFieldInput({ field, pixelsPerPoint, value, readOnly, missing, uploading, onChange, onUploadFile }: any) {
  const style: React.CSSProperties = {
    position: 'absolute', left: field.x * pixelsPerPoint, top: field.y * pixelsPerPoint,
    width: field.width * pixelsPerPoint, height: field.height * pixelsPerPoint,
  };
  const borderClass = missing ? 'border-red-400 bg-red-50' : 'border-indigo-300 bg-indigo-50/40';

  if (field.field_type === 'SIGNATURE') {
    if (readOnly) {
      return <div style={style} className={`border rounded ${borderClass} flex items-center justify-center overflow-hidden`}>
        {value?.value_image ? <img src={value.value_image} className="max-h-full max-w-full" /> : <span className="text-[9px] text-gray-400">Signature</span>}
      </div>;
    }
    return (
      <div style={{ ...style, height: Math.max(field.height * pixelsPerPoint, 90) }} className={`border rounded ${borderClass} p-1 z-10`}>
        <SignaturePad height={Math.max(field.height * pixelsPerPoint - 30, 50)} onChange={(d) => onChange({ value_image: d })} />
      </div>
    );
  }
  if (field.field_type === 'FILE_UPLOAD') {
    return (
      <div style={style} className={`border rounded ${borderClass} flex items-center justify-center text-[10px] px-1`}>
        {value?.value_file_key ? <span className="text-green-600 flex items-center gap-1"><Upload className="w-3 h-3" /> Uploaded</span>
          : readOnly ? <span className="text-gray-400">No file</span>
          : <label className="flex items-center gap-1 text-indigo-600 cursor-pointer">
              <Upload className="w-3 h-3" /> {uploading ? 'Uploading…' : 'Upload'}
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadFile(f); }} />
            </label>}
      </div>
    );
  }
  return (
    <div style={style} className={`border rounded ${borderClass} flex items-center px-1 z-10`}>
      <input type={field.field_type === 'DATE' ? 'date' : 'text'} readOnly={readOnly} value={value?.value_text || ''}
        onChange={(e) => onChange({ value_text: e.target.value })} placeholder={field.label}
        className="w-full h-full bg-transparent outline-none text-[11px]" />
    </div>
  );
}
