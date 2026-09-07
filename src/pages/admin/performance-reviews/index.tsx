import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button, { PageActionButton } from '@/components/ui/Button';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Modal from '@/components/ui/Modal';
import DatePicker from '@/components/ui/DatePicker';
import Input from '@/components/ui/Input';
import EmployeeSearchInput, { EmployeeSearchResult } from '@/components/ui/EmployeeSearchInput';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import {
  useReviews, useReviewPeriods, useCreateReview, useCreateReviewPeriod,
  PerformanceReview, ReviewStatus, Classification,
} from '@/services/performanceReviewsService';

const STATUS_STYLE: Record<ReviewStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  IN_REVIEW: 'bg-blue-50 text-blue-600',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
};

const CLASSIFICATION_LABEL: Record<Classification, string> = {
  INSUFFICIENT_EVIDENCE: 'Insufficient Evidence',
  STRONG_PERFORMANCE: 'Strong Performance',
  MEETS_EXPECTATIONS: 'Meets Expectations',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  PERFORMANCE_CONCERN: 'Performance Concern',
};

const CLASSIFICATION_STYLE: Record<Classification, string> = {
  INSUFFICIENT_EVIDENCE: 'bg-gray-100 text-gray-500',
  STRONG_PERFORMANCE: 'bg-emerald-50 text-emerald-700',
  MEETS_EXPECTATIONS: 'bg-blue-50 text-blue-600',
  NEEDS_IMPROVEMENT: 'bg-amber-50 text-amber-600',
  PERFORMANCE_CONCERN: 'bg-red-50 text-red-600',
};

const NewReviewModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const toast = useToastContext();
  const { data: periods = [] } = useReviewPeriods();
  const createReview = useCreateReview();
  const createPeriod = useCreateReviewPeriod();

  const [employee, setEmployee] = useState<EmployeeSearchResult | null>(null);
  const [periodId, setPeriodId] = useState('');
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  const [error, setError] = useState('');

  const handleCreatePeriod = () => {
    if (!newPeriodName.trim() || !newPeriodStart || !newPeriodEnd) {
      setError('Period name, start date, and end date are required');
      return;
    }
    createPeriod.mutate({ name: newPeriodName, start_date: newPeriodStart, end_date: newPeriodEnd }, {
      onSuccess: (res: any) => {
        setPeriodId(res?.payload?.id || res?.id);
        setShowNewPeriod(false);
        toast.success('Review period created');
      },
      onError: (e: any) => toast.error(e?.message || 'Failed to create review period'),
    });
  };

  const handleSubmit = () => {
    setError('');
    if (!employee) { setError('Select an employee'); return; }
    if (!periodId) { setError('Select (or create) a review period'); return; }
    createReview.mutate({ user_id: employee.id, review_period_id: periodId }, {
      onSuccess: () => { toast.success('Review created'); onClose(); setEmployee(null); setPeriodId(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed to create review'),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start a Performance Review" size="sm">
      <div className="flex flex-col gap-4 p-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Employee</label>
          <EmployeeSearchInput selected={employee} onSelect={setEmployee} onClear={() => setEmployee(null)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Review Period</label>
          <SearchableSelect
            options={periods.map((p) => ({ label: `${p.name} (${new Date(p.start_date).toLocaleDateString()} – ${new Date(p.end_date).toLocaleDateString()})`, value: p.id }))}
            value={periodId || null}
            onChange={(v) => setPeriodId(v ? String(v) : '')}
            placeholder="Select a review period"
            emptyMessage="No review periods yet"
          />
          <button type="button" onClick={() => setShowNewPeriod((s) => !s)} className="text-xs font-bold text-primary-600 hover:underline text-left ml-1">
            {showNewPeriod ? 'Cancel new period' : '+ Create a new review period'}
          </button>
        </div>

        {showNewPeriod && (
          <div className="flex flex-col gap-3 p-3 bg-gray-50/60 rounded-2xl border border-gray-100">
            <Input label="Period Name" value={newPeriodName} onChange={(e) => setNewPeriodName(e.target.value)} placeholder="e.g. Q1 2026, or any label" className="h-11 rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <DatePicker label="Start Date" value={newPeriodStart} onChange={setNewPeriodStart} />
              <DatePicker label="End Date" value={newPeriodEnd} onChange={setNewPeriodEnd} />
            </div>
            <Button onClick={handleCreatePeriod} disabled={createPeriod.isPending} className="h-10 bg-primary-500 text-white rounded-xl text-xs font-bold">
              {createPeriod.isPending ? 'Creating…' : 'Create Period'}
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11 rounded-xl font-bold">Cancel</Button>
          <Button onClick={handleSubmit} disabled={createReview.isPending} className="flex-1 h-11 bg-primary-600 text-white rounded-xl font-bold disabled:opacity-50">
            {createReview.isPending ? 'Starting…' : 'Start Review'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const PerformanceReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<{ review_period_id?: string; status?: string; department_id?: string; business_unit_id?: string }>({});
  const [showNew, setShowNew] = useState(false);

  const { data: reviews = [], isLoading } = useReviews(filters as any);
  const { data: periods = [] } = useReviewPeriods();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const { data: businessUnits = [] } = useGetBusinessUnitsQuery();

  const columns: Column<PerformanceReview>[] = [
    {
      header: 'Employee',
      key: 'user',
      render: (item) => (
        <button onClick={() => navigate(`/admin/performance-reviews/${item.id}`)} className="text-left">
          <span className="text-sm font-bold text-gray-900 hover:underline">{`${item.user.first_name || ''} ${item.user.last_name || ''}`.trim()}</span>
        </button>
      ),
    },
    {
      header: 'Role',
      key: 'designation',
      render: (item) => item.designation?.name || <span className="text-xs text-gray-400 italic">—</span>,
    },
    {
      header: 'Review Period',
      key: 'review_period',
      render: (item) => item.review_period?.name || <span className="text-xs text-gray-400 italic">—</span>,
    },
    {
      header: 'Reviewer',
      key: 'reviewer',
      render: (item) => `${item.reviewer.first_name || ''} ${item.reviewer.last_name || ''}`.trim(),
    },
    {
      header: 'Status',
      key: 'status',
      render: (item) => (
        <Badge variant="info" className={`rounded-lg px-2.5 py-1 text-[10px] font-black tracking-tight border-none ${STATUS_STYLE[item.status]}`}>
          {item.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Classification',
      key: 'classification',
      render: (item) => item.classification
        ? <Badge variant="info" className={`rounded-lg px-2.5 py-1 text-[10px] font-black tracking-tight border-none ${CLASSIFICATION_STYLE[item.classification]}`}>{CLASSIFICATION_LABEL[item.classification]}</Badge>
        : <span className="text-xs text-gray-400 italic">Not yet classified</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <NewReviewModal isOpen={showNew} onClose={() => setShowNew(false)} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><ClipboardList size={22} className="text-primary-500" /> Performance Reviews</h1>
          <p className="text-sm text-gray-400 mt-0.5">Evidence-based employee delivery, attendance, and QA review — no automatic scoring.</p>
        </div>
        <PageActionButton leftIcon={Plus} onClick={() => setShowNew(true)}>New Review</PageActionButton>
      </div>

      <Card isLoading={isLoading} className="flex flex-col gap-6 shadow-2xl border-none">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SearchableSelect
            placeholder="All Periods"
            options={periods.map((p) => ({ label: p.name, value: p.id }))}
            value={filters.review_period_id || null}
            onChange={(v) => setFilters((f) => ({ ...f, review_period_id: v ? String(v) : undefined }))}
          />
          <SearchableSelect
            placeholder="All Statuses"
            options={[
              { label: 'Draft', value: 'DRAFT' },
              { label: 'In Review', value: 'IN_REVIEW' },
              { label: 'Completed', value: 'COMPLETED' },
            ]}
            value={filters.status || null}
            onChange={(v) => setFilters((f) => ({ ...f, status: v ? String(v) : undefined }))}
          />
          <SearchableSelect
            placeholder="All Departments"
            options={(departments || []).map((d: any) => ({ label: d.name, value: d.id }))}
            value={filters.department_id || null}
            onChange={(v) => setFilters((f) => ({ ...f, department_id: v ? String(v) : undefined }))}
          />
          <SearchableSelect
            placeholder="All Business Units"
            options={(businessUnits || []).map((bu: any) => ({ label: bu.name, value: bu.id }))}
            value={filters.business_unit_id || null}
            onChange={(v) => setFilters((f) => ({ ...f, business_unit_id: v ? String(v) : undefined }))}
          />
        </div>

        <Table columns={columns} data={reviews} isLoading={isLoading} emptyMessage="No performance reviews found." />
      </Card>
    </div>
  );
};

export default PerformanceReviewsPage;
