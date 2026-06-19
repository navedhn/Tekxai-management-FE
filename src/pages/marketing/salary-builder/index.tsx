import React, { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Textarea from '@/components/ui/Textarea';
import { Button, pageOutlineButtonClass } from '@/components/ui/Button';
import {
  MarketingPageHeader,
  ExchangeRateWidget,
  SalarySummaryBox,
  SalaryActionBar,
} from '@/components/marketing';
import {
  formatPkr,
  formatUsd,
  getMemberWonDeals,
  getSalaryBuilderMember,
  PERIOD_OPTIONS,
  pkrToUsd,
} from '@/services/marketingService';
import { SalaryAllowance } from '@/types/marketing';
import { useToastContext } from '@/components/toast/ToastProvider';

const SalaryBuilderPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const toast = useToastContext();
  const initial = memberId ? getSalaryBuilderMember(memberId) : null;

  const [period, setPeriod] = useState(initial?.period ?? 'June 2026');
  const [basicSalary, setBasicSalary] = useState(String(initial?.basicSalaryPkr || ''));
  const [deductions, setDeductions] = useState(String(initial?.deductionsPkr || ''));
  const [deductionReason, setDeductionReason] = useState(initial?.deductionReason ?? '');
  const [allowances, setAllowances] = useState<SalaryAllowance[]>(initial?.allowances ?? []);

  if (!memberId || !initial) {
    return <Navigate to="/marketing" replace />;
  }

  const memberDeals = useMemo(() => getMemberWonDeals(memberId, period), [memberId, period]);
  const commissionPkr = initial.commissionPkr;

  const basicPkr = parseFloat(basicSalary) || 0;
  const deductionsPkr = parseFloat(deductions) || 0;
  const allowancesPkr = allowances.reduce((sum, a) => sum + (a.amountPkr || 0), 0);

  const updateAllowance = (id: string, field: 'label' | 'amountPkr', value: string) => {
    setAllowances(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, [field]: field === 'amountPkr' ? parseFloat(value) || 0 : value }
          : a
      )
    );
  };

  const removeAllowance = (id: string) => {
    setAllowances(prev => prev.filter(a => a.id !== id));
  };

  const addAllowance = () => {
    setAllowances(prev => [
      ...prev,
      { id: `new-${Date.now()}`, label: 'New Allowance', amountPkr: 0 },
    ]);
  };

  const initials = initial.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <MarketingPageHeader
        title="Salary Builder"
        subtitle={`${initial.name} · ${initial.teamLabel}`}
        backTo="/marketing"
        rightSlot={
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-36">
              <Select
                label="Period"
                options={PERIOD_OPTIONS}
                value={period}
                onChange={v => setPeriod(String(v))}
              />
            </div>
            <ExchangeRateWidget />
          </div>
        }
      />

      <Card className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-[#005CDA] text-white flex items-center justify-center text-lg font-black shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-black text-gray-900">{initial.name}</p>
          <p className="text-sm text-gray-500 font-medium">
            {initial.teamLabel} · {period}
          </p>
        </div>
        <Badge className="bg-[#FFF6ED] text-[#C4320A] border border-[#FFD6AE] rounded-lg px-3 py-1 text-xs font-bold capitalize w-fit">
          Draft
        </Badge>
      </Card>

      <Card>
        <h2 className="text-base font-black text-gray-900">Commission on Won Deals</h2>
        <p className="text-sm text-gray-500 font-medium mt-1 mb-4">
          Showing all won deals for {initial.name} in {period}
        </p>
        {memberDeals.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
            <p className="text-sm text-gray-500 font-medium">
              No won deals recorded for {initial.name} in {period}.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              You can still create a salary slip with basic salary only.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {memberDeals.map(deal => (
              <li
                key={deal.id}
                className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
              >
                <span className="font-medium text-gray-800">{deal.leadJob}</span>
                <span className="font-bold text-[#067647] tabular-nums">{formatUsd(deal.revenueUsd)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-base font-black text-gray-900 mb-4">Basic Salary</h2>
          <Input
            placeholder="Enter basic salary in PKR"
            value={basicSalary}
            onChange={e => setBasicSalary(e.target.value)}
            type="number"
            min={0}
          />
          <p className="text-xs text-gray-400 mt-2 font-medium tabular-nums">
            ≈ {formatUsd(pkrToUsd(basicPkr))} USD
          </p>
        </Card>

        <Card>
          <h2 className="text-base font-black text-gray-900 mb-4">Deductions</h2>
          <Input
            placeholder="Enter deduction amount in PKR (if any)"
            value={deductions}
            onChange={e => setDeductions(e.target.value)}
            type="number"
            min={0}
          />
          <div className="mt-3">
            <Textarea
              placeholder="Reason for deduction (e.g. late arrivals, policy violation)"
              value={deductionReason}
              onChange={e => setDeductionReason(e.target.value)}
              rows={3}
            />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-gray-900">Allowances &amp; Bonuses</h2>
            <p className="text-xs text-gray-500 font-medium">Added to the grand total</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            rounded={false}
            leftIcon={Plus}
            className={pageOutlineButtonClass}
            onClick={addAllowance}
          >
            Add New
          </Button>
        </div>

        <div className="space-y-3">
          {allowances.map(allowance => (
            <div key={allowance.id} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 w-32 shrink-0 truncate">{allowance.label}</span>
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">PKR</span>
                <input
                  type="number"
                  min={0}
                  value={allowance.amountPkr || ''}
                  onChange={e => updateAllowance(allowance.id, 'amountPkr', e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-4 text-sm font-semibold text-gray-700 focus:border-[#005CDA] focus:outline-none"
                  placeholder="0"
                />
              </div>
              <button
                type="button"
                onClick={() => removeAllowance(allowance.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove allowance"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 text-sm">
          <span className="font-medium text-gray-600">Allowances Sub-total</span>
          <span className="font-bold tabular-nums text-gray-900">
            {formatUsd(pkrToUsd(allowancesPkr))} · {formatPkr(allowancesPkr)}
          </span>
        </div>
      </Card>

      <SalarySummaryBox
        commissionPkr={commissionPkr}
        basicSalaryPkr={basicPkr}
        allowancesPkr={allowancesPkr}
        deductionsPkr={deductionsPkr}
      />

      <SalaryActionBar
        onPreview={() => toast.info('PDF preview will be available when backend is connected.')}
        onDownload={() => toast.info('Download will be available when backend is connected.')}
        onSaveDraft={() => toast.success('Salary saved as draft (mock).')}
        onPublish={() => toast.success('Salary published (mock).')}
      />
    </div>
  );
};

export default SalaryBuilderPage;
