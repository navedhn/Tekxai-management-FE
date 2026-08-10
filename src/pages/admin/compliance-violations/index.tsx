import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';

const inputCls = 'w-full h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-50 text-amber-700',
  WARNED: 'bg-orange-50 text-orange-700',
  FINED: 'bg-red-50 text-red-700',
  WAIVED: 'bg-gray-100 text-gray-500',
  IGNORED: 'bg-gray-100 text-gray-500',
};

const TYPE_LABELS: Record<string, string> = {
  MISSING_AGENDA: 'Missing Daily Agenda',
  MISSING_REPORT: 'Missing Daily Report',
};

function ActionPanel({ violation, onClose }: { violation: any; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToastContext();
  const [status, setStatus] = useState(violation.status);
  const [managerRemarks, setManagerRemarks] = useState(violation.manager_remarks || '');
  const [hrRemarks, setHrRemarks] = useState(violation.hr_remarks || '');
  const [fineAmount, setFineAmount] = useState(String(violation.fine_amount || 0));
  const [waived, setWaived] = useState(!!violation.waived);

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.COMPLIANCE_VIOLATIONS.DETAIL(violation.id), {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        manager_remarks: managerRemarks || undefined,
        hr_remarks: hrRemarks || undefined,
        fine_amount: fineAmount ? +fineAmount : 0,
        waived,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-violations'] });
      toast.success('Violation updated');
      onClose();
    },
    onError: (e: any) => toast.error(e?.data?.message || e?.message || 'Update failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">
            {violation.user ? `${violation.user.first_name} ${violation.user.last_name}` : 'Employee'} — {TYPE_LABELS[violation.violation_type] || violation.violation_type}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Action</label>
            <div className="flex flex-wrap gap-2">
              {['IGNORED', 'WARNED', 'FINED', 'WAIVED'].map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn('px-3 h-8 rounded-xl text-xs font-semibold border transition-colors',
                    status === s ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50')}>
                  {s === 'IGNORED' ? 'Ignore' : s === 'WARNED' ? 'Warn' : s === 'FINED' ? 'Issue Fine' : 'Waive'}
                </button>
              ))}
            </div>
          </div>
          {status === 'FINED' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Fine Amount</label>
              <input type="number" min="0" step="1" className={inputCls} value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Manager Remarks</label>
            <textarea className="w-full h-16 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none" value={managerRemarks} onChange={(e) => setManagerRemarks(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">HR Remarks</label>
            <textarea className="w-full h-16 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none" value={hrRemarks} onChange={(e) => setHrRemarks(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <input type="checkbox" checked={waived} onChange={(e) => setWaived(e.target.checked)} />
            Waive fine
          </label>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComplianceViolationsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (typeFilter) params.set('violation_type', typeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-violations', statusFilter, typeFilter],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.COMPLIANCE_VIOLATIONS.LIST}?${params}`),
    select: (r: any) => r?.payload?.records || [],
  });

  const violations: any[] = data || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Compliance Violations</h1>
        <p className="text-sm text-gray-500 font-medium mt-0.5">Missing Daily Agenda / Report and other attendance compliance issues</p>
      </div>

      <div className="flex gap-3">
        <select className={cn(inputCls, 'w-48')} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="MISSING_AGENDA">Missing Agenda</option>
          <option value="MISSING_REPORT">Missing Report</option>
        </select>
        <select className={cn(inputCls, 'w-40')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="WARNED">Warned</option>
          <option value="FINED">Fined</option>
          <option value="WAIVED">Waived</option>
          <option value="IGNORED">Ignored</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee', 'Type', 'Date', 'Status', 'Fine', 'Reason', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : violations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <ShieldAlert size={28} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No violations found</p>
                  </td>
                </tr>
              ) : violations.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-semibold text-gray-900">{v.user ? `${v.user.first_name} ${v.user.last_name}` : '—'}</td>
                  <td className="py-3 px-2 text-gray-600 text-xs">{TYPE_LABELS[v.violation_type] || v.violation_type}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">{v.date ? new Date(v.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                  <td className="py-3 px-2">
                    <span className={cn('px-2 py-0.5 rounded-lg text-xs font-semibold', STATUS_STYLES[v.status] || 'bg-gray-100 text-gray-500')}>{v.status}</span>
                  </td>
                  <td className="py-3 px-2 text-xs font-semibold text-gray-700">{v.fine_amount ? `PKR ${Number(v.fine_amount).toLocaleString()}` : '—'}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs max-w-[240px]"><p className="line-clamp-1">{v.reason || '—'}</p></td>
                  <td className="py-3 px-2">
                    <button onClick={() => setSelected(v)}
                      className="px-3 h-7 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700">
                      Act
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <ActionPanel violation={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
