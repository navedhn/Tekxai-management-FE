import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

const GoalsPage: React.FC = () => {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [krTitle, setKrTitle] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiRequest<any>('/api/v1/goals'),
  });
  const goals = data?.payload?.records || [];

  const createGoal = useMutation({
    mutationFn: () => apiRequest('/api/v1/goals', { method: 'POST', body: JSON.stringify({ title }) }),
    onSuccess: () => { toast.success('Goal created'); setTitle(''); qc.invalidateQueries({ queryKey: ['goals'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const addKr = useMutation({
    mutationFn: () => apiRequest(`/api/v1/goals/${selectedGoal}/key-results`, {
      method: 'POST',
      body: JSON.stringify({ title: krTitle, target_value: 100, current_value: 0 }),
    }),
    onSuccess: () => { toast.success('Key result added'); setKrTitle(''); qc.invalidateQueries({ queryKey: ['goals'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Goals / OKRs</h1>
      <p className="text-sm text-gray-500 mb-6">Track goals and key results with progress.</p>

      <div className="flex gap-2 mb-6">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="New goal title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm" disabled={!title.trim()} onClick={() => createGoal.mutate()}>Add goal</button>
      </div>

      <div className="flex flex-col gap-4">
        {goals.map((g: any) => (
          <div key={g.id} className={`border rounded-xl p-4 bg-white ${selectedGoal === g.id ? 'ring-2 ring-blue-400' : ''}`} onClick={() => setSelectedGoal(g.id)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{g.title}</div>
                <div className="text-xs text-gray-500 mt-1">{g.status} · Owner {g.owner ? `${g.owner.first_name} ${g.owner.last_name}` : '—'}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">{g.progress_percent}%</div>
                <div className="text-[11px] text-gray-400">progress</div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, g.progress_percent || 0)}%` }} />
            </div>
            <ul className="mt-3 space-y-1">
              {(g.key_results || []).map((kr: any) => (
                <li key={kr.id} className="text-sm text-gray-700 flex justify-between">
                  <span>{kr.title}</span>
                  <span className="text-xs text-gray-500">{kr.current_value}/{kr.target_value}{kr.unit ? ` ${kr.unit}` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!goals.length && <div className="text-sm text-gray-500 text-center py-10">No goals yet.</div>}
      </div>

      {selectedGoal && (
        <div className="mt-6 flex gap-2">
          <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Key result title" value={krTitle} onChange={(e) => setKrTitle(e.target.value)} />
          <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm" disabled={!krTitle.trim()} onClick={() => addKr.mutate()}>Add KR</button>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
