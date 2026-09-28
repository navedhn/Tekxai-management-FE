import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

const ProductivityDigestsPage: React.FC = () => {
  const toast = useToastContext();
  const qc = useQueryClient();

  const previewQ = useQuery({
    queryKey: ['productivity-digest', 'preview'],
    queryFn: () => apiRequest<any>('/api/v1/productivity-digests/preview'),
  });
  const settingsQ = useQuery({
    queryKey: ['productivity-digest', 'settings'],
    queryFn: () => apiRequest<any>('/api/v1/productivity-digests/settings'),
  });

  const send = useMutation({
    mutationFn: () => apiRequest('/api/v1/productivity-digests/send', { method: 'POST' }),
    onSuccess: (r: any) => toast.success(`Digest sent to ${r?.payload?.sent ?? 0} recipients`),
    onError: (e: any) => toast.error(e?.message || 'Send failed'),
  });

  const saveSettings = useMutation({
    mutationFn: (body: any) => apiRequest('/api/v1/productivity-digests/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['productivity-digest', 'settings'] }); },
  });

  if (previewQ.isLoading) return <PageSkeleton />;
  const records = previewQ.data?.payload?.records || [];
  const settings = settingsQ.data?.payload;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Productivity digests</h1>
          <p className="text-sm text-gray-500 mt-1">App usage categorized into productive / neutral / distracting buckets.</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm" onClick={() => send.mutate()}>
          Send digest now
        </button>
      </div>

      {settings && (
        <div className="border rounded-xl p-4 mb-6 bg-white flex flex-wrap gap-4 items-center">
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!settings.is_enabled}
              onChange={(e) => saveSettings.mutate({ is_enabled: e.target.checked })}
            />
            Enabled
          </label>
          <select
            className="border rounded-lg px-3 py-1.5 text-sm"
            value={settings.cadence || 'WEEKLY'}
            onChange={(e) => saveSettings.mutate({ cadence: e.target.value })}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="DAILY">Daily</option>
          </select>
          <span className="text-xs text-gray-400">Last sent: {settings.last_sent_at ? new Date(settings.last_sent_at).toLocaleString() : 'never'}</span>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Productive %</th>
              <th className="px-3 py-2">Productive (s)</th>
              <th className="px-3 py-2">Distracting (s)</th>
              <th className="px-3 py-2">Total (s)</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r: any) => (
              <tr key={r.user_id} className="border-t">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.productive_pct}%</td>
                <td className="px-3 py-2">{r.PRODUCTIVE}</td>
                <td className="px-3 py-2">{r.DISTRACTING}</td>
                <td className="px-3 py-2">{r.total}</td>
              </tr>
            ))}
            {!records.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">No usage data in range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductivityDigestsPage;
