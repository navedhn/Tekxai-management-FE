import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

/** Public intake form — no auth required. */
const PublicIntakeFormPage: React.FC = () => {
  const { token = '' } = useParams();
  const toast = useToastContext();
  const [values, setValues] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const formQ = useQuery({
    queryKey: ['public-intake', token],
    queryFn: () => apiRequest<any>(`/api/v1/public/intake-forms/${token}`),
    enabled: !!token,
  });

  const submit = useMutation({
    mutationFn: () => apiRequest(`/api/v1/public/intake-forms/${token}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        payload: values,
        submitter_name: name,
        submitter_email: email,
      }),
    }),
    onSuccess: () => { setDone(true); toast.success('Submitted'); },
    onError: (e: any) => toast.error(e?.message || 'Submit failed'),
  });

  const form = formQ.data?.payload;
  const fields = Array.isArray(form?.fields) ? form.fields : [];

  useEffect(() => {
    if (!fields.length) return;
    setValues((prev) => {
      const next = { ...prev };
      for (const f of fields) if (next[f.key] === undefined) next[f.key] = '';
      return next;
    });
  }, [fields.length]);

  if (formQ.isLoading) return <PageSkeleton />;
  if (!form) return <div className="p-8 text-center text-gray-500">Form not found or inactive.</div>;
  if (done) return <div className="p-8 max-w-lg mx-auto text-center"><h1 className="text-xl font-semibold">Thanks!</h1><p className="text-sm text-gray-500 mt-2">Your submission was received.</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="max-w-lg mx-auto bg-white border rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{form.title}</h1>
        {form.description && <p className="text-sm text-gray-500 mt-2">{form.description}</p>}
        {form.project?.title && <p className="text-xs text-gray-400 mt-1">Project: {form.project.title}</p>}

        <div className="mt-6 space-y-3">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {fields.map((f: any) => (
            <div key={f.key}>
              <label className="text-xs text-gray-500">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'textarea' ? (
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={4} value={values[f.key] || ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              ) : (
                <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" type={f.type === 'email' ? 'email' : 'text'} value={values[f.key] || ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              )}
            </div>
          ))}
          <button className="w-full mt-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium" onClick={() => submit.mutate()} disabled={submit.isPending}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicIntakeFormPage;
