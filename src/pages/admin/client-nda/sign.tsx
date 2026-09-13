import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetTekxaiFields, useTekxaiSign } from '@/services/clientNdaService';
import NdaPdfPages from '@/components/nda/NdaPdfPages';
import SignaturePad from '@/components/hr-documents/SignaturePad';

export default function ClientNdaTekxaiSignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();

  const { data, isLoading, refetch } = useGetTekxaiFields(id);
  const tekxaiSign = useTekxaiSign();

  const [values, setValues] = useState<Record<string, { field_id: string; value_text?: string; value_image?: string }>>({});
  const [missing, setMissing] = useState<{ id: string; label: string }[] | null>(null);

  useEffect(() => {
    if (!data?.fields) return;
    const initial: Record<string, any> = {};
    for (const f of data.fields) if (f.value) initial[f.id] = { field_id: f.id, value_text: f.value.value_text, value_image: f.value.value_image };
    setValues(initial);
  }, [data]);

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  const doc = data?.document;
  const fields = data?.fields || [];
  const clientFields = fields.filter((f) => f.party === 'CLIENT');
  const tekxaiFields = fields.filter((f) => f.party === 'TEKXAI');
  const isPending = doc?.status === 'TEKXAI_SIGNATURE_PENDING';

  async function handleSign() {
    if (!id) return;
    try {
      await tekxaiSign.mutateAsync({ documentId: id, values: Object.values(values) });
      setMissing(null);
      toast.success('NDA countersigned — completed');
      refetch();
    } catch (e: any) {
      if (e?.data?.code === 'NDA_INCOMPLETE') {
        setMissing(e.data.missing_fields);
        toast.error(e.data.message);
      } else {
        toast.error(e?.message || 'Failed to sign');
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{doc?.title}</h1>
          <p className="text-sm text-gray-400">Client: {doc?.client_signer_name} ({doc?.client_signer_email})</p>
        </div>
        <Badge variant="info" className={doc?.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>{doc?.status}</Badge>
      </div>

      {doc?.status === 'COMPLETED' && (
        <Card className="p-4 mb-4 bg-green-50 border-green-100 flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="w-5 h-5" /> This NDA is fully executed — both parties have signed.
        </Card>
      )}
      {missing && missing.length > 0 && (
        <Card className="p-4 mb-4 bg-red-50 border-red-100 text-red-700 text-sm">
          <p className="font-semibold flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> Please complete:</p>
          <ul className="list-disc list-inside">{missing.map((m) => <li key={m.id}>{m.label}</li>)}</ul>
        </Card>
      )}

      {data?.file_url && (
        <Card className="p-4 overflow-auto max-h-[70vh] mb-4">
          <NdaPdfPages fileUrl={data.file_url} renderPageOverlay={(page, ppp) => (
            <>
              {clientFields.filter((f) => f.page_number === page.pageNumber).map((f) => (
                <div key={f.id} className="absolute border rounded bg-gray-50 border-gray-300 flex items-center px-1 overflow-hidden text-[10px] text-gray-600"
                  style={{ left: f.x * ppp, top: f.y * ppp, width: f.width * ppp, height: f.height * ppp }}>
                  {f.field_type === 'SIGNATURE' && f.value?.value_image
                    ? <img src={f.value.value_image} className="max-h-full" />
                    : (f.value?.value_text || <span className="text-gray-300">{f.label}</span>)}
                </div>
              ))}
              {tekxaiFields.filter((f) => f.page_number === page.pageNumber).map((f) => (
                <TekxaiFieldInput key={f.id} field={f} pixelsPerPoint={ppp} readOnly={!isPending}
                  value={values[f.id]}
                  onChange={(patch) => setValues((prev) => ({ ...prev, [f.id]: { ...prev[f.id], ...patch, field_id: f.id } }))}
                />
              ))}
            </>
          )} />
        </Card>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Client Submission</p>
        {clientFields.map((f) => (
          <div key={f.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
            <span className="text-gray-600">{f.label}</span>
            <span className="text-gray-800 font-medium">{f.field_type === 'SIGNATURE' ? (f.value?.value_image ? 'Signed' : '—') : (f.value?.value_text || '—')}</span>
          </div>
        ))}
        <p className="text-xs text-gray-400 mt-2">Client signed: {doc?.client_signed_at ? new Date(doc.client_signed_at).toLocaleString() : '—'}</p>
      </div>

      {isPending && (
        <div className="flex justify-end">
          <Button onClick={handleSign} disabled={tekxaiSign.isPending}>Sign as TekXAI</Button>
        </div>
      )}
    </div>
  );
}

function TekxaiFieldInput({ field, pixelsPerPoint, readOnly, value, onChange }: {
  field: any; pixelsPerPoint: number; readOnly: boolean; value?: { value_text?: string; value_image?: string };
  onChange: (patch: any) => void;
}) {
  const style: React.CSSProperties = {
    position: 'absolute', left: field.x * pixelsPerPoint, top: field.y * pixelsPerPoint,
    width: field.width * pixelsPerPoint, height: field.height * pixelsPerPoint,
  };
  if (field.field_type === 'SIGNATURE') {
    if (readOnly) {
      return <div style={style} className="border rounded border-emerald-300 bg-emerald-50/40 flex items-center justify-center overflow-hidden">
        {value?.value_image ? <img src={value.value_image} className="max-h-full" /> : <span className="text-[9px] text-gray-400">Signature</span>}
      </div>;
    }
    return (
      <div style={{ ...style, height: Math.max(field.height * pixelsPerPoint, 90) }} className="border rounded border-emerald-400 bg-emerald-50/40 p-1 z-10">
        <SignaturePad height={Math.max(field.height * pixelsPerPoint - 30, 50)} onChange={(d) => onChange({ value_image: d })} />
      </div>
    );
  }
  return (
    <div style={style} className="border rounded border-emerald-300 bg-emerald-50/40 flex items-center px-1 z-10">
      <input readOnly={readOnly} value={value?.value_text || ''} onChange={(e) => onChange({ value_text: e.target.value })}
        placeholder={field.label} className="w-full h-full bg-transparent outline-none text-[11px]" />
    </div>
  );
}
