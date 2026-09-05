import React from 'react';
import { CircleDollarSign } from 'lucide-react';
import type { ProjectFinancialSummary, ActiveMilestone } from '@/services/projectService';

interface MilestoneFinancialSummaryProps {
  financial: ProjectFinancialSummary | undefined;
  activeMilestone: ActiveMilestone | null | undefined;
}

// Milestone Financial Foundation — Total/Paid/Remaining/Active are ALWAYS
// server-derived (see compute_financial_summary in projects.repository.js).
// This panel only renders what the API already returned; it never computes
// or edits these numbers itself. Deliberately separate from BudgetPanel
// (projects.budget/budget_spent), which is independent internal cost
// tracking, not milestone billing — the two must not be conflated.
const MilestoneFinancialSummary: React.FC<MilestoneFinancialSummaryProps> = ({ financial, activeMilestone }) => {
  const currency = financial?.currency || 'PKR';

  if (!financial) {
    return (
      <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="w-full flex items-center gap-3 p-6 border-b border-gray-100">
          <CircleDollarSign size={18} strokeWidth={2.5} className="text-primary-500" />
          <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Milestone Financials</h3>
        </div>
        <div className="p-6 text-sm text-gray-400 font-semibold">Loading…</div>
      </div>
    );
  }

  const cards = [
    { label: 'Total', value: financial.total, tone: 'text-gray-900' },
    { label: 'Paid', value: financial.paid, tone: 'text-emerald-600' },
    { label: 'Remaining', value: financial.remaining, tone: financial.remaining > 0 ? 'text-amber-600' : 'text-gray-900' },
    { label: 'Active Milestone', value: financial.active, tone: 'text-primary-600' },
  ];

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center gap-3 p-6 border-b border-gray-100">
        <CircleDollarSign size={18} strokeWidth={2.5} className="text-primary-500" />
        <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Milestone Financials</h3>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <p className="text-xs text-gray-400 font-semibold -mt-1">
          Derived from milestone pricing and payment state — not the project's internal Budget below.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className={`text-lg font-black tabular-nums ${c.tone}`}>{currency} {c.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {activeMilestone ? (
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Milestone</span>
            <span className="text-sm font-black text-gray-900">{activeMilestone.title}</span>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic font-semibold px-1">No active milestone (none pending/in-progress).</p>
        )}
      </div>
    </div>
  );
};

export default MilestoneFinancialSummary;
