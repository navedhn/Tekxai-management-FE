import React, { useState } from 'react';
import { Plus, CheckCircle, XCircle, Filter, BadgeCheck, Ban } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Modal from '@/components/ui/Modal';
import { Button, PageActionButton } from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetJobRequisitions, useGetJobRequisitionMeta, useCreateJobRequisition,
  useApproveJobRequisition, useRejectJobRequisition, useMarkJobRequisitionFilled,
  useCancelJobRequisition,
} from '@/services/jobRequisitionsService';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import PermissionGate from '@/components/ui/PermissionGate';
import { useMyPermissions } from '@/services/permissionsService';

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPROVED:  'bg-green-50 text-green-700 border-green-200',
  REJECTED:  'bg-red-50 text-red-700 border-red-200',
  FILLED:    'bg-teal-50 text-teal-700 border-teal-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-300',
};

const EMPTY_FORM = {
  title: '', department_id: '', business_unit_id: '', headcount: 1,
  employment_type: 'FULL_TIME', justification: '', target_start_date: '',
  budget_min: '', budget_max: '',
};

const JobRequisitionsPage: React.FC = () => {
  const toast = useToastContext();

  const { data: myPerms } = useMyPermissions();
  const isAdmin = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('hr.job_requisitions.approve');

  const [filters, setFilters] = useState<any>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [decisionComment, setDecisionComment] = useState('');

  const { data: result, isLoading } = useGetJobRequisitions(filters);
  const { data: meta } = useGetJobRequisitionMeta();
  const { data: departmentsData } = useGetDepartmentsQuery({});
  const { data: businessUnitsData } = useGetBusinessUnitsQuery({});

  const createMutation = useCreateJobRequisition();
  const approveMutation = useApproveJobRequisition();
  const rejectMutation = useRejectJobRequisition();
  const fillMutation = useMarkJobRequisitionFilled();
  const cancelMutation = useCancelJobRequisition();

  const records: any[] = result?.records || [];
  const statuses: string[] = meta?.statuses || [];
  const employmentTypes: string[] = meta?.employment_types || [];

  const deptOptions = Array.isArray(departmentsData)
    ? (departmentsData as any[]).map((d: any) => ({ value: d.id, label: d.name }))
    : [];
  const buOptions = Array.isArray(businessUnitsData)
    ? (businessUnitsData as any[]).map((b: any) => ({ value: b.id, label: b.name }))
    : [];

  const resetForm = () => setForm(EMPTY_FORM);

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.justification.trim()) { toast.error('Justification is required'); return; }
    createMutation.mutate(
      { ...form, headcount: +form.headcount, budget_min: form.budget_min || undefined, budget_max: form.budget_max || undefined },
      {
        onSuccess: () => { toast.success('Job requisition submitted for approval'); setCreateOpen(false); resetForm(); },
        onError: (e: any) => toast.error(e?.message || 'Failed to create job requisition'),
      },
    );
  };

  const openDecision = (id: string, action: 'APPROVED' | 'REJECTED') => {
    setDecisionId(id); setDecisionAction(action); setDecisionComment('');
  };

  const handleDecision = () => {
    if (!decisionId) return;
    if (decisionAction === 'REJECTED' && !decisionComment.trim()) {
      toast.error('A comment is required to reject a job requisition');
      return;
    }
    const mutation = decisionAction === 'APPROVED' ? approveMutation : rejectMutation;
    mutation.mutate({ id: decisionId, comment: decisionComment } as any, {
      onSuccess: () => { toast.success(decisionAction === 'APPROVED' ? 'Job requisition approved' : 'Job requisition rejected'); setDecisionId(null); setDecisionComment(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const handleMarkFilled = (id: string) => {
    fillMutation.mutate(id, {
      onSuccess: () => toast.success('Job requisition marked as filled'),
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id, {
      onSuccess: () => toast.success('Job requisition cancelled'),
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const columns: Column<any>[] = [
    {
      header: 'Title', key: 'title',
      render: r => (
        <div>
          <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
          <p className="text-xs text-gray-400">{r.employment_type?.replace(/_/g, ' ')}</p>
        </div>
      ),
    },
    {
      header: 'Department', key: 'department',
      render: r => <span className="text-sm text-gray-600">{r.department?.name || r.business_unit?.name || '—'}</span>,
    },
    {
      header: 'Headcount', key: 'headcount',
      render: r => <span className="text-sm font-semibold tabular-nums">{r.headcount}</span>,
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
      header: 'Requested By', key: 'requester',
      render: r => <span className="text-sm text-gray-700">{r.requester?.first_name} {r.requester?.last_name}</span>,
    },
    {
      header: 'Requested Date', key: 'created_at',
      render: r => <span className="text-sm text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span>,
    },
    {
      header: 'Actions', key: 'actions',
      render: r => (
        <div className="flex gap-1.5 flex-wrap">
          {r.status === 'PENDING' && (
            <PermissionGate permission="hr.job_requisitions.approve">
              <>
                <Button size="sm" variant="primary" animation="none" rounded={false} className="rounded-lg text-xs h-7 px-2 bg-green-600 hover:bg-green-700 border-0"
                  onClick={() => openDecision(r.id, 'APPROVED')}>
                  <CheckCircle size={11} className="mr-0.5" />Approve
                </Button>
                <Button size="sm" variant="outline" animation="none" rounded={false} className="rounded-lg text-xs h-7 px-2 text-red-500 border-red-200"
                  onClick={() => openDecision(r.id, 'REJECTED')}>
                  <XCircle size={11} className="mr-0.5" />Reject
                </Button>
              </>
            </PermissionGate>
          )}
          {r.status === 'APPROVED' && isAdmin && (
            <Button size="sm" variant="outline" animation="none" rounded={false} className="rounded-lg text-xs h-7 px-2 text-teal-700 border-teal-200"
              loading={fillMutation.isPending} onClick={() => handleMarkFilled(r.id)}>
              <BadgeCheck size={11} className="mr-0.5" />Mark Filled
            </Button>
          )}
          {['PENDING', 'APPROVED'].includes(r.status) && isAdmin && (
            <Button size="sm" variant="outline" animation="none" rounded={false} className="rounded-lg text-xs h-7 px-2 text-gray-500"
              loading={cancelMutation.isPending} onClick={() => handleCancel(r.id)}>
              <Ban size={11} className="mr-0.5" />Cancel
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
          <h1 className="text-2xl font-black text-gray-900">Job Requisitions</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Request approval to open a headcount before recruiting begins</p>
        </div>
        <PageActionButton leftIcon={Plus} onClick={() => setCreateOpen(true)}>
          New Requisition
        </PageActionButton>
      </div>

      <div className="flex flex-wrap gap-3">
        {statuses.map((s: string) => {
          const count = records.filter(r => r.status === s).length;
          return (
            <div key={s} className={cn('px-4 py-2 rounded-xl border text-sm font-bold cursor-pointer', filters.status === s ? 'bg-[#005CDA] text-white border-[#005CDA]' : 'bg-white text-gray-600 border-gray-200')}
              onClick={() => setFilters((f: any) => ({ ...f, status: f.status === s ? '' : s }))}>
              {s.replace(/_/g, ' ')} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </div>
          );
        })}
      </div>

      <Card className="flex flex-wrap gap-3 !py-3">
        <div className="w-44">
          <SearchableSelect options={deptOptions} value={filters.department_id || ''} onChange={v => setFilters((f: any) => ({ ...f, department_id: v }))} placeholder="Department" className="h-9 !rounded-xl" />
        </div>
        {filters.status || filters.department_id ? (
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setFilters({})}>
            <Filter size={13} className="mr-1" />Clear
          </Button>
        ) : null}
      </Card>

      <Card className="!p-0 overflow-hidden">
        <Table columns={columns} data={records} loading={isLoading} emptyMessage="No job requisitions found" className="border-0 shadow-none" />
      </Card>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Job Requisition" size="lg">
        <div className="flex flex-col gap-4 p-2">
          <Input label="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior Backend Developer" className="h-11 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <SearchableSelect label="Department" options={[{ value: '', label: 'None' }, ...deptOptions]} value={form.department_id} onChange={v => setForm(p => ({ ...p, department_id: String(v) }))} className="h-11 !rounded-xl" />
            <SearchableSelect label="Business Unit" options={[{ value: '', label: 'None' }, ...buOptions]} value={form.business_unit_id} onChange={v => setForm(p => ({ ...p, business_unit_id: String(v) }))} className="h-11 !rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Headcount" type="number" min={1} value={String(form.headcount)} onChange={e => setForm(p => ({ ...p, headcount: +e.target.value }))} className="h-11 rounded-xl" />
            <SearchableSelect label="Employment Type" options={employmentTypes.map((t: string) => ({ value: t, label: t.replace(/_/g, ' ') }))} value={form.employment_type} onChange={v => setForm(p => ({ ...p, employment_type: String(v) }))} className="h-11 !rounded-xl" />
          </div>
          <Textarea label="Justification *" value={form.justification} onChange={e => setForm(p => ({ ...p, justification: e.target.value }))} rows={3} placeholder="Why is this headcount needed?" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Target Start Date" type="date" value={form.target_start_date} onChange={e => setForm(p => ({ ...p, target_start_date: e.target.value }))} className="h-11 rounded-xl" />
            <Input label="Budget Min" type="number" value={form.budget_min} onChange={e => setForm(p => ({ ...p, budget_min: e.target.value }))} className="h-11 rounded-xl" placeholder="e.g. 80000" />
            <Input label="Budget Max" type="number" value={form.budget_max} onChange={e => setForm(p => ({ ...p, budget_max: e.target.value }))} className="h-11 rounded-xl" placeholder="e.g. 120000" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth animation="none" rounded={false} className="rounded-xl h-11" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" fullWidth animation="none" rounded={false} className="rounded-xl h-11" loading={createMutation.isPending} onClick={handleCreate}>Submit Requisition</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!decisionId} onClose={() => { setDecisionId(null); setDecisionComment(''); }} title={decisionAction === 'APPROVED' ? 'Approve Job Requisition' : 'Reject Job Requisition'} size="sm">
        <div className="flex flex-col gap-4 p-2">
          <Textarea
            label={decisionAction === 'REJECTED' ? 'Comment (required)' : 'Comment (optional)'}
            value={decisionComment}
            onChange={e => setDecisionComment(e.target.value)}
            rows={3}
            placeholder="Add a comment..."
          />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth animation="none" rounded={false} className="rounded-xl h-11" onClick={() => setDecisionId(null)}>Cancel</Button>
            <Button
              variant="primary" fullWidth animation="none" rounded={false}
              className={cn('rounded-xl h-11', decisionAction === 'REJECTED' ? 'bg-red-600 hover:bg-red-700 border-0' : '')}
              loading={approveMutation.isPending || rejectMutation.isPending}
              onClick={handleDecision}
            >
              {decisionAction === 'APPROVED' ? <><CheckCircle size={15} className="mr-1.5" />Approve</> : <><XCircle size={15} className="mr-1.5" />Reject</>}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default JobRequisitionsPage;
