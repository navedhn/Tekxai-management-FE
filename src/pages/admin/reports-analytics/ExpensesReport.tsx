import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingDown, TrendingUp, DollarSign, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Loader from '@/components/ui/Loader';
import { KpiRow } from './components/KpiRow';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

function pkr(n: number) {
  return `PKR ${(n || 0).toLocaleString('en-PK')}`;
}

// This report shows real, ledger-derived expense totals from
// GET /expenses/summary (the same endpoint backing Expense Management →
// Overview). There is no per-status (Pending/Approved/Rejected) breakdown
// here because expense_transactions has no status/approval-workflow field
// in the data model — it's a direct-entry ledger, not an approval queue.
// GET /reporting/internal-data was evaluated and confirmed insufficient for
// a status or category breakdown (it only exposes two flat aggregates).
export const ExpensesReport: React.FC = () => {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['expense-summary'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EXPENSES.SUMMARY),
    select: (r: any) => r?.payload,
  });

  const { data: accounts } = useQuery({
    queryKey: ['expense-accounts'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EXPENSES.ACCOUNTS),
    select: (r: any) => r?.payload?.records || [],
  });

  if (isLoading) return <Loader size={32} />;

  return (
    <div className="flex flex-col gap-5">
      <KpiRow
        columns={5}
        cards={[
          { icon: TrendingUp, color: 'bg-green-500', label: 'Total Received', value: pkr(summary?.total_received) },
          { icon: TrendingDown, color: 'bg-red-500', label: 'Total Spent', value: pkr(summary?.total_spent) },
          { icon: Wallet, color: 'bg-blue-500', label: 'Outstanding Balance', value: pkr(summary?.outstanding_balance) },
          { icon: DollarSign, color: 'bg-purple-500', label: 'CE Spent', value: pkr(summary?.ce_spent) },
          { icon: DollarSign, color: 'bg-orange-500', label: 'Tekxai Spent', value: pkr(summary?.tekxai_spent) },
        ]}
      />

      <Card className="border-none shadow-sm flex items-start gap-3 bg-amber-50">
        <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-medium">
          Approval status (Pending / Approved / Rejected) is not tracked for expenses in this system — expense
          transactions are direct ledger entries, not an approval workflow. Category, department, and per-transaction
          breakdowns aren't available at the reporting level either, since there is no cross-account aggregation
          endpoint yet. For a full transaction-level view, open an individual employee's ledger from{' '}
          <a href="/admin/expenses" className="underline font-semibold">Expense Management</a>.
        </p>
      </Card>

      <Card className="border-none shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Expense Accounts</p>
        {accounts?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2 pr-4">Account Holder</th>
                  <th className="py-2 pr-4 text-right">Received</th>
                  <th className="py-2 pr-4 text-right">Spent</th>
                  <th className="py-2 pr-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a: any) => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-semibold text-gray-900">{a.user?.first_name ? `${a.user.first_name} ${a.user.last_name || ''}`.trim() : a.user?.email || a.id}</td>
                    <td className="py-2 pr-4 text-right">{pkr(a.total_received)}</td>
                    <td className="py-2 pr-4 text-right">{pkr(a.total_spent)}</td>
                    <td className="py-2 pr-4 text-right">{pkr(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 font-medium">No expense accounts found.</p>
        )}
      </Card>
    </div>
  );
};

export default ExpensesReport;
