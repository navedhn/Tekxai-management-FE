import React, { useState } from 'react';
import {
  CheckCircle, XCircle, Clock, AlertCircle, Package,
  FileText, CalendarDays, TrendingUp, DollarSign, Users,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Table, { Column } from '@/components/ui/Table';
import Select from '@/components/ui/Select';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetRequisitions, useApproveRequisition, useUpdateRequisitionStatus,
  useGetRequisitionStats, useUpdateRequisitionCost,
  useGetLeaves, useApproveLeave, useRejectLeave,
  useGetTicketStats,
} from '@/services/hrService';

// ── Status config ─────────────────────────────────────────────────────────────

const REQ_STATUS_STYLE: Record<string, string> = {
  DRAFT:        'bg-gray-50 text-gray-500',
  SUBMITTED:    'bg-blue-50 text-blue-700',
  APPROVED:     'bg-green-50 text-green-700',
  REJECTED:     'bg-red-50 text-red-700',
  PROCUREMENT:  'bg-purple-50 text-purple-700',
  FULFILLED:    'bg-teal-50 text-teal-700',
  ASSET_CREATED:'bg-indigo-50 text-indigo-700',
  CLOSED:       'bg-gray-100 text-gray-600',
};

const LEAVE_STATUS_STYLE: Record<string, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
  CANCELLED:'bg-gray-100 text-gray-500',
};

const TICKET_STATUS_STYLE: Record<string, string> = {
  pending:     'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  resolved:    'bg-green-50 text-green-700',
};

// ── Summary stat card ────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <Card className="flex items-center gap-4 p-5 rounded-2xl border-none shadow-lg">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
    </div>
  </Card>
);

// ── Approval history badge row ────────────────────────────────────────────────

