import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

/** Project custom fields + status lists management. */
const ProjectCustomFieldsPage: React.FC = () => {
  const { projectId = '' } = useParams();
  const toast = useToastContext();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState('TEXT');

  const fieldsQ = useQuery({
    queryKey: ['custom-fields', projectId],
    queryFn: () => apiRequest<any>(`/api/v1/project/${projectId}/custom/fields`),
    enabled: !!projectId,
  });
  const statusQ = useQuery({
    queryKey: ['status-lists', projectId],
    queryFn: () => apiRequest<any>(`/api/v1/project/${projectId}/custom/status-lists`),
    enabled: !!projectId,
  });

  const createField = useMutation({
    mutationFn: () => apiRequest(`/api/v1/project/${projectId}/custom/fields`, {
      method: 'POST',
      body: JSON.stringify({ name, field_type: fieldType }),
    }),
    onSuccess: () => { toast.success('Field created'); setName(''); qc.invalidateQueries({ queryKey: ['custom-fields', projectId] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const createStatuses = useMutation({
    mutationFn: () => apiRequest(`/api/v1/project/${projectId}/custom/status-lists`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Default',
        statuses: [
          { key: 'TODO', label: 'To do' },
          { key: 'IN_PROGRESS', label: 'In progress' },
          { key: 'DONE', label: 'Done' },
        ],
      }),
    }),
    onSuccess: () => { toast.success('Status list created'); qc.invalidateQueries({ queryKey: ['status-lists', projectId] }); },
  });

  if (!projectId) return <div className="p-6">Missing project id</div>;
  if (fieldsQ.isLoading) return <PageSkeleton />;

  const fields = fieldsQ.data?.payload?.records || [];
  const lists = statusQ.data?.payload?.records || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Custom fields & statuses</h1>
      <p className="text-sm text-gray-500 mb-6">Project-specific field definitions and status lists.</p>

      <div className="flex gap-2 mb-4">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Field name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm" value={fieldType} onChange={(e) => setFieldType(e.target.value)}>
          {['TEXT', 'NUMBER', 'DATE', 'SELECT'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm" disabled={!name.trim()} onClick={() => createField.mutate()}>Add field</button>
      </div>

      <ul className="mb-8 space-y-2">
        {fields.map((f: any) => (
          <li key={f.id} className="border rounded-lg px-3 py-2 text-sm flex justify-between bg-white">
            <span>{f.name}</span>
            <span className="text-gray-500">{f.field_type}</span>
          </li>
        ))}
        {!fields.length && <li className="text-sm text-gray-500">No custom fields yet.</li>}
      </ul>

      <div className="flex items-center justify-between mb-2">
        <h2 className="font-medium">Status lists</h2>
        <button className="text-sm text-blue-600" onClick={() => createStatuses.mutate()}>Create default list</button>
      </div>
      {lists.map((l: any) => (
        <div key={l.id} className="border rounded-xl p-3 mb-2 bg-white">
          <div className="text-sm font-medium">{l.name}{l.is_default ? ' (default)' : ''}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(Array.isArray(l.statuses) ? l.statuses : []).map((s: any) => (
              <span key={s.key} className="text-xs px-2 py-1 rounded-full bg-gray-100">{s.label || s.key}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectCustomFieldsPage;
