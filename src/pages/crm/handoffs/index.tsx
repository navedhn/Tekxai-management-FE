import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Plus, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PENDING:    'warning',
  IN_REVIEW:  'default',
  ACCEPTED:   'success',
  REJECTED:   'error',
  PROJECT_CREATED: 'success',
};

function useHandoffs(filters: any) {
  return useQuery({
    queryKey: ['crm-handoffs', filters],
    queryFn: () => apiRequest<any>('api/v1/crm/handoffs'),
  });
}

function useCreateHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest<any>('api/v1/crm/handoffs', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-handoffs'] });
      // A handoff moves a lead from pre-sales pipeline into post-sales —
      // both dashboards' aggregates change.
      qc.invalidateQueries({ queryKey: ['crm-dashboard'] });
      qc.invalidateQueries({ queryKey: ['crm-post-sales-dashboard'] });
    },
  });
}

function useUpdateHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest<any>(`api/v1/crm/handoffs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-handoffs'] });
      qc.invalidateQueries({ queryKey: ['crm-dashboard'] });
      qc.invalidateQueries({ queryKey: ['crm-post-sales-dashboard'] });
    },
  });
}

const fmt_date = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmt_usd  = (v: number) => v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : '—';

const CRMHandoffs: React.FC = () => {
  const toast = useToastContext();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    lead_source: 'upwork', lead_id: '', lead_title: '', client_name: '',
    contact_email: '', contact_phone: '', deal_value: '', currency: 'USD',
    notes: '',
  });

  const { data, isLoading } = useHandoffs({});
  const create = useCreateHandoff();
  const update = useUpdateHandoff();
  const records: any[] = (data as any)?.payload?.records ?? (data as any)?.records ?? [];

  const handleCreate = () => {
    if (!form.lead_title) return toast.error('Lead title is required');
    create.mutate({ ...form, deal_value: form.deal_value ? parseFloat(form.deal_value) : undefined }, {
      onSuccess: () => { toast.success('Handoff created'); setShowModal(false); setForm({ lead_source: 'upwork', lead_id: '', lead_title: '', client_name: '', contact_email: '', contact_phone: '', deal_value: '', currency: 'USD', notes: '' }); },
      onError: () => toast.error('Failed to create handoff'),
    });
  };

  const handleStatus = (id: string, status: string) => {
    update.mutate({ id, status }, {
      onSuccess: () => toast.success(`Handoff marked as ${status}`),
      onError: () => toast.error('Failed to update'),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">ERP Handoffs</h1>
          <p className="text-sm text-gray-500 font-medium">Transfer won deals from CRM to ERP for project delivery.</p>
        </div>
        <Button variant="primary" className="gap-2 rounded-xl" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Handoff
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : records.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border border-gray-100">
          <ArrowRight size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-bold">No handoffs yet. Create one when a CRM deal is ready for delivery.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map((h: any) => (
            <Card key={h.id} className="p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-black text-gray-900">{h.lead_title}</div>
                  <div className="text-xs text-gray-400 font-medium mt-0.5">{h.client_name || 'No client name'}</div>
                </div>
                <Badge variant={STATUS_COLORS[h.status] || 'default'} className="text-[10px] font-black uppercase">
                  {h.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">Source</div>
                  <div className="text-sm font-black text-gray-700 capitalize">{h.lead_source}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">Deal Value</div>
                  <div className="text-sm font-black text-green-600">{fmt_usd(h.deal_value)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">Date</div>
                  <div className="text-sm font-black text-gray-700">{fmt_date(h.created_at)}</div>
                </div>
              </div>

              {h.notes && (
                <p className="text-xs text-gray-500 font-medium bg-gray-50 rounded-xl p-3">{h.notes}</p>
              )}

              {h.project && (
                <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                  <CheckCircle size={14} />
                  Linked to project: {h.project.title}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-bold flex-1">
                  Assigned to: {h.assigned_to ? `${h.assigned_to.first_name} ${h.assigned_to.last_name}` : 'Unassigned'}
                </span>
                {h.status === 'PENDING' && (
                  <button
                    onClick={() => handleStatus(h.id, 'ACCEPTED')}
                    className="text-xs font-black text-green-600 hover:text-green-700 bg-green-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                )}
                {h.status === 'ACCEPTED' && !h.project_id && (
                  <button
                    onClick={() => handleStatus(h.id, 'PROJECT_CREATED')}
                    className="text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    Mark Project Created
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New ERP Handoff">
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                label="LEAD TITLE *"
                value={form.lead_title}
                onChange={e => setForm(f => ({ ...f, lead_title: e.target.value }))}
                placeholder="e.g. E-commerce Website Project"
                className="h-11 rounded-xl"
              />
            </div>
            <Input label="CLIENT NAME" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="h-11 rounded-xl" />
            <Input label="DEAL VALUE (USD)" type="number" value={form.deal_value} onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))} className="h-11 rounded-xl" />
            <Input label="CONTACT EMAIL" type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className="h-11 rounded-xl" />
            <Input label="CONTACT PHONE" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} className="h-11 rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-black text-gray-600 uppercase tracking-wider">LEAD SOURCE</label>
            <select
              value={form.lead_source}
              onChange={e => setForm(f => ({ ...f, lead_source: e.target.value }))}
              className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700"
            >
              <option value="upwork">Upwork</option>
              <option value="linkedin">LinkedIn</option>
              <option value="email">Email</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-gray-600 uppercase tracking-wider">NOTES</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 resize-none"
              placeholder="Delivery notes, requirements, context..."
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth className="h-11 rounded-xl" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" fullWidth className="h-11 rounded-xl" loading={create.isPending} onClick={handleCreate}>
              Create Handoff
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CRMHandoffs;
