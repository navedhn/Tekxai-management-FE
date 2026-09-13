import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { CheckCircle2, AlertTriangle, Upload, ArrowLeft } from 'lucide-react';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetDocumentFields, useSaveNdaProgress, useSubmitNda, useUploadNdaFieldFile,
  NdaField, NdaValueInput,
} from '@/services/ndaService';
import { useGetDocumentPdf, useViewDocument } from '@/services/hrDocumentsService';
import NdaPdfPages from '@/components/nda/NdaPdfPages';
import SignaturePad from '@/components/hr-documents/SignaturePad';

export default function EmployeeNdaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();

  const { data, isLoading, refetch } = useGetDocumentFields(id);
  const getPdf = useGetDocumentPdf();
  const viewDoc = useViewDocument();
  const saveProgress = useSaveNdaProgress();
  const submit = useSubmitNda();
  const uploadFieldFile = useUploadNdaFieldFile();

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, NdaValueInput>>({});
  const [missing, setMissing] = useState<{ id: string; label: string }[] | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    if (id) viewDoc.mutate({ id }); // marks SENT -> VIEWED, matches the existing HR-documents pattern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getPdf.mutateAsync(id).then((r) => setFileUrl(r.url)).catch(() => toast.error('Failed to load document'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!data?.fields) return;
    const initial: Record<string, NdaValueInput> = {};
    for (const f of data.fields) {
      if (f.value) initial[f.id] = { field_id: f.id, value_text: f.value.value_text, value_image: f.value.value_image, value_file_key: f.value.value_file_key };
    }
    setValues(initial);
  }, [data]);

  const doc = data?.document;
  const fields = data?.fields || [];
  const isCompleted = doc?.status === 'SIGNED';
  const isFillable = doc && ['SENT', 'VIEWED'].includes(doc.status);

  function setFieldValue(field: NdaField, patch: Partial<NdaValueInput>) {
    setValues((prev) => ({ ...prev, [field.id]: { ...prev[field.id], ...patch, field_id: field.id } }));
  }

  async function handleSaveProgress() {
    if (!id) return;
    const result = await saveProgress.mutateAsync({ documentId: id, values: Object.values(values) });
    setMissing(result.missing_fields.length ? result.missing_fields : null);
    toast.success('Progress saved');
  }

  async function handleSubmit() {
    if (!id) return;
    try {
      await submit.mutateAsync({ documentId: id, values: Object.values(values) });
      setMissing(null);
      toast.success('NDA submitted successfully');
      refetch();
    } catch (e: any) {
      if (e?.data?.code === 'NDA_INCOMPLETE') {
        setMissing(e.data.missing_fields);
        toast.error(e.data.message || 'Please complete all required fields');
      } else {
        toast.error(e?.message || 'Failed to submit NDA');
      }
    }
  }

  async function handleFieldFileUpload(field: NdaField, file: File) {
    if (!id) return;
    setUploadingField(field.id);
    try {
      const { file_key } = await uploadFieldFile.mutateAsync({ documentId: id, fieldId: field.id, file });
      setFieldValue(field, { value_file_key: file_key });
      toast.success('File uploaded');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploadingField(null);
    }
  }

  const missingIds = useMemo(() => new Set((missing || []).map((m) => m.id)), [missing]);

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  if (!data?.fields?.length) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p className="text-gray-500">This document doesn't use the native NDA fill flow.</p>
        <Link to={`/employee/documents/${id}`} className="text-indigo-600 text-sm mt-2 inline-block">Open in the standard document viewer</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{doc?.title}</h1>
          <p className="text-sm text-gray-400">Assigned {doc?.sent_at ? new Date(doc.sent_at).toLocaleDateString() : ''}</p>
        </div>
        <Badge variant="info" className={isCompleted ? 'bg-green-100 text-green-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
          {doc?.status}
        </Badge>
      </div>

      {isCompleted && (
        <Card className="p-4 mb-4 bg-green-50 border-green-100 flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="w-5 h-5" /> This NDA has been completed and submitted.
        </Card>
      )}

      {missing && missing.length > 0 && (
        <Card className="p-4 mb-4 bg-red-50 border-red-100 text-red-700 text-sm">
          <p className="font-semibold flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> Please complete:</p>
          <ul className="list-disc list-inside">
            {missing.map((m) => <li key={m.id}>{m.label}</li>)}
          </ul>
        </Card>
      )}

      {fileUrl && (
        <Card className="p-4 overflow-auto max-h-[70vh] mb-4">
          <NdaPdfPages
            fileUrl={fileUrl}
            renderPageOverlay={(page, ppp) => (
              <>
                {fields.filter((f) => f.page_number === page.pageNumber).map((f) => (
                  <FieldInput
                    key={f.id} field={f} pixelsPerPoint={ppp}
                    value={values[f.id]}
                    readOnly={!isFillable}
                    missing={missingIds.has(f.id)}
                    uploading={uploadingField === f.id}
                    onChange={(patch) => setFieldValue(f, patch)}
                    onUploadFile={(file) => handleFieldFileUpload(f, file)}
                  />
                ))}
              </>
            )}
          />
        </Card>
      )}

      {isFillable && (
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleSaveProgress} disabled={saveProgress.isPending}>Save Progress</Button>
          <Button onClick={handleSubmit} disabled={submit.isPending}>Submit NDA</Button>
        </div>
      )}
    </div>
  );
}

