import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import ActionModal from '@/components/ui/ActionModal';
import { Activity, Camera, Clock, Cpu, Trash2, BarChart3 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { apiRequest } from '@/lib/queryClient';
import { useFetchUsersQuery } from '@/services/userService';
import { useGetScreenshots, useGetProductivity, useGetAppUsage, useDeleteScreenshot, useBulkDeleteScreenshots, type Screenshot, type ProductivitySession } from '@/services/monitoringService';
import { useAuthStore } from '@/stores/authStore';
import { StatSkeleton } from '@/components/skeletons';

const TABS = ['Productivity Overview', 'Screenshot History', 'Reports'];
const v1 = 'api/v1';
const BUILDER = `${v1}/report/builder`;

// Sprint 1 Milestone 6 — org-wide Monitoring Reports via the generic
// report_builder engine. Deliberately separate from the existing
// "Productivity Overview" tab's per-page aggregateProductivity() (left
// untouched, same formula, just scoped to whatever page is loaded) — this
// tab answers the same questions (avg productivity, active vs idle) but
// correctly across ALL records via KPI AVG/SUM, not just the current page.
function MonitoringReportsTab() {
  const { data: users = [] } = useFetchUsersQuery({});
  const [dimKey, setDimKey] = useState<'apps' | 'websites' | 'employee'>('apps');

  const kpiCall = (entity: string, metric: string, field?: string) =>
    apiRequest<any>(`${BUILDER}/kpi`, { method: 'POST', body: JSON.stringify({ entity, metric, field }) }).then((r: any) => r?.payload?.value ?? 0);

  const avgProductivityQ = useQuery({ queryKey: ['monitoring-kpi-avg-productivity'], queryFn: () => kpiCall('productivity_sessions', 'AVG', 'productivity_score') });
  const activeQ = useQuery({ queryKey: ['monitoring-kpi-active'], queryFn: () => kpiCall('productivity_sessions', 'SUM', 'active_seconds') });
  const idleQ = useQuery({ queryKey: ['monitoring-kpi-idle'], queryFn: () => kpiCall('productivity_sessions', 'SUM', 'idle_seconds') });
  const screenshotCountQ = useQuery({ queryKey: ['monitoring-kpi-screenshots'], queryFn: () => kpiCall('screenshots', 'COUNT') });
  const monitoringTimeQ = useQuery({ queryKey: ['monitoring-kpi-time'], queryFn: () => kpiCall('app_usage_logs', 'SUM', 'duration_seconds') });

  const cards = [
    { icon: Cpu, color: 'bg-green-500', label: 'Avg. Productivity %', value: avgProductivityQ.data != null ? `${Math.round(avgProductivityQ.data)}%` : '—' },
    { icon: Activity, color: 'bg-blue-500', label: 'Active vs Idle', value: activeQ.data != null && idleQ.data != null ? `${fmtDuration(activeQ.data)} / ${fmtDuration(idleQ.data)}` : '—' },
    { icon: Camera, color: 'bg-purple-500', label: 'Screenshot Count', value: screenshotCountQ.data ?? '—' },
    { icon: Clock, color: 'bg-orange-500', label: 'Total Monitoring Time', value: monitoringTimeQ.data != null ? fmtDuration(monitoringTimeQ.data) : '—' },
  ];

  const aggregateMutation = useMutation({
    mutationFn: (body: any) => apiRequest<any>(`${BUILDER}/aggregate`, { method: 'POST', body: JSON.stringify(body) }).then((r: any) => r?.payload),
  });

  React.useEffect(() => {
    if (dimKey === 'apps') aggregateMutation.mutate({ entity: 'app_usage_logs', group_by: 'app_name', metric_field: 'duration_seconds' });
    else if (dimKey === 'websites') aggregateMutation.mutate({ entity: 'app_usage_logs', group_by: 'url', metric_field: 'duration_seconds' });
    else aggregateMutation.mutate({ entity: 'productivity_sessions', group_by: 'user_id', metric_field: 'productivity_score', metric: 'AVG' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimKey]);

  const rows = useMemo(() => {
    const raw = (aggregateMutation.data?.rows || []).filter((r: any) => r[dimKey === 'apps' ? 'app_name' : dimKey === 'websites' ? 'url' : 'user_id']);
    return raw.map((r: any) => {
      if (dimKey === 'employee') {
        const u = (users as any[]).find((x: any) => x.id === r.user_id);
        return { label: u ? `${u.first_name} ${u.last_name}` : r.user_id, value: r.value, isPct: true };
      }
      return { label: r[dimKey === 'apps' ? 'app_name' : 'url'], value: r.value, isPct: false };
    });
  }, [aggregateMutation.data, dimKey, users]);

  const max = Math.max(1, ...rows.map((r: any) => r.value));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', c.color)}>
              <c.icon size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{c.label}</p>
              <p className="text-lg font-black text-gray-900 leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card className="border-none shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Breakdown</p>
          <div className="flex gap-1.5">
            <button onClick={() => setDimKey('apps')} className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition-colors', dimKey === 'apps' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>Top Applications</button>
            <button onClick={() => setDimKey('websites')} className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition-colors', dimKey === 'websites' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>Top Websites</button>
            <button onClick={() => setDimKey('employee')} className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition-colors', dimKey === 'employee' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>User Productivity</button>
          </div>
        </div>
        {aggregateMutation.isPending ? (
          <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No monitoring data for this dimension.</p>
        ) : (
          <div className="space-y-2.5">
            {rows.slice(0, 10).map((r: any, i: number) => (
              <div key={`${r.label}-${i}`} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600 w-40 truncate">{r.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-teal-500" style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
                <span className="text-xs font-black text-gray-900 tabular-nums w-16 text-right">{r.isPct ? `${Math.round(r.value)}%` : fmtDuration(r.value)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

/** Circular SVG progress ring */
const ProgressRing: React.FC<{ pct: number; size?: number; stroke?: number }> = ({ pct, size = 88, stroke = 8 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
};

/** Aggregated stats from productivity records */
function aggregateProductivity(records: any[]) {
  if (!records.length) return null;
  const total_active = records.reduce((s, r) => s + r.active_seconds, 0);
  const total_idle   = records.reduce((s, r) => s + r.idle_seconds, 0);
  const total_mouse  = records.reduce((s, r) => s + r.mouse_events, 0);
  const total_kb     = records.reduce((s, r) => s + r.keyboard_events, 0);
  const avg_score    = records.reduce((s, r) => s + r.productivity_score, 0) / records.length;
  return { total_active, total_idle, total_mouse, total_kb, avg_score };
}

const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Productivity Overview');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [screenshotToDelete, setScreenshotToDelete] = useState<Screenshot | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [ssPage, setSsPage] = useState(1);
  const [prodPage, setProdPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { setSsPage(1); setProdPage(1); }, [selectedUser, dateFrom, dateTo]);

  const { user } = useAuthStore();
  const isSuperAdmin = (user as any)?.roles?.includes('SUPER_ADMIN') || (user as any)?.role_name === 'SUPER_ADMIN';
  const { mutate: deleteScreenshot } = useDeleteScreenshot();
  const { mutate: bulkDelete } = useBulkDeleteScreenshots();

  const { data: users = [] } = useFetchUsersQuery({});

  const prodParams: Record<string, string> = { page: String(prodPage), limit: String(PAGE_SIZE) };
  if (selectedUser) prodParams.user_id = selectedUser;
  if (dateFrom) prodParams.from = dateFrom;
  if (dateTo) prodParams.to = dateTo;
  const hasParams = Object.keys(prodParams).length > 2;

  const { data: productivityData, isLoading: pLoading } = useGetProductivity(prodParams);
  const productivity = (productivityData as any)?.records || [];
  const productivityTotal = (productivityData as any)?.total || 0;
  const { data: appUsage = [], isLoading: appLoading } = useGetAppUsage(hasParams ? prodParams : undefined);

  // Summary cards (avg score, totals) must reflect the whole filtered range,
  // not just the current page — kept as a separate unpaginated query so
  // paginating the table doesn't change the KPI numbers underneath it.
  const summaryParams: Record<string, string> = { page: '1', limit: '1000' };
  if (selectedUser) summaryParams.user_id = selectedUser;
  if (dateFrom) summaryParams.from = dateFrom;
  if (dateTo) summaryParams.to = dateTo;
  const { data: productivitySummaryData } = useGetProductivity(summaryParams);
  const productivitySummary = (productivitySummaryData as any)?.records || [];

  const ssParams: Record<string, string> = { page: String(ssPage), limit: String(PAGE_SIZE) };
  if (selectedUser) ssParams.user_id = selectedUser;
  if (dateFrom) ssParams.from = dateFrom;
  if (dateTo) ssParams.to = dateTo;

  const { data: ssData, isLoading: ssLoading } = useGetScreenshots(ssParams);
  const screenshots: Screenshot[] = (ssData as any)?.records || [];

  const userOptions = [
    { value: '', label: 'All Employees' },
    ...(users as any[]).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
  ];

  const agg = aggregateProductivity(productivitySummary as any[]);
  const totalAppSecs = appUsage.reduce((s, a) => s + a.duration_seconds, 0);

  const prodCols: Column<any>[] = [
    {
      header: 'Employee',
      key: 'user_id',
      render: (r) => (
        <span className="font-black text-gray-900">
          {r.user ? `${r.user.first_name} ${r.user.last_name}` : r.user_id.slice(0, 8)}
        </span>
      ),
    },
    {
      header: 'Date',
      key: 'date',
      render: (r) => new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    },
    {
      header: 'Active Time',
      key: 'active_seconds',
      render: (r) => <span className="font-bold text-green-600">{fmtDuration(r.active_seconds)}</span>,
    },
    {
      header: 'Idle Time',
      key: 'idle_seconds',
      render: (r) => <span className="font-bold text-gray-400">{fmtDuration(r.idle_seconds)}</span>,
    },
    {
      header: 'Mouse Events',
      key: 'mouse_events',
      render: (r) => <span className="font-medium">{r.mouse_events.toLocaleString()}</span>,
    },
    {
      header: 'KB Events',
      key: 'keyboard_events',
      render: (r) => <span className="font-medium">{r.keyboard_events.toLocaleString()}</span>,
    },
    {
      header: 'Score',
      key: 'productivity_score',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', r.productivity_score >= 70 ? 'bg-green-500' : r.productivity_score >= 40 ? 'bg-yellow-500' : 'bg-red-500')}
              style={{ width: `${r.productivity_score}%` }}
            />
          </div>
          <span className="font-black text-sm">{Math.round(r.productivity_score)}%</span>
        </div>
      ),
    },
  ];

  const allSelected = screenshots.length > 0 && screenshots.every((s) => selectedIds.has(s.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(screenshots.map((s) => s.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    setConfirmBulkDelete(true);
  };

  const confirmBulkDeleteNow = () => {
    const ids = Array.from(selectedIds);
    setConfirmBulkDelete(false);
    setIsBulkDeleting(true);
    bulkDelete(ids, {
      onSettled: () => {
        setIsBulkDeleting(false);
        setSelectedIds(new Set());
      },
    });
  };

  const ssCols: Column<Screenshot>[] = [
    ...(isSuperAdmin ? [{
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
        />
      ) as any,
      key: '__select__' as keyof Screenshot,
      render: (r: Screenshot) => (
        <input
          type="checkbox"
          checked={selectedIds.has(r.id)}
          onChange={() => toggleOne(r.id)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
        />
      ),
    }] : []),
    {
      header: 'Employee',
      key: 'user_id',
      render: (r) => (
        <span className="font-black text-gray-900">
          {r.user ? `${r.user.first_name} ${r.user.last_name}` : r.user_id.slice(0, 8)}
        </span>
      ),
    },
    {
      header: 'Captured At',
      key: 'captured_at',
      render: (r) =>
        new Date(r.captured_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
    },
    {
      header: 'Preview',
      key: 'file_url',
      render: (r) =>
        r.file_url ? (
          <a href={r.file_url} target="_blank" rel="noopener noreferrer" title="Click to open full screenshot">
            <img
              src={r.file_url}
              alt="Screenshot"
              className="h-12 w-20 object-cover rounded-lg border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </a>
        ) : (
          <span className="text-xs text-gray-400 font-medium font-mono">{r.file_key.split('/').pop()}</span>
        ),
    },
    ...(isSuperAdmin ? [{
      header: '',
      key: 'id' as keyof Screenshot,
      render: (r: Screenshot) => (
        <button
          onClick={() => setScreenshotToDelete(r)}
          disabled={deletingId === r.id}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          title="Delete screenshot"
        >
          <Trash2 size={15} />
        </button>
      ),
    }] : []),
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Employee Monitoring</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Track productivity sessions and screenshot history from the desktop agent.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-52">
          <Select
            options={userOptions}
            value={selectedUser}
            onChange={(v) => setSelectedUser(v as string)}
            className="h-10 !rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">FROM</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-100 outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">TO</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-100 outline-none" />
        </div>
      </div>

      <Tabs options={TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'Productivity Overview' && (
        <div className="flex flex-col gap-6">
          {/* Activity % + App Usage panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity % Panel */}
            <Card className="border-none shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Activity size={18} className="text-primary-500" />
                <h3 className="text-base font-black text-gray-900">Productivity Score</h3>
              </div>
              {pLoading ? (
                <div className="flex items-center justify-center h-40"><StatSkeleton /></div>
              ) : agg ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    <ProgressRing pct={Math.round(agg.avg_score)} size={100} stroke={10} />
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-gray-900">{Math.round(agg.avg_score)}%</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Score</span>
                    </div>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-0.5">Active Time</p>
                      <p className="text-lg font-black text-gray-900">{fmtDuration(agg.total_active)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Idle Time</p>
                      <p className="text-lg font-black text-gray-900">{fmtDuration(agg.total_idle)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Mouse Events</p>
                      <p className="text-lg font-black text-gray-900">{agg.total_mouse.toLocaleString()}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-0.5">Keyboard Events</p>
                      <p className="text-lg font-black text-gray-900">{agg.total_kb.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 font-medium text-center py-10">No productivity data available.</p>
              )}
            </Card>

            {/* App Usage Panel */}
            <Card className="border-none shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Cpu size={18} className="text-primary-500" />
                <h3 className="text-base font-black text-gray-900">App Usage</h3>
              </div>
              {appLoading ? (
                <div className="flex items-center justify-center h-40"><StatSkeleton /></div>
              ) : appUsage.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {appUsage.slice(0, 8).map((app) => {
                    const pct = totalAppSecs > 0 ? Math.round((app.duration_seconds / totalAppSecs) * 100) : (app.percentage ?? 0);
                    return (
                      <div key={app.app_name} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] font-black shrink-0">
                              {app.app_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-gray-800 truncate max-w-[140px]">{app.app_name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-gray-500">{fmtMinutes(app.duration_seconds)}</span>
                            <span className="text-xs font-black text-gray-400 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                        {/* CSS-only horizontal bar */}
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 font-medium text-center py-10">No app usage data available.</p>
              )}
            </Card>
          </div>

          {/* Detailed table */}
          <Card className="border-none shadow-sm">
            <Table
              columns={prodCols}
              data={productivity as any[]}
              isLoading={pLoading}
              emptyMessage="No productivity data. Desktop agent must be running."
              pagination={{
                currentPage: prodPage,
                totalPages: Math.max(1, Math.ceil(productivityTotal / PAGE_SIZE)),
                onPageChange: setProdPage,
                totalEntries: productivityTotal,
                entriesPerPage: PAGE_SIZE,
              }}
            />
          </Card>
        </div>
      )}

      {activeTab === 'Screenshot History' && (
        <Card className="border-none shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-400">
              Total screenshots: <strong className="text-gray-700">{(ssData as any)?.total || 0}</strong>
              <span className="ml-2 text-xs">(Screenshots captured by desktop agent)</span>
            </p>
            {isSuperAdmin && selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={14} />
                {isBulkDeleting ? 'Deleting…' : `Delete Selected (${selectedIds.size})`}
              </button>
            )}
          </div>
          <Table
            columns={ssCols}
            data={screenshots}
            isLoading={ssLoading}
            emptyMessage="No screenshots yet. Desktop agent must be running to capture screenshots."
            pagination={{
              currentPage: ssPage,
              totalPages: Math.max(1, Math.ceil(((ssData as any)?.total || 0) / PAGE_SIZE)),
              onPageChange: setSsPage,
              totalEntries: (ssData as any)?.total || 0,
              entriesPerPage: PAGE_SIZE,
            }}
          />
        </Card>
      )}

      {activeTab === 'Reports' && <MonitoringReportsTab />}

      <ActionModal
        isOpen={!!screenshotToDelete}
        onClose={() => setScreenshotToDelete(null)}
        onConfirm={() => {
          if (!screenshotToDelete) return;
          setDeletingId(screenshotToDelete.id);
          deleteScreenshot(screenshotToDelete.id, { onSettled: () => setDeletingId(null) });
          setScreenshotToDelete(null);
        }}
        title="Delete Screenshot"
        description="This screenshot will also be removed from S3. This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        icon="delete"
      />

      <ActionModal
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={confirmBulkDeleteNow}
        title="Delete Screenshots"
        description={`Delete ${selectedIds.size} screenshot(s)? They will also be removed from S3.`}
        confirmText="Delete"
        confirmVariant="danger"
        icon="delete"
        loading={isBulkDeleting}
      />
    </div>
  );
};

export default MonitoringPage;
