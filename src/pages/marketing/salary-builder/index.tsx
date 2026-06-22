import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Save, Send } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Textarea from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { MarketingPageHeader, ExchangeRateWidget, SalarySummaryBox } from '@/components/marketing';
import { formatPkr, formatUsd, pkrToUsd, PERIOD_OPTIONS, useGetSalaryBuilder, useUpsertSalaryBuilderMutation } from '@/services/marketingService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const useGetUser = (userId?: string) =>
  useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await apiRequest<any>(`${API_ENDPOINTS.MARKETING.MEMBERS}?period=`);
      const users: any[] = res?.payload?.users || [];
      return users.find(u => u.id === userId) || null;
    },
    enabled: !!userId,
    staleTime: 300000,
  });

interface Allowance { id: string; label: string; amountPkr: number }

const SalaryBuilderPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();
  const qc = useQueryClient();

  const [period, setPeriod] = useState('June 2026');
  const [basicSalary, setBasicSalary] = useState('');
  const [deductions, setDeductions] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [commissionPkr, setCommissionPkr] = useState('');
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: member, isLoading: userLoading } = useGetUser(memberId);
  const { data: slip, isLoading: slipLoading } = useGetSalaryBuilder(memberId, period);
  const upsert = useUpsertSalaryBuilderMutation();

  // Populate form when slip data loads
  useEffect(() => {
    if (slip) {
      setBasicSalary(String(slip.basic_salary_pkr || ''));
      setDeductions(String(slip.deductions_pkr || ''));
      setDeductionReason(slip.deduction_reason || '');
      setCommissionPkr(String(slip.commission_pkr || ''));
      setAllowances(Array.isArray(slip.allowances) ? slip.allowances : []);
      setInitialized(true);
    } else if (!slipLoading) {
      // No existing slip: reset to blank
      setBasicSalary('');
      setDeductions('');
      setDeductionReason('');
      setCommissionPkr('');
      setAllowances([]);
      setInitialized(true);
    }
  }, [slip, slipLoading]);

  const basicPkr = parseFloat(basicSalary) || 0;
  const deductionsPkr = parseFloat(deductions) || 0;
  const commissionAmt = parseFloat(commissionPkr) || 0;
  const allowancesPkr = allowances.reduce((s, a) => s + (a.amountPkr || 0), 0);

  const teamLabel = member?.roles?.[0]?.role?.name?.includes('MARKETING') ? 'Tekxai Sales Team' : 'Intern BDs';

  const buildPayload = (status: string) => ({
    user_id: memberId,
    period,
    team_label: teamLabel,
    basic_salary_pkr: basicPkr,
    deductions_pkr: deductionsPkr,
    deduction_reason: deductionReason,
    commission_pkr: commissionAmt,
    allowances,
    status,
  });

  const handleSaveDraft = () => {
    upsert.mutate(buildPayload('draft'), {
      onSuccess: () => { toast.success('Saved as draft'); qc.invalidateQueries({ queryKey: ['marketing', 'salary-builder', memberId, period] }); },
      onError: (e: any) => toast.error(e?.message || 'Failed to save'),
    });
  };

  const handlePublish = async () => {
    // Upsert first, then publish
    upsert.mutate(buildPayload('draft'), {
      onSuccess: async () => {
        try {
          await apiRequest(API_ENDPOINTS.MARKETING.PUBLISH_SALARY(memberId!, period), { method: 'POST' });
          toast.success('Salary slip published');
          qc.invalidateQueries({ queryKey: ['marketing', 'salary-builder', memberId, period] });
          qc.invalidateQueries({ queryKey: ['marketing', 'members'] });
        } catch (e: any) {
          toast.error(e?.message || 'Failed to publish');
        }
      },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const addAllowance = () =>
    setAllowances(prev => [...prev, { id: `new-${Date.now()}`, label: 'New Allowance', amountPkr: 0 }]);

  const updateAllowance = (id: string, field: 'label' | 'amountPkr', value: string) =>
    setAllowances(prev =>
      prev.map(a => a.id === id ? { ...a, [field]: field === 'amountPkr' ? parseFloat(value) || 0 : value } : a)
    );

  const removeAllowance = (id: string) =>
    setAllowances(prev => prev.filter(a => a.id !== id));

  if (userLoading || slipLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!memberId) {
    navigate('/marketing');
    return null;
  }

  const name = member ? `${member.first_name} ${member.last_name}` : 'Unknown Member';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
  const currentStatus = slip?.status || 'draft';

  return (
    <div className="flex flex-col gap-6 pb-24">
      <MarketingPageHeader
        title="Salary Builder"
        subtitle={`${name} · ${teamLabel}`}
        backTo="/marketing"
        rightSlot={
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-36">
              <Select label="Period" options={PERIOD_OPTIONS} value={period} onChange={v => { setPeriod(String(v)); setInitialized(false); }} />
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
          <p className="text-lg font-black text-gray-900">{name}</p>
          <p className="text-sm text-gray-500 font-medium">{teamLabel} · {period}</p>
        </div>
        <Badge className={`rounded-lg px-3 py-1 text-xs font-bold capitalize w-fit border ${currentStatus === 'published' ? 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]' : 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]'}`}>
          {currentStatus}
        </Badge>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-base font-black text-gray-900 mb-4">Basic Salary (PKR)</h2>
          <Input
            placeholder="Enter basic salary in PKR"
            value={basicSalary}
            onChange={e => setBasicSalary(e.target.value)}
            type="number"
            min={0}
          />
          <p className="text-xs text-gray-400 mt-2 font-medium tabular-nums">≈ {formatUsd(pkrToUsd(basicPkr))} USD</p>
        </Card>

        <Card>
          <h2 className="text-base font-black text-gray-900 mb-4">Commission (PKR)</h2>
          <Input
            placeholder="Commission amount in PKR"
            value={commissionPkr}
            onChange={e => setCommissionPkr(e.target.value)}
            type="number"
            min={0}
          />
          <p className="text-xs text-gray-400 mt-2 font-medium tabular-nums">≈ {formatUsd(pkrToUsd(commissionAmt))} USD</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-black text-gray-900 mb-4">Deductions (PKR)</h2>
        <Input
          placeholder="Enter deduction amount (if any)"
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

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-gray-900">Allowances &amp; Bonuses</h2>
            <p className="text-xs text-gray-500 font-medium">Added to the grand total</p>
          </div>
          <Button variant="outline" animation="none" rounded={false} className="rounded-lg text-xs h-9" onClick={addAllowance}>
            <Plus size={14} />Add New
          </Button>
        </div>

        <div className="space-y-3">
          {allowances.map(allowance => (
            <div key={allowance.id} className="flex items-center gap-3">
              <input
                type="text"
                value={allowance.label}
                onChange={e => updateAllowance(allowance.id, 'label', e.target.value)}
                className="w-36 h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 focus:border-[#005CDA] focus:outline-none shrink-0"
                placeholder="Label"
              />
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
              <button type="button" onClick={() => removeAllowance(allowance.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <X size={16} />
              </button>
            </div>
          ))}
          {allowances.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No allowances added</p>}
        </div>

        {allowances.length > 0 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="font-medium text-gray-600">Allowances Sub-total</span>
            <span className="font-bold tabular-nums text-gray-900">
              {formatUsd(pkrToUsd(allowancesPkr))} · {formatPkr(allowancesPkr)}
            </span>
          </div>
        )}
      </Card>

      <SalarySummaryBox
        commissionPkr={commissionAmt}
        basicSalaryPkr={basicPkr}
        allowancesPkr={allowancesPkr}
        deductionsPkr={deductionsPkr}
      />

      <div className="fixed bottom-0 left-[var(--sidebar-w,0px)] right-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 z-40">
        <Button variant="outline" animation="none" rounded={false} className="rounded-xl" onClick={() => navigate('/marketing')}>
          Cancel
        </Button>
        <Button variant="outline" animation="none" rounded={false} className="rounded-xl" loading={upsert.isPending} onClick={handleSaveDraft}>
          <Save size={15} className="mr-1.5" />Save Draft
        </Button>
        <Button variant="primary" animation="none" rounded={false} className="rounded-xl" loading={upsert.isPending} onClick={handlePublish} disabled={currentStatus === 'published'}>
          <Send size={15} className="mr-1.5" />{currentStatus === 'published' ? 'Published' : 'Publish'}
        </Button>
      </div>
    </div>
  );
};

export default SalaryBuilderPage;