function FieldInput({ field, pixelsPerPoint, value, readOnly, missing, uploading, onChange, onUploadFile }: {
  field: NdaField; pixelsPerPoint: number; value?: NdaValueInput; readOnly: boolean; missing: boolean; uploading: boolean;
  onChange: (patch: Partial<NdaValueInput>) => void;
  onUploadFile: (file: File) => void;
}) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: field.x * pixelsPerPoint, top: field.y * pixelsPerPoint,
    width: field.width * pixelsPerPoint, height: field.height * pixelsPerPoint,
  };
  const borderClass = missing ? 'border-red-400 bg-red-50' : 'border-indigo-300 bg-indigo-50/40';

  if (field.field_type === 'SIGNATURE') {
    if (readOnly) {
      return (
        <div style={style} className={`border rounded ${borderClass} flex items-center justify-center overflow-hidden`}>
          {value?.value_image ? <img src={value.value_image} className="max-h-full max-w-full" /> : <span className="text-[9px] text-gray-400">Signature</span>}
        </div>
      );
    }
    return (
      <div style={{ ...style, height: Math.max(field.height * pixelsPerPoint, 90) }} className={`border rounded ${borderClass} p-1 z-10`}>
        <SignaturePad height={Math.max(field.height * pixelsPerPoint - 30, 50)} onChange={(dataUrl) => onChange({ value_image: dataUrl })} />
      </div>
    );
  }

  if (field.field_type === 'FILE_UPLOAD') {
    return (
      <div style={style} className={`border rounded ${borderClass} flex items-center justify-center text-[10px] px-1`}>
        {value?.value_file_key ? (
          <span className="text-green-600 flex items-center gap-1"><Upload className="w-3 h-3" /> Uploaded</span>
        ) : readOnly ? (
          <span className="text-gray-400">No file</span>
        ) : (
          <label className="flex items-center gap-1 text-indigo-600 cursor-pointer">
            <Upload className="w-3 h-3" /> {uploading ? 'Uploading…' : 'Upload'}
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadFile(f); }} />
          </label>
        )}
      </div>
    );
  }

  // NAME / DATE / CNIC
  const inputType = field.field_type === 'DATE' ? 'date' : 'text';
  return (
    <div style={style} className={`border rounded ${borderClass} flex items-center px-1 z-10`}>
      <input
        type={inputType}
        readOnly={readOnly}
        value={value?.value_text || ''}
        onChange={(e) => onChange({ value_text: e.target.value })}
        placeholder={field.label}
        className="w-full h-full bg-transparent outline-none text-[11px]"
      />
    </div>
  );
}
