import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, BarChart3, Trash2, Eye, Download, X,
  ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { BASE_URL } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { getAccessToken } from '@/utils/tokenMemory';
import ActionModal from '@/components/ui/ActionModal';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const inputCls =
  'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-white';
const labelCls = 'text-xs font-semibold text-gray-500 block mb-1.5';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  EARNINGS:     { label: 'Earnings',     color: 'bg-green-100 text-green-700' },
  SERVICE_FEE:  { label: 'Service Fee',  color: 'bg-red-100 text-red-700' },
  SUBSCRIPTION: { label: 'Subscription', color: 'bg-purple-100 text-purple-700' },
  CONNECTS:     { label: 'Connects',     color: 'bg-blue-100 text-blue-700' },
  TAX:          { label: 'Tax',          color: 'bg-orange-100 text-orange-700' },
  WITHDRAWAL:   { label: 'Withdrawal',   color: 'bg-gray-100 text-gray-700' },
  REFUND:       { label: 'Refund',       color: 'bg-teal-100 text-teal-700' },
  BONUS:        { label: 'Bonus',        color: 'bg-yellow-100 text-yellow-700' },
  CARD_PAYMENT: { label: 'Card Payment', color: 'bg-indigo-100 text-indigo-700' },
  ID_FEE:       { label: 'ID Fee',       color: 'bg-pink-100 text-pink-700' },
  REVIEW:       { label: 'Review',       color: 'bg-cyan-100 text-cyan-700' },
  OTHER:        { label: 'Other',        color: 'bg-gray-100 text-gray-500' },
};

// ── types ─────────────────────────────────────────────────────────────────────

interface ManualAdj {
  earning_outside: string;
  loan_paid: string;
  reviews_manual: string;
  bonus_manual: string;
  id_fee_manual: string;
  refund_manual: string;
  notes: string;
}

interface ParsedData {
  rows: any[];
  upwork_totals: Record<string, number>;
  row_count: number;
  file_name: string;
}

// ── computeSummary ────────────────────────────────────────────────────────────

function computeSummary(
  upworkTotals: Record<string, number> | null,
  internalData: { tekxai_salaries: number; tekxai_expenses: number } | null,
  manualAdj: ManualAdj,
) {
  const ut = upworkTotals || {};
  const earnings     = ut.earnings     || 0;
  const service_fee  = ut.service_fee  || 0;
  const subscription = ut.subscription || 0;
  const connects     = ut.connects     || 0;
  const tax          = ut.tax          || 0;
  const refund       = parseFloat(manualAdj.refund_manual)   || ut.refund  || 0;
  const bonus        = parseFloat(manualAdj.bonus_manual)    || ut.bonus   || 0;
  const review       = parseFloat(manualAdj.reviews_manual)  || ut.review  || 0;
  const id_fee       = parseFloat(manualAdj.id_fee_manual)   || ut.id_fee  || 0;
  const outside      = parseFloat(manualAdj.earning_outside) || 0;
  const loan_paid    = parseFloat(manualAdj.loan_paid)       || 0;
  const salaries     = internalData?.tekxai_salaries || 0;
  const expenses     = internalData?.tekxai_expenses || 0;

  const gross_income     = earnings + outside + bonus + review + refund;
  const total_deductions = service_fee + subscription + connects + tax + id_fee;
  const net_upwork       = gross_income - total_deductions;
  const final_result     = net_upwork - salaries - expenses - loan_paid;

  return {
    earnings, service_fee, subscription, connects, tax,
    refund, bonus, review, id_fee, outside, loan_paid,
    salaries, expenses, gross_income, total_deductions, net_upwork, final_result,
  };
}

// ── exportReportCSV ───────────────────────────────────────────────────────────

