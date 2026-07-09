import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useUpdateBudgetMutation } from '@/services/projectService';

const CURRENCY_OPTIONS = [
  { label: 'PKR', value: 'PKR' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'GBP', value: 'GBP' },
];

interface BudgetPanelProps {
  projectId: string;
  budget: number | null | undefined;
  budgetCurrency: string | undefined;
  budgetSpent: number | undefined;
  canEdit: boolean;
}

const BudgetPanel: React.FC<BudgetPanelProps> = ({ projectId, budget, budgetCurrency, budgetSpent, canEdit }) => {
  const toast = useToastContext();
  const updateBudget = useUpdateBudgetMutation();

  const [form, setForm] = useState({
    budget: budget != null ? String(budget) : '',
    budget_currency: budgetCurrency || 'PKR',
    budget_spent: budgetSpent != null ? String(budgetSpent) : '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm({
      budget: budget != null ? String(budget) : '',
      budget_currency: budgetCurrency || 'PKR',
      budget_spent: budgetSpent != null ? String(budgetSpent) : '0',
    });
    setDirty(false);
  }, [budget, budgetCurrency, budgetSpent]);

  const remaining = form.budget !== '' ? (+form.budget - (+form.budget_spent || 0)) : null;

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (form.budget !== '' && +form.budget < 0) newErrors.budget = 'Budget cannot be negative';
    if (form.budget_spent !== '' && +form.budget_spent < 0) newErrors.budget_spent = 'Spent cannot be negative';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    updateBudget.mutate(
      {
        id: projectId,
        data: {
          budget: form.budget === '' ? null : +form.budget,
          budget_currency: form.budget_currency,
          budget_spent: form.budget_spent === '' ? 0 : +form.budget_spent,
        },
      },
      {
        onSuccess: () => { toast.success('Budget updated'); setDirty(false); },
        onError: (e: any) => toast.error(e?.message || 'Failed to update budget'),
      }
    );
  };

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center gap-3 p-6 border-b border-gray-100">
        <Wallet size={18} strokeWidth={2.5} className="text-primary-500" />
        <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Budget</h3>
      </div>

      <div className="flex flex-col gap-4 p-6">
        {canEdit ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Budget"
                type="number"
                min={0}
                value={form.budget}
                onChange={(e) => { setForm((f) => ({ ...f, budget: e.target.value })); setDirty(true); }}
                error={errors.budget}
                placeholder="0.00"
              />
              <Select
                label="Currency"
                options={CURRENCY_OPTIONS}
                value={form.budget_currency}
                onChange={(v) => { setForm((f) => ({ ...f, budget_currency: v as string })); setDirty(true); }}
              />
            </div>
            <Input
              label="Amount Spent"
              type="number"
              min={0}
              value={form.budget_spent}
              onChange={(e) => { setForm((f) => ({ ...f, budget_spent: e.target.value })); setDirty(true); }}
              error={errors.budget_spent}
              placeholder="0.00"
            />
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Remaining</span>
              <span className={`text-sm font-black ${remaining !== null && remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {remaining !== null ? `${form.budget_currency} ${remaining.toLocaleString()}` : '—'}
              </span>
            </div>
            <Button
              onClick={handleSave}
              disabled={!dirty || updateBudget.isPending}
              className="bg-primary-500 text-white h-10 rounded-xl font-bold text-xs px-4 disabled:opacity-40"
            >
              {updateBudget.isPending ? 'Saving…' : 'Save Budget'}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-gray-50">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Budget</span>
              <span className="text-gray-900 font-black text-sm">{budget != null ? `${budgetCurrency} ${budget.toLocaleString()}` : 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-50">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Spent</span>
              <span className="text-gray-900 font-black text-sm">{budgetCurrency} {(budgetSpent || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Remaining</span>
              <span className={`font-black text-sm ${remaining !== null && remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {remaining !== null ? `${budgetCurrency} ${remaining.toLocaleString()}` : '—'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BudgetPanel;
