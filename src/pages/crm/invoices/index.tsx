import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table, { Column } from '@/components/ui/Table';
import { Plus, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

const STATUS_OPTIONS = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
const STATUS_VARIANT: Record<string, any> = { DRAFT: 'default', SENT: 'warning', PAID: 'success', OVERDUE: 'error', CANCELLED: 'error' };

const fmt_date = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmt_usd  = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

function useInvoices() {
  return useQuery({
    queryKey: ['crm-invoices'],
    queryFn: () => apiRequest<any>('api/v1/crm/invoices'),
  });
}

function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest<any>('api/v1/crm/invoices', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-invoices'] });
      // Invoice totals feed the post-sales revenue dashboard.
      qc.invalidateQueries({ queryKey: ['crm-post-sales-dashboard'] });
    },
  });
}

function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest<any>(`api/v1/crm/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-invoices'] });
      qc.invalidateQueries({ queryKey: ['crm-post-sales-dashboard'] });
    },
  });
}

const CRMInvoices: React.FC = () => {
  const toast = useToastContext();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', currency: 'USD', due_date: '', notes: '', status: 'DRAFT' });

  const { data, isLoading } = useInvoices();
  const create = useCreateInvoice();
  const update = useUpdateInvoice();

  const records: any[] = (data as any)?.payload?.records ?? (data as any)?.records ?? [];

  const handleCreate = () => {
    if (!form.title || !form.amount) return toast.error('Title and amount are required');
    create.mutate({ ...form, amount: parseFloat(form.amount) }, {
      onSuccess: () => { toast.success('Invoice created'); setShowModal(false); setForm({ title: '', amount: '', currency: 'USD', due_date: '', notes: '', status: 'DRAFT' }); },
      onError: () => toast.error('Failed to create invoice'),
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    update.mutate({ id, status }, {
      onSuccess: () => toast.success('Invoice updated'),
      onError: () => toast.error('Update failed'),
    });
  };

  const columns: Column<any>[] = [
    { header: '#', key: 'invoice_number', render: i => <span className="font-black text-gray-600 text-xs">{i.invoice_number}</span> },
    { header: 'Title', key: 'title', render: i => <span className="font-bold text-gray-900">{i.title}</span> },
    { header: 'Client', key: 'client', render: i => <span className="font-medium text-gray-600">{i.client_account?.name || '—'}</span> },
    { header: 'Amount', key: 'amount', render: i => <span className="font-black text-green-600">{fmt_usd(i.amount)}</span> },
    { header: 'Due Date', key: 'due_date', render: i => <span className="font-medium text-gray-600">{fmt_date(i.due_date)}</span> },
    {
      header: 'Status', key: 'status', render: i => (
        <select
          value={i.status}
          onChange={e => handleStatusChange(i.id, e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 font-bold"
          onClick={e => e.stopPropagation()}
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">CRM Invoices</h1>
          <p className="text-sm text-gray-500 font-medium">Track invoices linked to clients and deals.</p>
        </div>
        <Button variant="primary" className="gap-2 rounded-xl" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Invoice
        </Button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        {STATUS_OPTIONS.slice(0, 3).map(s => {
          const items = records.filter(r => r.status === s);
          const total = items.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
          return (
            <Card key={s} className="p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
              <Badge variant={STATUS_VARIANT[s] || 'default'} className="mb-2 mx-auto">{s}</Badge>
              <div className="text-xl font-black text-gray-900">{fmt_usd(total)}</div>
              <div className="text-xs text-gray-400 font-medium">{items.length} invoice{items.length !== 1 ? 's' : ''}</div>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm border border-gray-100 rounded-2xl p-6">
        <Table columns={columns} data={records} isLoading={isLoading} emptyMessage="No invoices found." />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Invoice">
        <div className="flex flex-col gap-4 py-2">
          <Input label="TITLE *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-11 rounded-xl" placeholder="e.g. Website Development - Phase 1" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="AMOUNT *" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="h-11 rounded-xl" />
            <Select
              label="CURRENCY"
              options={[{ value: 'USD', label: 'USD' }, { value: 'PKR', label: 'PKR' }, { value: 'EUR', label: 'EUR' }]}
              value={form.currency}
              onChange={(v: string) => setForm(f => ({ ...f, currency: v }))}
              className="h-11 !rounded-xl"
            />
          </div>
          <Input label="DUE DATE" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-11 rounded-xl" />
          <div>
            <label className="text-xs font-black text-gray-600 uppercase tracking-wider">NOTES</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth className="h-11 rounded-xl" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" fullWidth className="h-11 rounded-xl" loading={create.isPending} onClick={handleCreate}>Create Invoice</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CRMInvoices;
