import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Webhook, Plus, Trash2, TestTube, CheckCircle, XCircle } from 'lucide-react';

const get    = (url: string) => apiRequest<any>(url).then((r: any) => r?.payload ?? r);
const post   = (url: string, body?: any) => apiRequest<any>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const patch  = (url: string, body?: any) => apiRequest<any>(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const del    = (url: string) => apiRequest<any>(url, { method: 'DELETE' });

const VALID_EVENTS = [
  'task.created','task.updated','task.completed',
  'expense.submitted','expense.approved','expense.rejected',
  'project.created','project.updated',
  'user.created','payroll.completed','performance.scored',
];

const DEFAULT_FORM = { name: '', url: '', secret: '', events: [] as string[], active: true };

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editHook, setEditHook] = useState<any>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [deliveryHookId, setDeliveryHookId] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ['webhooks'], queryFn: () => get('/webhooks') });
  const hooks: any[] = (data as any)?.hooks || [];

  const { data: deliveries } = useQuery({
    queryKey: ['webhook-deliveries', deliveryHookId],
    queryFn: () => get(`/webhooks/${deliveryHookId}/deliveries`),
    enabled: !!deliveryHookId,
  });

  const create = useMutation({
    mutationFn: (body: any) => post('/webhooks', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); setShowModal(false); setForm({ ...DEFAULT_FORM }); },
  });
  const update = useMutation({
    mutationFn: ({ id, ...body }: any) => patch(`/webhooks/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); setShowModal(false); setEditHook(null); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/webhooks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });
  const testHook = useMutation({ mutationFn: (id: string) => post(`/webhooks/${id}/test`, {}) });
  const toggleActive = useMutation({
    mutationFn: ({ id, active }: any) => patch(`/webhooks/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const openCreate = () => { setEditHook(null); setForm({ ...DEFAULT_FORM }); setShowModal(true); };
  const openEdit = (h: any) => { setEditHook(h); setForm({ name: h.name, url: h.url, secret: '', events: h.events, active: h.active }); setShowModal(true); };
  const toggleEvent = (e: string) => setForm(f => ({ ...f, events: f.events.includes(e) ? f.events.filter(x => x !== e) : [...f.events, e] }));
  const submit = () => {
    const body = { ...form, secret: form.secret || undefined };
    if (editHook) update.mutate({ id: editHook.id, ...body });
    else create.mutate(body);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-1">Get notified when events happen in TekXAI ERP</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#005CDA] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
          <Plus size={16} /> New Webhook
        </button>
      </div>

      {hooks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Webhook size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No webhooks yet</p>
          <p className="text-sm">Create one to start receiving event notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map((h: any) => (
            <div key={h.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{h.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${h.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {h.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 font-mono truncate mt-0.5">{h.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {h.events.map((e: string) => (
                      <span key={e} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{e}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button onClick={() => toggleActive.mutate({ id: h.id, active: !h.active })} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    {h.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => setDeliveryHookId(deliveryHookId === h.id ? null : h.id)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    Logs ({h._count?.deliveries ?? 0})
                  </button>
                  <button onClick={() => testHook.mutate(h.id)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Send test"><TestTube size={16} /></button>
                  <button onClick={() => openEdit(h)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">Edit</button>
                  <button onClick={() => remove.mutate(h.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
              {deliveryHookId === h.id && (
                <div className="mt-4 border-t border-gray-100 pt-4 space-y-2 max-h-60 overflow-y-auto">
                  {(deliveries as any[])?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No deliveries yet</p>}
                  {(deliveries as any[])?.map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 text-sm">
                      {d.success ? <CheckCircle size={14} className="text-green-500 shrink-0" /> : <XCircle size={14} className="text-red-500 shrink-0" />}
                      <span className="font-mono text-xs bg-gray-50 px-2 py-0.5 rounded">{d.event}</span>
                      <span className={`font-mono text-xs ${d.success ? 'text-green-600' : 'text-red-500'}`}>{d.status_code ?? 'err'}</span>
                      <span className="text-gray-400 text-xs">{new Date(d.delivered_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-black mb-5">{editHook ? 'Edit Webhook' : 'New Webhook'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="My Webhook" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Endpoint URL</label>
                <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Secret (optional)</label>
                <input type="password" value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Leave blank to keep existing" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Events</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {VALID_EVENTS.map(e => (
                    <label key={e} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.events.includes(e)} onChange={() => toggleEvent(e)} className="rounded" />
                      <span className="text-xs text-gray-700">{e}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setEditHook(null); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={submit} disabled={!form.name || !form.url || !form.events.length} className="flex-1 py-2.5 rounded-xl bg-[#005CDA] text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {editHook ? 'Save Changes' : 'Create Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
