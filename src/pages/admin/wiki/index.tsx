import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

/** Admin company/project wiki browser. */
const WikiDocsAdminPage: React.FC = () => {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ['wiki-docs'],
    queryFn: () => apiRequest<any>('/api/v1/wiki-docs?include_company=true'),
  });

  const docQ = useQuery({
    queryKey: ['wiki-docs', selected],
    queryFn: () => apiRequest<any>(`/api/v1/wiki-docs/${selected}`),
    enabled: !!selected,
  });

  const create = useMutation({
    mutationFn: () => apiRequest('/api/v1/wiki-docs', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    }),
    onSuccess: () => { toast.success('Created'); setTitle(''); setContent(''); qc.invalidateQueries({ queryKey: ['wiki-docs'] }); },
  });

  const save = useMutation({
    mutationFn: () => apiRequest(`/api/v1/wiki-docs/${selected}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['wiki-docs', selected] }); },
  });

  if (listQ.isLoading) return <PageSkeleton />;
  const records = listQ.data?.payload?.records || [];
  const doc = docQ.data?.payload;

  return (
    <div className="p-6 max-w-5xl mx-auto grid md:grid-cols-[240px_1fr] gap-4">
      <aside className="border rounded-xl p-3 bg-white">
        <div className="font-medium mb-2">Wiki</div>
        {records.map((d: any) => (
          <button key={d.id} className={`block w-full text-left text-sm px-2 py-1.5 rounded ${selected === d.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`} onClick={() => { setSelected(d.id); setContent(''); }}>
            {d.title}
          </button>
        ))}
        <div className="mt-4 border-t pt-3 space-y-2">
          <input className="w-full border rounded px-2 py-1 text-sm" placeholder="New title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="w-full text-sm px-2 py-1.5 rounded bg-blue-600 text-white" disabled={!title.trim()} onClick={() => create.mutate()}>Create</button>
        </div>
      </aside>
      <section className="border rounded-xl p-4 bg-white">
        {selected && doc ? (
          <>
            <h2 className="text-lg font-semibold mb-3">{doc.title}</h2>
            <textarea className="w-full min-h-[360px] border rounded-lg p-3 font-mono text-sm" value={content || doc.content || ''} onChange={(e) => setContent(e.target.value)} />
            <button className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm" onClick={() => save.mutate()}>Save</button>
          </>
        ) : (
          <div className="text-sm text-gray-500 py-16 text-center">Select or create a document.</div>
        )}
      </section>
    </div>
  );
};

export default WikiDocsAdminPage;
