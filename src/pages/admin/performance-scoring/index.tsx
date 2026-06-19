import React, { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button, { pageActionButtonClass, pageOutlineButtonClass } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import ActionModal from '@/components/ui/ActionModal';
import ScoringConfigPanel from '@/components/performance/ScoringConfigPanel';
import EmployeePerformanceModal from '@/components/performance/EmployeePerformanceModal';
import DashboardStatCard from '@/components/ui/DashboardStatCard';
import {
  useDeletePerformanceMutation,
  useGetPerformanceRecords,
  useGetPerformanceConfig,
  getPerformancePeriods,
} from '@/services/performanceScoringService';
import { EmployeePerformanceRecord } from '@/types/performanceScoring';
import {
  formatPkrAmount,
  getCurrentPeriod,
  getScoreGrade,
  getMaxTotalScore,
} from '@/utils/performanceScoring';
import { useDebounce } from '@/hooks/useDebounce';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';
import {
  Award,
  Plus,
  Search,
  Edit2,
  Trash2,
  TrendingUp,
  Wallet,
  Users,
} from 'lucide-react';

const PerformanceScoringPage: React.FC = () => {
  const toast = useToastContext();
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [search, setSearch] = useState('');
  const [showCriteria, setShowCriteria] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmployeePerformanceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeePerformanceRecord | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { data: allRecords = [], isLoading } = useGetPerformanceRecords();
  const { data: periodRecords = [], isLoading: periodLoading } = useGetPerformanceRecords(period);
  const deleteMutation = useDeletePerformanceMutation();

  const { data: config } = useGetPerformanceConfig();
  const criteria = config?.criteria ?? [];
  const maxTotal = getMaxTotalScore(criteria) || 100;

  const periods = useMemo(() => getPerformancePeriods(allRecords), [allRecords]);

  const filteredRecords = useMemo(() => {
    if (!debouncedSearch) return periodRecords;
    const q = debouncedSearch.toLowerCase();
    return periodRecords.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.employeeEmail.toLowerCase().includes(q)
    );
  }, [periodRecords, debouncedSearch]);

  const stats = useMemo(() => {
    const scored = periodRecords.length;
    const avgScore =
      scored > 0
        ? Math.round((periodRecords.reduce((s, r) => s + r.totalScore, 0) / scored) * 10) / 10
        : 0;
    const totalBonus = periodRecords.reduce((s, r) => s + r.bonusAmount, 0);
    const penalties = periodRecords.filter((r) => r.bonusAmount < 0).length;
    return { scored, avgScore, totalBonus, penalties };
  }, [periodRecords]);

  const handleAdd = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const handleEdit = (record: EmployeePerformanceRecord) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Performance record deleted');
        setDeleteTarget(null);
      },
      onError: () => toast.error('Failed to delete record'),
    });
  };

  const columns: Column<EmployeePerformanceRecord>[] = [
    {
      header: 'Employee',
      key: 'employeeName',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-black text-gray-900">{item.employeeName}</span>
          <span className="text-xs text-gray-400 font-semibold">{item.department}</span>
        </div>
      ),
    },
    ...criteria.map((c) => ({
      header: c.shortLabel,
      key: c.key,
      width: '72px',
      render: (item: EmployeePerformanceRecord) => (
        <span className="text-sm font-bold text-gray-700 tabular-nums">{item.scores[c.key]}</span>
      ),
    })),
    {
      header: 'Total',
      key: 'totalScore',
      width: '80px',
      render: (item) => {
        const grade = getScoreGrade(item.totalScore, maxTotal);
        return (
          <span className={cn('inline-flex rounded-lg border px-2 py-0.5 text-xs font-black tabular-nums', grade.color)}>
            {item.totalScore}
          </span>
        );
      },
    },
    {
      header: 'Bonus / Penalty',
      key: 'bonusAmount',
      render: (item) => (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-black text-sm tabular-nums',
              item.bonusAmount < 0 ? 'text-red-600' : item.bonusAmount > 0 ? 'text-emerald-700' : 'text-gray-500'
            )}
          >
            {formatPkrAmount(item.bonusAmount)}
          </span>
          {item.bonusOverridden && (
            <Badge variant="info" className="mt-1 w-fit text-[9px] px-1.5 py-0">
              Edited
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'id',
      width: '100px',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleEdit(item)}
            className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-primary-600 transition-colors"
            aria-label="Edit score"
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(item)}
            className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
            aria-label="Delete score"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-10 w-full min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600 shrink-0 h-fit mt-0.5">
            <Award size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
              Employee Performance Scoring
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1.5 max-w-2xl">
              Score employees out of 100 across five criteria. Bonus or penalty is calculated automatically and can be edited before saving.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pt-1">
          <Button
            variant="outline"
            size="sm"
            rounded={false}
            className={cn(pageOutlineButtonClass, 'flex-1 sm:flex-none')}
            onClick={() => setShowCriteria((v) => !v)}
          >
            {showCriteria ? 'Hide Configuration' : 'Edit Criteria & Rules'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            rounded={false}
            leftIcon={Plus}
            onClick={handleAdd}
            className={cn(pageActionButtonClass, 'flex-1 sm:flex-none')}
          >
            Score Employee
          </Button>
        </div>
      </div>

      {showCriteria && <ScoringConfigPanel />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard
          icon={<Users size={20} />}
          iconClassName="bg-[#EFF8FF] text-[#175CD3]"
          value={stats.scored}
          label="Employees Scored"
          subtext={`Period: ${period}`}
        />
        <DashboardStatCard
          icon={<TrendingUp size={20} />}
          iconClassName="bg-[#ECFDF3] text-[#067647]"
          value={stats.avgScore}
          label="Average Score"
          subtext="Out of 100 points"
        />
        <DashboardStatCard
          icon={<Wallet size={20} />}
          iconClassName="bg-[#FFF6ED] text-[#C4320A]"
          value={formatPkrAmount(stats.totalBonus)}
          label="Total Bonus / Penalty"
          subtext="Sum of final amounts"
        />
        <DashboardStatCard
          icon={<Award size={20} />}
          iconClassName="bg-[#FFF1F3] text-[#C01048]"
          value={stats.penalties}
          label="Penalties Applied"
          subtext="Scores below 40"
        />
      </div>

      <Card className="p-4 sm:p-5 border-none shadow-sm bg-white overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h2 className="text-lg font-extrabold text-gray-900 shrink-0">Monthly Scores</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:max-w-md">
            <div className="w-full sm:min-w-[160px]">
              <Select
                value={period}
                onChange={(v) => setPeriod(String(v))}
                options={periods.map((p) => ({ value: p, label: p }))}
              />
            </div>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
        <Table
          columns={columns}
          data={filteredRecords}
          isLoading={isLoading || periodLoading}
          emptyMessage="No performance scores for this period. Click “Score Employee” to add one."
        />
        </div>
      </Card>

      <EmployeePerformanceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        period={period}
        record={editingRecord}
      />

      <ActionModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Performance Record"
        description={`Remove the performance score for ${deleteTarget?.employeeName} (${period})?`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default PerformanceScoringPage;