const ApprovalTrail: React.FC<{ approvals: any[] }> = ({ approvals }) => {
  if (!approvals?.length) return <p className="text-xs text-gray-400 italic">No approval history</p>;
  return (
    <div className="flex flex-col gap-2 mt-1">
      {approvals.map((a: any, i: number) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span className={cn('px-2 py-0.5 rounded-full font-black',
            a.action === 'APPROVED' || a.action === 'ASSET_CREATED' ? 'bg-green-50 text-green-700' :
            a.action === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600')}>
            {a.action}
          </span>
          <span className="text-gray-600 font-medium">{a.approver?.first_name} {a.approver?.last_name}</span>
          <span className="text-gray-400">{new Date(a.created_at).toLocaleDateString()}</span>
          {a.comment && <span className="text-gray-500 italic">"{a.comment}"</span>}
        </div>
      ))}
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

const ApprovalsPage: React.FC = () => {
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState<'requisitions' | 'leaves' | 'tickets'>('requisitions');

  // Filters
  const [reqStatus, setReqStatus] = useState('SUBMITTED');
  const [leaveStatus, setLeaveStatus] = useState('PENDING');

  // Modals
  const [approveReqId, setApproveReqId] = useState<string | null>(null);
  const [approveAction, setApproveAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approveComment, setApproveComment] = useState('');
  const [statusReqId, setStatusReqId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [costReqId, setCostReqId] = useState<string | null>(null);
  const [costForm, setCostForm] = useState({ actual_cost: '', vendor_name: '', purchase_notes: '', invoice_reference: '', purchase_date: '' });
  const [leaveActionId, setLeaveActionId] = useState<string | null>(null);
  const [leaveAction, setLeaveAction] = useState<'approve' | 'reject'>('approve');
  const [leaveComment, setLeaveComment] = useState('');
  const [detailReq, setDetailReq] = useState<any | null>(null);

  // Queries
  const { data: reqData, isLoading: reqLoading } = useGetRequisitions({ status: reqStatus || undefined });
  const { data: reqStats } = useGetRequisitionStats();
  const { data: leaveData, isLoading: leaveLoading } = useGetLeaves({ status: leaveStatus || undefined });
  const { data: ticketStats } = useGetTicketStats();

  const approveMutation = useApproveRequisition();
  const statusMutation = useUpdateRequisitionStatus();
  const costMutation = useUpdateRequisitionCost();
  const approveLeaveMutation = useApproveLeave();
  const rejectLeaveMutation = useRejectLeave();

  const reqRecords: any[] = reqData?.records || [];
  const leaveRecords: any[] = leaveData?.records || [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleReqApprove = () => {
    if (!approveReqId) return;
    approveMutation.mutate({ id: approveReqId, action: approveAction, comment: approveComment, stage: 'MANAGER' }, {
      onSuccess: () => { toast.success(approveAction === 'APPROVED' ? 'Approved' : 'Rejected'); setApproveReqId(null); setApproveComment(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const handleStatusUpdate = () => {
    if (!statusReqId || !newStatus) return;
    statusMutation.mutate({ id: statusReqId, status: newStatus, comment: statusComment }, {
      onSuccess: () => { toast.success('Status updated'); setStatusReqId(null); setStatusComment(''); setNewStatus(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const handleCostUpdate = () => {
    if (!costReqId) return;
    costMutation.mutate({
      id: costReqId,
      ...costForm,
      actual_cost: costForm.actual_cost ? +costForm.actual_cost : undefined,
      purchase_date: costForm.purchase_date ? new Date(costForm.purchase_date).toISOString() : undefined,
    }, {
      onSuccess: () => { toast.success('Cost details saved'); setCostReqId(null); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const handleLeaveAction = () => {
    if (!leaveActionId) return;
    const fn = leaveAction === 'approve' ? approveLeaveMutation : rejectLeaveMutation;
    fn.mutate({ id: leaveActionId, comment: leaveComment }, {
      onSuccess: () => { toast.success(leaveAction === 'approve' ? 'Leave approved' : 'Leave rejected'); setLeaveActionId(null); setLeaveComment(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  // ── Columns ───────────────────────────────────────────────────────────────

  const REQ_STATUSES = ['DRAFT','SUBMITTED','APPROVED','REJECTED','PROCUREMENT','FULFILLED','ASSET_CREATED','CLOSED'];

  const reqColumns: Column<any>[] = [
    {
      header: 'Requisition', key: 'title',
      render: r => (
        <div>
          <button className="text-sm font-black text-primary-600 hover:underline text-left" onClick={() => setDetailReq(r)}>
            {r.title}
          </button>
          <p className="text-xs text-gray-400">{r.category?.replace(/_/g,' ')} · Qty {r.quantity}</p>
        </div>
      ),
    },
    {
      header: 'Requester', key: 'requester',
      render: r => (
        <div>
          <p className="text-sm font-semibold">{r.requester?.first_name} {r.requester?.last_name}</p>
          <p className="text-xs text-gray-400">{r.requester?.department?.name || r.department?.name || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Est. Cost', key: 'estimated_cost',
      render: r => (
        <div>
          <p className="text-sm font-black tabular-nums">{r.estimated_cost ? `PKR ${Number(r.estimated_cost).toLocaleString()}` : '—'}</p>
          {r.actual_cost && <p className="text-xs text-green-600 font-semibold">Actual: PKR {Number(r.actual_cost).toLocaleString()}</p>}
        </div>
      ),
    },
    {
      header: 'Status', key: 'status',
      render: r => <span className={cn('text-[10px] font-black px-2 py-1 rounded-full', REQ_STATUS_STYLE[r.status] || '')}>{r.status?.replace(/_/g,' ')}</span>,
    },
    {
      header: 'Approval Trail', key: 'approvals',
      render: r => <ApprovalTrail approvals={r.approvals} />,
    },
    {
      header: 'Actions', key: 'actions',
      render: r => (
        <div className="flex gap-1 flex-wrap">
          {r.status === 'SUBMITTED' && (
            <>
              <Button size="sm" variant="primary" animation="none" rounded={false}
                className="rounded-lg h-7 px-2 text-xs bg-green-600 hover:bg-green-700 border-0"
                onClick={() => { setApproveReqId(r.id); setApproveAction('APPROVED'); }}>
                <CheckCircle size={11} className="mr-0.5" />Approve
              </Button>
              <Button size="sm" variant="outline" animation="none" rounded={false}
                className="rounded-lg h-7 px-2 text-xs text-red-500 border-red-200"
                onClick={() => { setApproveReqId(r.id); setApproveAction('REJECTED'); }}>
                <XCircle size={11} className="mr-0.5" />Reject
              </Button>
            </>
          )}
          {['APPROVED','PROCUREMENT','FULFILLED'].includes(r.status) && (
            <>
              <Button size="sm" variant="outline" animation="none" rounded={false}
                className="rounded-lg h-7 px-2 text-xs"
                onClick={() => { setStatusReqId(r.id); setNewStatus(''); }}>
                <Clock size={11} className="mr-0.5" />Status
              </Button>
              <Button size="sm" variant="outline" animation="none" rounded={false}
                className="rounded-lg h-7 px-2 text-xs text-purple-600 border-purple-200"
                onClick={() => { setCostReqId(r.id); setCostForm({ actual_cost: r.actual_cost || '', vendor_name: r.vendor_name || '', purchase_notes: r.purchase_notes || '', invoice_reference: r.invoice_reference || '', purchase_date: r.purchase_date ? new Date(r.purchase_date).toISOString().split('T')[0] : '' }); }}>
                <DollarSign size={11} className="mr-0.5" />Cost
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const leaveColumns: Column<any>[] = [
    {
      header: 'Employee', key: 'user',
      render: r => (
        <div>
          <p className="text-sm font-semibold">{r.user?.first_name} {r.user?.last_name}</p>
          <p className="text-xs text-gray-400">{r.user?.email}</p>
        </div>
      ),
    },
    {
      header: 'Leave Type', key: 'policy',
      render: r => <span className="text-sm font-semibold">{r.policy?.name || '—'}</span>,
    },
    {
      header: 'Dates', key: 'dates',
      render: r => (
        <div>
          <p className="text-sm font-semibold">{new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}</p>
          <p className="text-xs text-gray-400">{r.days} day{r.days !== 1 ? 's' : ''}</p>
        </div>
      ),
    },
    {
      header: 'Reason', key: 'reason',
      render: r => <p className="text-xs text-gray-600 max-w-[180px] truncate" title={r.reason}>{r.reason || '—'}</p>,
    },
    {
      header: 'Status', key: 'status',
      render: r => <span className={cn('text-[10px] font-black px-2 py-1 rounded-full', LEAVE_STATUS_STYLE[r.status] || '')}>{r.status}</span>,
    },
    {
      header: 'Reviewer', key: 'reviewer',
      render: r => r.reviewed_by ? (
        <div>
          <p className="text-xs font-semibold text-gray-700">{r.reviewed_by}</p>
          {r.reviewed_at && <p className="text-[10px] text-gray-400">{new Date(r.reviewed_at).toLocaleDateString()}</p>}
          {r.manager_comment && <p className="text-[10px] text-gray-500 italic">"{r.manager_comment}"</p>}
        </div>
      ) : <span className="text-xs text-gray-400">—</span>,
    },
    {
      header: 'Actions', key: 'actions',
      render: r => r.status === 'PENDING' ? (
        <div className="flex gap-1">
          <Button size="sm" variant="primary" animation="none" rounded={false}
            className="rounded-lg h-7 px-2 text-xs bg-green-600 hover:bg-green-700 border-0"
            onClick={() => { setLeaveActionId(r.id); setLeaveAction('approve'); }}>
            <CheckCircle size={11} className="mr-0.5" />Approve
          </Button>
          <Button size="sm" variant="outline" animation="none" rounded={false}
            className="rounded-lg h-7 px-2 text-xs text-red-500 border-red-200"
            onClick={() => { setLeaveActionId(r.id); setLeaveAction('reject'); }}>
            <XCircle size={11} className="mr-0.5" />Reject
          </Button>
        </div>
      ) : null,
    },
  ];

  // ── Stat cards ────────────────────────────────────────────────────────────

  const bs = reqStats?.by_status || {};
  const ts = ticketStats?.by_status || {};

  return (
    <div className="flex flex-col gap-8 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Approvals & Operations</h1>
        <p className="text-sm text-gray-500 font-medium mt-0.5">Review pending approvals across requisitions, leaves, and support tickets.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Requisitions" value={bs.SUBMITTED || 0} icon={<Package size={20} className="text-blue-600" />} color="bg-blue-50" />
        <StatCard label="Approved Requisitions" value={bs.APPROVED || 0} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
        <StatCard label="Est. Spend (Total)" value={reqStats?.total_estimated ? `PKR ${Math.round(reqStats.total_estimated).toLocaleString()}` : '—'} icon={<DollarSign size={20} className="text-purple-600" />} color="bg-purple-50" />
        <StatCard label="Actual Spend" value={reqStats?.total_actual ? `PKR ${Math.round(reqStats.total_actual).toLocaleString()}` : '—'} icon={<TrendingUp size={20} className="text-teal-600" />} color="bg-teal-50" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Leaves" value={(leaveData?.records?.filter((r: any) => r.status === 'PENDING').length) || 0} icon={<CalendarDays size={20} className="text-amber-600" />} color="bg-amber-50" />
        <StatCard label="Pending Tickets" value={ts.pending || 0} icon={<AlertCircle size={20} className="text-red-600" />} color="bg-red-50" />
        <StatCard label="In Progress Tickets" value={ts.in_progress || 0} icon={<Clock size={20} className="text-yellow-600" />} color="bg-yellow-50" />
        <StatCard label="Resolved Tickets" value={ts.resolved || 0} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['requisitions', 'leaves', 'tickets'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-5 py-2.5 rounded-xl text-sm font-black transition-all border capitalize',
              activeTab === tab ? 'bg-primary-500 text-white border-primary-500 shadow-lg' : 'bg-white text-gray-500 border-gray-200 hover:border-primary-200')}>
            {tab}
            {tab === 'requisitions' && bs.SUBMITTED ? <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{bs.SUBMITTED}</span> : null}
            {tab === 'leaves' && leaveData?.records?.filter((r: any) => r.status === 'PENDING').length ? <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{leaveData.records.filter((r: any) => r.status === 'PENDING').length}</span> : null}
          </button>
        ))}
      </div>

      {/* Requisitions tab */}
      {activeTab === 'requisitions' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'SUBMITTED', 'APPROVED', 'PROCUREMENT', 'FULFILLED', 'REJECTED', 'CLOSED'].map(s => (
              <button key={s} onClick={() => setReqStatus(s)}
                className={cn('px-3 py-1.5 rounded-xl text-xs font-black border transition-all',
                  reqStatus === s ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-500 border-gray-200')}>
                {s || 'All'}
                {s && bs[s] ? <span className="ml-1 opacity-70">({bs[s]})</span> : null}
              </button>
            ))}
          </div>
          <Card className="!p-0 overflow-hidden rounded-2xl border-none shadow-xl">
            <Table columns={reqColumns} data={reqRecords} loading={reqLoading} emptyMessage="No requisitions found" className="border-0 shadow-none" />
          </Card>
        </div>
      )}

      {/* Leaves tab */}
      {activeTab === 'leaves' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
              <button key={s} onClick={() => setLeaveStatus(s)}
                className={cn('px-3 py-1.5 rounded-xl text-xs font-black border transition-all',
                  leaveStatus === s ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-500 border-gray-200')}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <Card className="!p-0 overflow-hidden rounded-2xl border-none shadow-xl">
            <Table columns={leaveColumns} data={leaveRecords} loading={leaveLoading} emptyMessage="No leave requests found" className="border-0 shadow-none" />
          </Card>
        </div>
      )}

      {/* Tickets tab */}
      {activeTab === 'tickets' && (
        <Card className="rounded-2xl border-none shadow-xl p-6">
          <p className="text-sm font-semibold text-gray-500 mb-5">Ticket summary — go to the full Tickets page for details and status updates.</p>
          <div className="grid grid-cols-3 gap-4">
            {[['pending','Pending',ts.pending,'bg-blue-50 text-blue-700'],['in_progress','In Progress',ts.in_progress,'bg-yellow-50 text-yellow-700'],['resolved','Resolved',ts.resolved,'bg-green-50 text-green-700']].map(([key, label, count, cls]) => (
              <div key={String(key)} className={cn('rounded-2xl p-5', String(cls))}>
                <p className="text-xs font-black uppercase tracking-widest opacity-70">{String(label)}</p>
                <p className="text-4xl font-black mt-1 tabular-nums">{count || 0}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-500 font-medium">
            <strong>Ticket design note:</strong> Support tickets in Tekxai ERP are a simple issue-tracking workflow (open → in progress → resolved). They do not use an approval flow — status changes are made directly by Admin/HR/Super Admin. Attachments can be added to any ticket via the Tickets page.
          </div>
        </Card>
      )}

      {/* Requisition detail modal */}
      <Modal isOpen={!!detailReq} onClose={() => setDetailReq(null)} title="Requisition Detail" size="lg">
        {detailReq && (
          <div className="flex flex-col gap-4 p-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Status</p><span className={cn('text-[11px] font-black px-2 py-0.5 rounded-full', REQ_STATUS_STYLE[detailReq.status] || '')}>{detailReq.status}</span></div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Priority</p><p className="font-semibold">{detailReq.priority}</p></div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Requester</p><p className="font-semibold">{detailReq.requester?.first_name} {detailReq.requester?.last_name}</p><p className="text-xs text-gray-400">{detailReq.requester?.department?.name}</p></div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Category</p><p className="font-semibold">{detailReq.category?.replace(/_/g,' ')}</p></div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Quantity</p><p className="font-semibold">{detailReq.quantity}</p></div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Needed By</p><p className="font-semibold">{detailReq.needed_by ? new Date(detailReq.needed_by).toLocaleDateString() : '—'}</p></div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Est. Cost</p><p className="font-black text-primary-600">{detailReq.estimated_cost ? `PKR ${Number(detailReq.estimated_cost).toLocaleString()}` : '—'}</p></div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Actual Cost</p><p className="font-black text-green-600">{detailReq.actual_cost ? `PKR ${Number(detailReq.actual_cost).toLocaleString()}` : '—'}</p></div>
              {detailReq.actual_cost && detailReq.estimated_cost && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Cost Variance</p>
                  {(() => { const diff = Number(detailReq.actual_cost) - Number(detailReq.estimated_cost); return <p className={`font-black ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>{diff > 0 ? '+' : ''}PKR {Math.abs(diff).toLocaleString()} {diff > 0 ? '(over budget)' : '(under budget)'}</p>; })()}
                </div>
              )}
            </div>
            {(detailReq.vendor_name || detailReq.purchase_date || detailReq.invoice_reference || detailReq.purchase_notes) && (
              <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Procurement Details</p>
                {detailReq.vendor_name && <p className="text-sm"><span className="font-semibold text-gray-600">Vendor:</span> {detailReq.vendor_name}</p>}
                {detailReq.purchase_date && <p className="text-sm"><span className="font-semibold text-gray-600">Purchase Date:</span> {new Date(detailReq.purchase_date).toLocaleDateString()}</p>}
                {detailReq.invoice_reference && <p className="text-sm"><span className="font-semibold text-gray-600">Invoice Ref:</span> {detailReq.invoice_reference}</p>}
                {detailReq.purchase_notes && <p className="text-sm"><span className="font-semibold text-gray-600">Notes:</span> {detailReq.purchase_notes}</p>}
              </div>
            )}
            {detailReq.description && (
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Description / Justification</p><p className="text-gray-700 bg-gray-50 rounded-xl p-3">{detailReq.description}</p></div>
            )}
            {detailReq.vendor_suggestion && (
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Vendor Suggestion</p><p className="font-medium">{detailReq.vendor_suggestion}</p></div>
            )}
            {detailReq.attachment_url && (
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Attachment</p><a href={detailReq.attachment_url} target="_blank" rel="noreferrer" className="text-primary-600 underline text-xs">View attachment</a></div>
            )}
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Approval History</p>
              <ApprovalTrail approvals={detailReq.approvals} />
            </div>
          </div>
        )}
      </Modal>

      {/* Req Approve/Reject Modal */}
      <Modal isOpen={!!approveReqId} onClose={() => { setApproveReqId(null); setApproveComment(''); }}
        title={approveAction === 'APPROVED' ? 'Approve Requisition' : 'Reject Requisition'} size="sm">
        <div className="flex flex-col gap-4 p-2">
          <Textarea label="Comment (optional)" value={approveComment} onChange={e => setApproveComment(e.target.value)} rows={3} placeholder="Add a comment..." />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth animation="none" rounded={false} className="rounded-xl h-11" onClick={() => setApproveReqId(null)}>Cancel</Button>
            <Button variant="primary" fullWidth animation="none" rounded={false}
              className={cn('rounded-xl h-11', approveAction === 'REJECTED' ? 'bg-red-600 hover:bg-red-700 border-0' : '')}
              loading={approveMutation.isPending} onClick={handleReqApprove}>
              {approveAction === 'APPROVED' ? <><CheckCircle size={15} className="mr-1.5" />Approve</> : <><XCircle size={15} className="mr-1.5" />Reject</>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status update modal */}
      <Modal isOpen={!!statusReqId} onClose={() => setStatusReqId(null)} title="Update Requisition Status" size="sm">
        <div className="flex flex-col gap-4 p-2">
          <Select label="New Status" options={REQ_STATUSES.filter(s => !['DRAFT','SUBMITTED'].includes(s)).map(s => ({ value: s, label: s.replace(/_/g,' ') }))}
            value={newStatus} onChange={v => setNewStatus(String(v))} placeholder="Select status" className="h-11 !rounded-xl" />
          <Textarea label="Comment" value={statusComment} onChange={e => setStatusComment(e.target.value)} rows={2} placeholder="Optional context..." />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth animation="none" rounded={false} className="rounded-xl h-11" onClick={() => setStatusReqId(null)}>Cancel</Button>
            <Button variant="primary" fullWidth animation="none" rounded={false} className="rounded-xl h-11" loading={statusMutation.isPending} onClick={handleStatusUpdate}>Update</Button>
          </div>
        </div>
      </Modal>

      {/* Cost update modal */}
      <Modal isOpen={!!costReqId} onClose={() => setCostReqId(null)} title="Record Actual Cost & Purchase Details" size="sm">
        <div className="flex flex-col gap-4 p-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-600 block mb-1.5 uppercase tracking-wide">Actual Cost (PKR)</label>
              <input type="number" className="w-full border border-gray-200 rounded-xl h-11 px-3 text-sm font-semibold" value={costForm.actual_cost} onChange={e => setCostForm(p => ({ ...p, actual_cost: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-black text-gray-600 block mb-1.5 uppercase tracking-wide">Vendor Name</label>
              <input className="w-full border border-gray-200 rounded-xl h-11 px-3 text-sm" value={costForm.vendor_name} onChange={e => setCostForm(p => ({ ...p, vendor_name: e.target.value }))} placeholder="e.g. Tech Corp" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-600 block mb-1.5 uppercase tracking-wide">Invoice Reference</label>
              <input className="w-full border border-gray-200 rounded-xl h-11 px-3 text-sm" value={costForm.invoice_reference} onChange={e => setCostForm(p => ({ ...p, invoice_reference: e.target.value }))} placeholder="INV-001" />
            </div>
            <div>
              <label className="text-xs font-black text-gray-600 block mb-1.5 uppercase tracking-wide">Purchase Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl h-11 px-3 text-sm" value={costForm.purchase_date} onChange={e => setCostForm(p => ({ ...p, purchase_date: e.target.value }))} />
            </div>
          </div>
          <Textarea label="Purchase Notes" value={costForm.purchase_notes} onChange={e => setCostForm(p => ({ ...p, purchase_notes: e.target.value }))} rows={2} placeholder="Any notes about the purchase..." />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth animation="none" rounded={false} className="rounded-xl h-11" onClick={() => setCostReqId(null)}>Cancel</Button>
            <Button variant="primary" fullWidth animation="none" rounded={false} className="rounded-xl h-11" loading={costMutation.isPending} onClick={handleCostUpdate}>
              <DollarSign size={15} className="mr-1.5" />Save Cost Details
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave approve/reject modal */}
      <Modal isOpen={!!leaveActionId} onClose={() => { setLeaveActionId(null); setLeaveComment(''); }}
        title={leaveAction === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'} size="sm">
        <div className="flex flex-col gap-4 p-2">
          <Textarea label="Comment (optional)" value={leaveComment} onChange={e => setLeaveComment(e.target.value)} rows={3} placeholder="Add a comment or rejection reason..." />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth animation="none" rounded={false} className="rounded-xl h-11" onClick={() => setLeaveActionId(null)}>Cancel</Button>
            <Button variant="primary" fullWidth animation="none" rounded={false}
              className={cn('rounded-xl h-11', leaveAction === 'reject' ? 'bg-red-600 hover:bg-red-700 border-0' : '')}
              loading={approveLeaveMutation.isPending || rejectLeaveMutation.isPending} onClick={handleLeaveAction}>
              {leaveAction === 'approve' ? <><CheckCircle size={15} className="mr-1.5" />Approve</> : <><XCircle size={15} className="mr-1.5" />Reject</>}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ApprovalsPage;
