import React, { useState } from 'react';
import { Plus, Filter, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetRequisitions, useGetRequisitionMeta, useCreateRequisition,
  useSubmitRequisition, useApproveRequisition, useUpdateRequisitionStatus,
  useConvertRequisitionToAsset,
} from '@/services/hrService';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useAuth } from '@/hooks/useAuth';
import PermissionGate from '@/components/ui/PermissionGate';

const STATUS_STYLES: Record<string, string> = {
  DRAFT:        'bg-gray-50 text-gray-500 border-gray-200',
  SUBMITTED:    'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED:     'bg-green-50 text-green-700 border-green-200',
  REJECTED:     'bg-red-50 text-red-700 border-red-200',
  PROCUREMENT:  'bg-purple-50 text-purple-700 border-purple-200',
  FULFILLED:    'bg-teal-50 text-teal-700 border-teal-200',
  ASSET_CREATED:'bg-indigo-50 text-indigo-700 border-indigo-200',
  CLOSED:       'bg-gray-100 text-gray-500 border-gray-300',
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW:    'bg-gray-50 text-gray-400',
  MEDIUM: 'bg-yellow-50 text-yellow-700',
  HIGH:   'bg-orange-50 text-orange-700',
  URGENT: 'bg-red-50 text-red-700',
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR'];

const RequisitionsPage: React.FC = () => {
  const toast = useToastContext();
  const { user } = useAuth();
  const isAdmin = ADMIN_ROLES.includes((user as any)?.role_name || (user as any)?.role || '');

  const [filters, setFilters] = useState<any>({ mine: isAdmin ? '' : 'true' });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveAction, setApproveAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approveComment, setApproveComment] = useState('');
  const [newStatusFor, setNewStatusFor] = useState<string | null>(null);
  const [newStatusVal, setNewStatusVal] = useState('');
  const [newStatusComment, setNewStatusComment] = useState('');

  const [form, setForm] = useState({
    title: '', category: 'OTHER', description: '', quantity: 1,
    estimated_cost: '', priority: 'MEDIUM', vendor_suggestion: '',
    needed_by: '', delivery_location: '', convert_to_asset: false, department_id: '',
  });

  const { data: result, isLoading } = useGetRequisitions(filters);
  const { data: meta } = useGetRequisitionMeta();
  const { data: departmentsData } = useGetDepartmentsQuery({});
  const createMutation = useCreateRequisition();
  const submitMutation = useSubmitRequisition();
  const approveMutation = useApproveRequisition();
  const statusMutation = useUpdateRequisitionStatus();
  const convertMutation = useConvertRequisitionToAsset();

  const records: any[] = result?.records || [];
  const statuses = meta?.statuses || [];
  const categories = meta?.categories || [];
  const priorities = meta?.priorities || [];

  const deptOptions = Array.isArray(departmentsData)
    ? (departmentsData as any[]).map((d: any) => ({ value: d.id, label: d.name }))
    : [];

  const handleCreate = () => {
    if (!form.title) { toast.error('Title is required'); return; }
    createMutation.mutate({ ...form, quantity: +form.quantity, estimated_cost: form.estimated_cost ? +form.estimated_cost : undefined }, {
      onSuccess: () => { toast.success('Requisition created'); setCreateOpen(false); setForm({ title: '', category: 'OTHER', description: '', quantity: 1, estimated_cost: '', priority: 'MEDIUM', vendor_suggestion: '', needed_by: '', delivery_location: '', convert_to_asset: false, department_id: '' }); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const handleSubmit = (id: string) => {
    submitMutation.mutate(id, {
      onSuccess: () => toast.success('Requisition submitted'),
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const handleApprove = () => {
    if (!approveId) return;
    approveMutation.mutate({ id: approveId, action: approveAction, comment: approveComment, stage: 'MANAGER' }, {
      onSuccess: () => { toast.success(approveAction === 'APPROVED' ? 'Approved' : 'Rejected'); setApproveId(null); setApproveComment(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const handleStatusUpdate = () => {
    if (!newStatusFor || !newStatusVal) return;
    statusMutation.mutate({ id: newStatusFor, status: newStatusVal, comment: newStatusComment }, {
      onSuccess: () => { toast.success('Status updated'); setNewStatusFor(null); setNewStatusComment(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const columns: Column<any>[] = [
    {
      header: 'Requisition', key: 'title',
      render: r => (
        <div>
          <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
          <p className="text-xs text-gray-400">{r.category?.replace(/_/g, ' ')} · Qty: {r.quantity}</p>
        </div>
      ),
    },
    {
      header: 'Requester', key: 'requester',
      render: r => (
        <div>
          <p className="text-sm font-semibold text-gray-800">{r.requester?.first_name} {r.requester?.last_name}</p>
          <p className="text-xs text-gray-400">{r.requester?.department?.name || r.department?.name || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Priority', key: 'priority',
      render: r => (
        <span className={cn('text-[10px] font-black px-2 py-1 rounded-full', PRIORITY_STYLES[r.priority] || '')}>
          {r.priority}
        </span>
      ),
    },
    {
      header: 'Est. Cost', key: 'estimated_cost',
      render: r => <span className="text-sm font-semibold tabular-nums">{r.estimated_cost ? `PKR ${Number(r.estimated_cost).toLocaleString()}` : '—'}</span>,
    },
    {
      header: 'Needed By', key: 'needed_by',
      render: r => <span className="text-sm text-gray-500">{r.needed_by ? new Date(r.needed_by).toLocaleDateString() : '—'}</span>,
    },
    {
      header: 'Status', key: 'status',
      render: r => (
        <Badge className={cn('border text-[10px] font-black px-2 py-0.5 rounded-full', STATUS_STYLES[r.status] || '')}>
          {r.status?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      header: 'Actions', key: 'actions',
      render: r => (
        <div className="flex gap-1.5 flex-wrap">
          {r.status === 'DRAFT' && (
            <Button size="sm" variant="outline" animation="none" rounded={false} className="rounded-lg text-xs h-7 px-2" onClick={() => handleSubmit(r.id)} loading={submitMutation.isPending}>
              Submit
            </Button>
          )}
          {isAdmin && r.status === 'SUBMITTED' && (
            <PermissionGate permission="erp.requisitions.approve">
              <>
                <Button size="sm" variant="primary" animation="none" rounded={false} className="rounded-lg text-xs h-7 px-2 bg-green-600 hover:bg-green-700 border-0"
                  onClick={() => { setApproveId(r.id); setApproveAction('APPROVED'); }}>
                  <CheckCircle size={11} className="mr-0.5" />Approve
                </Button>
                <Button size="sm" variant="outline" animation="none" rounded={false} className="rounded-lg text-xs h-7 px-2 text-red-500 border-red-200"
                  onClick={() => { setApproveId(r.id); setApproveAction('REJECTED'); }}>
                  <XCircle size={11} className="mr-0.5" />Reject
                </Button>
              </>
            </PermissionGate>
          )}
          {isAdmin && ['APPROVED', 'PROCUREMENT', 'FULFILLED'].includes(r.status) && (
            <Button size="sm" variant="outline" animation="none" rounded={false} className="rounded-lg text-xs h-7 px-2"
              onClick={() => { setNewStatusFor(r.id); setNewStatusVal(''); }}>
              <Clock size={11} className="mr-0.5" />Status
            </Button>
          )}
          {isAdmin && r.convert_to_asset && !r.linked_asset_id && ['APPROVED', 'PROCUREMENT', 'FULFILLED'].includes(r.status) && (
            <Button
              size="sm" variant="primary" animation="none" rounded={false}
              className="rounded-lg text-xs h-7 px-2 bg-indigo-600 hover:bg-indigo-700 border-0"
              loading={convertMutation.isPending}
              onClick={() => convertMutation.mutate({ id: r.id }, {
                onSuccess: () => toast.success('Requisition converted to asset'),
                onError: (e: any) => toast.error(e?.message || 'Conversion failed'),
              })}
            >
              <Package size={11} className="mr-0.5" />Convert to Asset
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Requisitions</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Manage internal procurement requests</p>
        </div>
        <Button variant="primary" animation="none" rounded={false} className="rounded-xl" onClick={() => setCreateOpen(true)}>
          <Plus size={15} className="mr-1.5" />New Requisition
        </Button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {['SUBMITTED', 'APPROVED', 'PROCUREMENT', 'FULFILLED'].map(s => {
          const count = records.filter(r => r.status === s).length;
          return (
            <div key={s} className={cn('px-4 py-2 rounded-xl border text-sm font-bold cursor-pointer', filters.status === s ? 'bg-[#005CDA] text-white border-[#005CDA]' : 'bg-white text-gray-600 border-gray-200')}
              onClick={() => setFilters((f: any) => ({ ...f, status: f.status === s ? '' : s }))}>
              {s.replace(/_/g, ' ')} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="flex flex-wrap gap-3 !py-3">
        {isAdmin && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="mine" checked={filters.mine === 'true'} onChange={e => setFilters((f: any) => ({ ...f, mine: e.target.checked ? 'true' : '' }))} className="rounded" />
            <label htmlFor="mine" className="text-sm font-semibold text-gray-700">My Requisitions Only</label>
          </div>
        )}
        <div className="w-36">
          <Select options={categories} value={filters.category || ''} onChange={v => setFilters((f: any) => ({ ...f, category: v }))} placeholder="Category" className="h-9 !rounded-xl" />
        </div>
        <div className="w-32">
          <Select options={priorities.map((p: string) => ({ value: p, label: p }))} value={filters.priority || ''} onChange={v => setFilters((f: any) => ({ ...f, priority: v }))} placeholder="Priority" className="h-9 !rounded-xl" />
        </div>
        {(filters.category || filters.priority || filters.status) && (
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setFilters(isAdmin ? {} : { mine: 'true' })}>
            <Filter size={13} className="mr-1" />Clear
          </Button>
        )}
      </Card>

      <Card className="!p-0 overflow-hidden">
        <Table columns={columns} data={records} loading={isLoading} emptyMessage="No requisitions found" className="border-0 shadow-none" />
      </Card>

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Requisition" size="lg">
        <div className="flex flex-col gap-4 p-2">
          <Input label="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Dell Laptop for Developer" className="h-11 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={categories} value={form.category} onChange={v => setForm(p => ({ ...p, category: String(v) }))} className="h-11 !rounded-xl" />
            <Select label="Priority" options={priorities.map((p: string) => ({ value: p, label: p }))} value={form.priority} onChange={v => setForm(p => ({ ...p, priority: String(v) }))} className="h-11 !rounded-xl" />
          </div>
          <Textarea label="Description / Justification" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Explain why this is needed..." />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Quantity" type="number" min={1} value={String(form.quantity)} onChange={e => setForm(p => ({ ...p, quantity: +e.target.value }))} className="h-11 rounded-xl" />
            <Input label="Est. Cost (PKR)" type="number" value={form.estimated_cost} onChange={e => setForm(p => ({ ...p, estimated_cost: e.target.value }))} className="h-11 rounded-xl" />
            <Input label="Needed By" type="date" value={form.needed_by} onChange={e => setForm(p => ({ ...p, needed_by: e.target.value }))} className="h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Department" options={[{ value: '', label: 'None' }, ...deptOptions]} value={form.department_id} onChange={v => setForm(p => ({ ...p, department_id: String(v) }))} className="h-11 !rounded-xl" />
            <Input label="Delivery Location" value={form.delivery_location} onChange={e => setForm(p => ({ ...p, delivery_location: e.target.value }))} className="h-11 rounded-xl" />
          </div>
          <Input label="Vendor Suggestion (optional)" value={form.vendor_suggestion} onChange={e => setForm(p => ({ ...p, vendor_suggestion: e.target.value }))} className="h-11 rounded-xl" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="convert_asset" checked={form.convert_to_asset} onChange={e => setForm(p => ({ ...p, convert_to_asset: e.target.checked }))} className="rounded" />
            <label htmlFor="convert_asset" className="text-sm font-semibold text-gray-700">Convert to company asset after fulfillment</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth animation="none" rounded={false} className="rounded-xl h-11" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" fullWidth animation="none" rounded={false} className="rounded-xl h-11" loading={createMutation.isPending} onClick={handleCreate}>Create Requisition</Button>
          </div>
        </div>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal isOpen={!!approveId} onClose={() => { setApproveId(null); setApproveComment(''); }} title={approveAction === 'APPROVED' ? 'Approve Requisition' : 'Reject Requisition'} size="sm">
        <div className="flex flex-col gap-4 p-2">
          <Textarea label="Comment (optional)" value={approveComment} onChange={e => setApproveComment(e.target.value)} rows={3} placeholder="Add a comment..." />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth animation="none" rounded={false} className="rounded-xl h-11" onClick={() => setApproveId(null)}>Cancel</Button>
            <Button
              variant="primary" fullWidth animation="none" rounded={false}
              className={cn('rounded-xl h-11', approveAction === 'REJECTED' ? 'bg-red-600 hover:bg-red-700 border-0' : '')}
              loading={approveMutation.isPending} onClick={handleApprove}>
              {approveAction === 'APPROVED' ? <><CheckCircle size={15} className="mr-1.5" />Approve</> : <><XCircle size={15} className="mr-1.5" />Reject</>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Update Modal */}
      <Modal isOpen={!!newStatusFor} onClose={() => setNewStatusFor(null)} title="Update Requisition Status" size="sm">
        <div className="flex flex-col gap-4 p-2">
          <Select
            label="New Status"
            options={statuses.filter((s: string) => !['DRAFT', 'SUBMITTED'].includes(s)).map((s: string) => ({ value: s, label: s.replace(/_/g, ' ') }))}
            value={newStatusVal}
            onChange={v => setNewStatusVal(String(v))}
            placeholder="Select status"
            className="h-11 !rounded-xl"
          />
          <Textarea label="Comment (optional)" value={newStatusComment} onChange={e => setNewStatusComment(e.target.value)} rows={2} placeholder="Add context..." />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth animation="none" rounded={false} className="rounded-xl h-11" onClick={() => setNewStatusFor(null)}>Cancel</Button>
            <Button variant="primary" fullWidth animation="none" rounded={false} className="rounded-xl h-11" loading={statusMutation.isPending} onClick={handleStatusUpdate}>Update</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RequisitionsPage;
