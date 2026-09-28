import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

/**
 * Minimal channel settings panel for #28 permission overwrites + slowmode.
 * Expects ?channelId= query or uses local channel id input for MVP.
 */
const ChannelPermissionSettings: React.FC<{ channelId?: string }> = ({ channelId: propId }) => {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [channelId, setChannelId] = useState(propId || '');
  const [slowmode, setSlowmode] = useState(0);
  const [targetType, setTargetType] = useState('ROLE');
  const [targetId, setTargetId] = useState('');
  const [denySend, setDenySend] = useState(false);
  const [denyView, setDenyView] = useState(false);

  const overwritesQ = useQuery({
    queryKey: ['channel-overwrites', channelId],
    queryFn: () => apiRequest<any>(`/api/v1/chat/channels/${channelId}/overwrites`),
    enabled: !!channelId,
  });

  React.useEffect(() => {
    if (overwritesQ.data?.payload?.slowmode_seconds != null) {
      setSlowmode(overwritesQ.data.payload.slowmode_seconds);
    }
  }, [overwritesQ.data]);

  const saveSlowmode = useMutation({
    mutationFn: () => apiRequest(`/api/v1/chat/channels/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify({ slowmode_seconds: Number(slowmode) }),
    }),
    onSuccess: () => toast.success('Slowmode updated'),
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const upsert = useMutation({
    mutationFn: () => apiRequest(`/api/v1/chat/channels/${channelId}/overwrites`, {
      method: 'PUT',
      body: JSON.stringify({
        target_type: targetType,
        target_id: targetId,
        deny_send: denySend,
        deny_view: denyView,
      }),
    }),
    onSuccess: () => {
      toast.success('Overwrite saved');
      setTargetId('');
      qc.invalidateQueries({ queryKey: ['channel-overwrites', channelId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/chat/channels/${channelId}/overwrites/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channel-overwrites', channelId] }),
  });

  const records = overwritesQ.data?.payload?.records || [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Channel permissions</h1>
      <p className="text-sm text-gray-500 mb-6">Discord-like role/user overwrites and slowmode.</p>

      {!propId && (
        <input className="w-full border rounded-lg px-3 py-2 text-sm mb-4" placeholder="Channel ID" value={channelId} onChange={(e) => setChannelId(e.target.value)} />
      )}

      {!channelId ? <div className="text-sm text-gray-500">Enter a channel id to manage settings.</div> : overwritesQ.isLoading ? <PageSkeleton /> : (
        <>
          <div className="border rounded-xl p-4 bg-white mb-4 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Slowmode (seconds)</label>
              <input type="number" min={0} max={21600} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={slowmode} onChange={(e) => setSlowmode(Number(e.target.value))} />
            </div>
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm" onClick={() => saveSlowmode.mutate()}>Save</button>
          </div>

          <div className="border rounded-xl p-4 bg-white mb-4 space-y-2">
            <div className="font-medium text-sm">Add overwrite</div>
            <div className="flex gap-2">
              <select className="border rounded-lg px-2 py-1.5 text-sm" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
                <option value="ROLE">ROLE</option>
                <option value="USER">USER</option>
              </select>
              <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm" placeholder={targetType === 'ROLE' ? 'Role name e.g. EMPLOYEE' : 'User id'} value={targetId} onChange={(e) => setTargetId(e.target.value)} />
            </div>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={denyView} onChange={(e) => setDenyView(e.target.checked)} /> Deny view</label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={denySend} onChange={(e) => setDenySend(e.target.checked)} /> Deny send</label>
            <button className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm" disabled={!targetId} onClick={() => upsert.mutate()}>Save overwrite</button>
          </div>

          <div className="space-y-2">
            {records.map((r: any) => (
              <div key={r.id} className="border rounded-lg px-3 py-2 text-sm bg-white flex justify-between items-center">
                <span>{r.target_type}:{r.target_id} {r.deny_view ? '· deny view' : ''} {r.deny_send ? '· deny send' : ''}</span>
                <button className="text-red-600 text-xs" onClick={() => remove.mutate(r.id)}>Remove</button>
              </div>
            ))}
            {!records.length && <div className="text-sm text-gray-500">No overwrites.</div>}
          </div>
        </>
      )}
    </div>
  );
};

export default ChannelPermissionSettings;