function exportReportCSV(report: any) {
  const adj = report.manual_adjustments || {} as ManualAdj;
  const ut  = report.upwork_totals || {};
  const s   = computeSummary(ut, { tekxai_salaries: Number(report.salary_snapshot || 0), tekxai_expenses: Number(report.expense_snapshot || 0) }, adj);

  const rows = [
    ['Metric', 'Amount'],
    ['Total Earning (Upwork)', s.earnings],
    ['Total Earning (Outside)', s.outside],
    ['Bonuses', s.bonus],
    ['Reviews', s.review],
    ['Refund', s.refund],
    ['GROSS INCOME', s.gross_income],
    ['Service Fee', -s.service_fee],
    ['Subscription', -s.subscription],
    ['Connects', -s.connects],
    ['Tax', -s.tax],
    ['ID Fee', -s.id_fee],
    ['NET UPWORK EARNINGS', s.net_upwork],
    ['Tekxai Salaries', -s.salaries],
    ['Tekxai Expenses', -s.expenses],
    ['Loan Paid', -s.loan_paid],
    ['FINAL RESULT', s.final_result],
  ];

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${report.name || 'report'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── SummaryTable ──────────────────────────────────────────────────────────────

function SummaryTable({ s }: { s: ReturnType<typeof computeSummary> }) {
  const row = (label: string, value: number, bold = false, indent = false) => (
    <tr key={label} className={bold ? 'bg-gray-50 font-black' : ''}>
      <td className={cn('py-1.5 text-sm text-gray-700', indent && 'pl-6')}>{label}</td>
      <td className={cn('py-1.5 text-sm text-right tabular-nums', bold ? 'text-gray-900 font-black' : 'text-gray-600')}>
        {fmt(value)}
      </td>
    </tr>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-black text-gray-800 mb-4">Final Business Summary</h3>
      <table className="w-full">
        <tbody>
          <tr><td colSpan={2} className="py-1 text-[10px] font-black uppercase tracking-widest text-blue-500">Income</td></tr>
          <tr><td colSpan={2} className="border-t border-gray-100" /></tr>
          {row('Total Earning (Upwork)',   s.earnings,   false, true)}
          {row('Total Earning (Outside)',  s.outside,    false, true)}
          {row('Bonuses',                  s.bonus,      false, true)}
          {row('Reviews',                  s.review,     false, true)}
          {row('Refund',                   s.refund,     false, true)}
          <tr><td colSpan={2} className="border-t border-gray-200" /></tr>
          {row('GROSS INCOME',             s.gross_income, true)}

          <tr><td colSpan={2} className="pt-4 py-1 text-[10px] font-black uppercase tracking-widest text-red-500">Upwork Deductions</td></tr>
          <tr><td colSpan={2} className="border-t border-gray-100" /></tr>
          {row('Service Fee',             s.service_fee,  false, true)}
          {row('Subscription Fee',        s.subscription, false, true)}
          {row('Connects Cost',           s.connects,     false, true)}
          {row('Tax',                     s.tax,          false, true)}
          {row('ID Fee',                  s.id_fee,       false, true)}
          <tr><td colSpan={2} className="border-t border-gray-200" /></tr>
          {row('NET UPWORK EARNINGS',     s.net_upwork,   true)}

          <tr><td colSpan={2} className="pt-4 py-1 text-[10px] font-black uppercase tracking-widest text-purple-500">Tekxai Costs (from ERP)</td></tr>
          <tr><td colSpan={2} className="border-t border-gray-100" /></tr>
          {row('Total Salaries',          s.salaries,     false, true)}
          {row('Total Expenses',          s.expenses,     false, true)}
          {row('Loan Paid',               s.loan_paid,    false, true)}
          <tr><td colSpan={2} className="border-t border-gray-200" /></tr>
          <tr className="bg-gray-50">
            <td className="py-2 text-sm font-black text-gray-900">FINAL RESULT</td>
            <td className={cn(
              'py-2 text-sm font-black text-right tabular-nums',
              s.final_result >= 0 ? 'text-green-600' : 'text-red-600',
            )}>
              {fmt(s.final_result)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type ActiveView = 'new' | 'history' | 'detail';

export default function FinancialReportsPage() {
  const qc = useQueryClient();

  // view state
  const [activeView, setActiveView] = useState<ActiveView>('new');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportToDelete, setReportToDelete] = useState<any>(null);

  // new report state
  const [reportName, setReportName] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo,   setPeriodTo]   = useState('');
  const [file, setFile]             = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [txCollapsed, setTxCollapsed] = useState(false);
  const [manualAdj, setManualAdj]   = useState<ManualAdj>({
    earning_outside: '', loan_paid: '', reviews_manual: '',
    bonus_manual: '', id_fee_manual: '', refund_manual: '', notes: '',
  });
  const [err, setErr] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  // ── queries ────────────────────────────────────────────────────────────────

  const internalQuery = useQuery({
    queryKey: ['reporting-internal', periodFrom, periodTo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (periodFrom) params.set('from', periodFrom);
      if (periodTo)   params.set('to', periodTo);
      return apiRequest<any>(`${API_ENDPOINTS.REPORTING.INTERNAL_DATA}?${params}`);
    },
    select: (r: any) => r?.payload,
    enabled: !!(periodFrom && periodTo),
  });

  const reportsQuery = useQuery({
    queryKey: ['reporting-list'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.REPORTING.REPORTS),
    select: (r: any) => r?.payload?.records || [],
    enabled: activeView === 'history',
  });

  // ── mutations ──────────────────────────────────────────────────────────────

  const parseMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = getAccessToken();
      const url   = `${BASE_URL}${API_ENDPOINTS.REPORTING.PARSE}`;
      const res   = await fetch(url, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ message: 'Parse failed' }));
        throw new Error(e.message || 'Parse failed');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setParsedData(data.payload);
      setErr('');
    },
    onError: (e: any) => setErr(e.message || 'Parse failed'),
  });

  const saveMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest<any>(API_ENDPOINTS.REPORTING.REPORTS, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reporting-list'] });
      setActiveView('history');
    },
    onError: (e: any) => setErr(e.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.REPORTING.REPORT(id), { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reporting-list'] }); setReportToDelete(null); },
  });

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleParse = () => {
    if (!file) return;
    setErr('');
    const fd = new FormData();
    fd.append('file', file);
    parseMutation.mutate(fd);
  };

  const handleSave = () => {
    if (!parsedData) return;
    const internalData = internalQuery.data;
    const s = computeSummary(parsedData.upwork_totals, internalData, manualAdj);
    saveMutation.mutate({
      name: reportName,
      period_from: periodFrom,
      period_to:   periodTo,
      uploaded_file_name: parsedData.file_name,
      upwork_totals: parsedData.upwork_totals,
      manual_adjustments: manualAdj,
      salary_snapshot: internalData?.tekxai_salaries || 0,
      expense_snapshot: internalData?.tekxai_expenses || 0,
      final_result: s.final_result,
    });
  };

  const adj = (field: keyof ManualAdj) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setManualAdj(prev => ({ ...prev, [field]: e.target.value }));

  const internalData = internalQuery.data;
  const summary = parsedData
    ? computeSummary(parsedData.upwork_totals, internalData, manualAdj)
    : null;

  const visibleRows = parsedData
    ? (showAllRows ? parsedData.rows : parsedData.rows.slice(0, 100))
    : [];

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upwork Reporting — Super Admin only</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('new')}
            className={cn(
              'px-4 h-9 rounded-xl text-sm font-bold transition-colors',
              activeView === 'new'
                ? 'bg-[#005CDA] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            New Report
          </button>
          <button
            onClick={() => { setActiveView('history'); qc.invalidateQueries({ queryKey: ['reporting-list'] }); }}
            className={cn(
              'px-4 h-9 rounded-xl text-sm font-bold transition-colors',
              activeView === 'history' || activeView === 'detail'
                ? 'bg-[#005CDA] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            History
          </button>
        </div>
      </div>

      {/* ── NEW REPORT VIEW ────────────────────────────────────────────────── */}
      {activeView === 'new' && (
        <div className="space-y-6">
          {/* Section 1 — Setup */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-black text-gray-800">Report Setup</h2>

            <div>
              <label className={labelCls}>Report Name *</label>
              <input
                className={inputCls}
                placeholder="e.g. June 2026 Upwork Report"
                value={reportName}
                onChange={e => setReportName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Period From *</label>
                <input type="date" className={inputCls} value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Period To *</label>
                <input type="date" className={inputCls} value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
              </div>
            </div>

            {/* File drop zone */}
            <div>
              <label className={labelCls}>Upload CSV / XLSX *</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors',
                  file ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50',
                )}
              >
                <Upload size={28} className={file ? 'text-blue-500' : 'text-gray-400'} />
                {file ? (
                  <div className="mt-2 text-sm font-semibold text-blue-700 flex items-center gap-2">
                    <FileText size={14} />
                    {file.name}
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null); setParsedData(null); }}
                      className="text-gray-400 hover:text-red-500 ml-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-gray-500 font-medium">Drop CSV or XLSX here or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">Max 10 MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => { setFile(e.target.files?.[0] || null); setParsedData(null); }}
              />
            </div>

            {err && <p className="text-sm text-red-500 font-medium">{err}</p>}

            <button
              onClick={handleParse}
              disabled={!file || !reportName || !periodFrom || !periodTo || parseMutation.isPending}
              className="h-10 px-6 bg-[#005CDA] text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {parseMutation.isPending ? 'Parsing…' : 'Parse & Analyze'}
            </button>
          </div>

          {/* Section 2 — Parsed Transactions */}
          {parsedData && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-gray-800">
                  Parsed Transactions ({parsedData.row_count} rows)
                </h2>
                <button
                  onClick={() => setTxCollapsed(v => !v)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {txCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>

              {!txCollapsed && (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-left">Classified As</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {visibleRows.map((row: any, i: number) => {
                          const type = TYPE_LABELS[row._type] || TYPE_LABELS.OTHER;
                          return (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row._date || '—'}</td>
                              <td className="px-3 py-2 text-xs text-gray-700 max-w-xs truncate">{row._desc || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-bold', type.color)}>
                                  {type.label}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums text-gray-700">
                                {fmt(Math.abs(row._amount || 0))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.rows.length > 100 && (
                    <button
                      onClick={() => setShowAllRows(v => !v)}
                      className="mt-3 text-xs text-blue-600 font-semibold hover:underline"
                    >
                      {showAllRows ? 'Show fewer' : `Show all ${parsedData.rows.length} rows`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Section 3 — Upwork Summary Cards */}
          {parsedData && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-black text-gray-800 mb-4">Upwork Totals</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(parsedData.upwork_totals).map(([key, val]) => {
                  const type = TYPE_LABELS[key.toUpperCase()] || { label: key, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', type.color)}>{type.label}</span>
                      <p className="mt-1.5 text-lg font-black text-gray-900 tabular-nums">{fmt(val as number)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4 — Internal ERP Data */}
          {parsedData && periodFrom && periodTo && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-black text-gray-800 mb-1">Internal ERP Data</h2>
              <p className="text-xs text-gray-400 mb-4">Pulled live from the salary builder and expense module for the selected period.</p>
              {internalQuery.isLoading ? (
                <p className="text-sm text-gray-400">Loading ERP data…</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <p className="text-xs font-bold text-purple-600">Tekxai Salaries (from ERP)</p>
                    <p className="text-xl font-black text-purple-900 mt-1 tabular-nums">
                      {fmt(internalData?.tekxai_salaries || 0)}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <p className="text-xs font-bold text-orange-600">Tekxai Expenses (from ERP)</p>
                    <p className="text-xl font-black text-orange-900 mt-1 tabular-nums">
                      {fmt(internalData?.tekxai_expenses || 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 5 — Manual Adjustments */}
          {parsedData && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-black text-gray-800 mb-4">Manual Adjustments</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Earning Outside Upwork</label>
                  <input type="number" className={inputCls} placeholder="0.00" value={manualAdj.earning_outside} onChange={adj('earning_outside')} />
                </div>
                <div>
                  <label className={labelCls}>Loan Paid</label>
                  <input type="number" className={inputCls} placeholder="0.00" value={manualAdj.loan_paid} onChange={adj('loan_paid')} />
                </div>
                <div>
                  <label className={labelCls}>Reviews (manual override)</label>
                  <input type="number" className={inputCls} placeholder="0.00" value={manualAdj.reviews_manual} onChange={adj('reviews_manual')} />
                </div>
                <div>
                  <label className={labelCls}>Bonuses (manual override)</label>
                  <input type="number" className={inputCls} placeholder="0.00" value={manualAdj.bonus_manual} onChange={adj('bonus_manual')} />
                </div>
                <div>
                  <label className={labelCls}>ID Fee (manual override)</label>
                  <input type="number" className={inputCls} placeholder="0.00" value={manualAdj.id_fee_manual} onChange={adj('id_fee_manual')} />
                </div>
                <div>
                  <label className={labelCls}>Refund (manual override)</label>
                  <input type="number" className={inputCls} placeholder="0.00" value={manualAdj.refund_manual} onChange={adj('refund_manual')} />
                </div>
              </div>
              <div className="mt-4">
                <label className={labelCls}>Notes</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 resize-none"
                  rows={3}
                  placeholder="Any additional notes…"
                  value={manualAdj.notes}
                  onChange={adj('notes')}
                />
              </div>
            </div>
          )}

          {/* Section 6 — Final Summary + Save */}
          {summary && (
            <>
              <SummaryTable s={summary} />
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="h-10 px-8 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-40 transition-colors"
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save Report'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HISTORY VIEW ────────────────────────────────────────────────────── */}
      {activeView === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-gray-800 mb-4">Saved Reports</h2>
          {reportsQuery.isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (reportsQuery.data?.length || 0) === 0 ? (
            <p className="text-sm text-gray-400">No saved reports yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Report Name</th>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-right">Final Result</th>
                    <th className="px-4 py-3 text-left">Created By</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(reportsQuery.data as any[]).map((r: any) => {
                    const finalVal = Number(r.final_result || 0);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {r.period_from?.slice(0, 10)} — {r.period_to?.slice(0, 10)}
                        </td>
                        <td className={cn('px-4 py-3 text-right tabular-nums font-bold', finalVal >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {fmt(finalVal)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {r.creator?.first_name} {r.creator?.last_name}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setSelectedReport(r); setActiveView('detail'); }}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => exportReportCSV(r)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Export CSV"
                            >
                              <Download size={15} />
                            </button>
                            <button
                              onClick={() => setReportToDelete(r)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL VIEW ─────────────────────────────────────────────────────── */}
      {activeView === 'detail' && selectedReport && (() => {
        const r   = selectedReport;
        const adj = r.manual_adjustments || {};
        const ut  = r.upwork_totals || {};
        const intr = { tekxai_salaries: Number(r.salary_snapshot || 0), tekxai_expenses: Number(r.expense_snapshot || 0) };
        const s   = computeSummary(ut, intr, adj);

        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView('history')}
                className="text-sm text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1"
              >
                ← Back
              </button>
              <div className="flex-1">
                <h2 className="text-lg font-black text-gray-900">{r.name}</h2>
                <p className="text-xs text-gray-400">{r.period_from?.slice(0, 10)} — {r.period_to?.slice(0, 10)}</p>
              </div>
              <button
                onClick={() => exportReportCSV(r)}
                className="flex items-center gap-2 px-4 h-9 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>

            {/* Upwork totals read-only */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-black text-gray-800 mb-4">Upwork Totals</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(ut).map(([key, val]) => {
                  const type = TYPE_LABELS[key.toUpperCase()] || { label: key, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', type.color)}>{type.label}</span>
                      <p className="mt-1.5 text-lg font-black text-gray-900 tabular-nums">{fmt(val as number)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ERP snapshots */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-black text-gray-800 mb-3">ERP Snapshots at Save Time</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs font-bold text-purple-600">Salary Snapshot</p>
                  <p className="text-xl font-black text-purple-900 mt-1 tabular-nums">{fmt(intr.tekxai_salaries)}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <p className="text-xs font-bold text-orange-600">Expense Snapshot</p>
                  <p className="text-xl font-black text-orange-900 mt-1 tabular-nums">{fmt(intr.tekxai_expenses)}</p>
                </div>
              </div>
            </div>

            {/* Manual adjustments read-only */}
            {Object.keys(adj).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-black text-gray-800 mb-3">Manual Adjustments</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {Object.entries(adj).map(([k, v]) => v && k !== 'notes' ? (
                    <div key={k} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 font-semibold capitalize">{k.replace(/_/g, ' ')}</p>
                      <p className="font-bold text-gray-800 tabular-nums">{fmt(Number(v))}</p>
                    </div>
                  ) : null)}
                </div>
                {adj.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">{adj.notes}</div>
                )}
              </div>
            )}

            <SummaryTable s={s} />
          </div>
        );
      })()}

      <ActionModal
        isOpen={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        onConfirm={() => reportToDelete && deleteMutation.mutate(reportToDelete.id)}
        title="Delete Report"
        description="Are you sure you want to delete this report? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        icon="delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
