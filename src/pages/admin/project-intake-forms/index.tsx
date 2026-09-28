import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

const ProjectIntakeFormsPage: React.FC = () => {
  const { projectId = '' } = useParams();
  const toast = useToastContext();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['intake-forms', projectId],
    queryFn: () => apiRequest<any>(`/api/v1/project/${projectId}/intake-forms`),
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: () => apiRequest(`/api/v1/project/${projectId}/intake-forms`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'details', label: 'Details', type: 'textarea', required: true },
        ],
        create_as: 'TASK',
      }),
    }),
    onSuccess: () => { toast.success('Form created'); setTitle(''); qc.invalidateQueries({ queryKey: ['intake-forms', projectId] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  if (!projectId) return <div className="p-6">Missing project id</div>;
  if (isLoading) return <PageSkeleton />;
  const forms = data?.payload?.records || [];
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Public intake forms</h1>
      <p className="text-sm text-gray-500 mb-6">Tokenized public forms that create tasks on this project.</p>

      <div className="flex gap-2 mb-6">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Form title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm" disabled={!title.trim()} onClick={() => create.mutate()}>Create form</button>
      </div>

      <div className="space-y-3">
        {forms.map((f: any) => (
          <div key={f.id} className="border rounded-xl p-4 bg-white">
            <div className="font-medium">{f.title}</div>
            <div className="text-xs text-gray-500 mt-1">{f.is_active ? 'Active' : 'Inactive'} · {f._count?.submissions || 0} submissions · creates {f.create_as}</div>
            <code className="block mt-2 text-xs bg-gray-50 rounded-lg p-2 break-all">{origin}/public/intake/{f.token}</code>
          </div>
        ))}
        {!forms.length && <div className="text-sm text-gray-500">No intake forms yet.</div>}
      </div>
    </div>
  );
};

export default ProjectIntakeFormsPage;
