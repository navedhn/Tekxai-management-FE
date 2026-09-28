import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

const ProjectAutomationsPage: React.FC = () => {
  const { projectId = '' } = useParams();
  const toast = useToastContext();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [triggerTo, setTriggerTo] = useState('DONE');
  const [actionType, setActionType] = useState('NOTIFY');

  const { data, isLoading } = useQuery({
    queryKey: ['automations', projectId],
    queryFn: () => apiRequest<any>(`/api/v1/project/${projectId}/automations`),
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: () => apiRequest(`/api/v1/project/${projectId}/automations`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        trigger_entity: 'TASK',
        trigger_field: 'STATUS',
        trigger_to: triggerTo,
        action_type: actionType,
        action_payload: actionType === 'CREATE_SUBTASK'
          ? { title: 'Follow-up subtask' }
          : { message: `Automation "${name}" fired` },
      }),
    }),
    onSuccess: () => { toast.success('Rule created'); setName(''); qc.invalidateQueries({ queryKey: ['automations', projectId] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  if (!projectId) return <div className="p-6">Missing project id</div>;
  if (isLoading) return <PageSkeleton />;
  const rules = data?.payload?.records || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">PM automations</h1>
      <p className="text-sm text-gray-500 mb-6">When a task status changes, assign / notify / create a subtask.</p>

      <div className="grid gap-2 mb-6">
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Trigger status (e.g. DONE)" value={triggerTo} onChange={(e) => setTriggerTo(e.target.value)} />
          <select className="border rounded-lg px-3 py-2 text-sm" value={actionType} onChange={(e) => setActionType(e.target.value)}>
            <option value="NOTIFY">Notify</option>
            <option value="ASSIGN">Assign</option>
            <option value="CREATE_SUBTASK">Create subtask</option>
          </select>
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm" disabled={!name.trim()} onClick={() => create.mutate()}>Add rule</button>
        </div>
      </div>

      <div className="space-y-2">
        {rules.map((r: any) => (
          <div key={r.id} className="border rounded-xl p-3 bg-white text-sm">
            <div className="font-medium">{r.name} {!r.is_active && <span className="text-gray-400">(inactive)</span>}</div>
            <div className="text-xs text-gray-500 mt-1">
              When {r.trigger_entity}.{r.trigger_field} → {r.trigger_to || 'any'} then {r.action_type}
            </div>
          </div>
        ))}
        {!rules.length && <div className="text-sm text-gray-500">No automation rules yet.</div>}
      </div>
    </div>
  );
};

export default ProjectAutomationsPage;
