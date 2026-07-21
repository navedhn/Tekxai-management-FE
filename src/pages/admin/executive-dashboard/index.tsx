import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import {
  Users, Briefcase, Ticket, Package, DollarSign, Wallet,
  Activity, Gauge, AlertTriangle, Clock, CalendarClock,
  TrendingUp, TrendingDown, Monitor, Camera, AppWindow, ShieldAlert,
  UserPlus, UserMinus, Flag, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useGetExecutiveDashboard } from '@/services/executiveAnalyticsService';

// Sprint 2 Milestone 1 — Executive Dashboard. Pure orchestration layer: every
// number rendered here comes from the (now-extended) /executive-analytics
// dashboard endpoint, which itself composes existing services + the generic
// report_builder KPI/aggregate engine — nothing is recalculated client-side.
// Every card below links back to the existing module page it summarizes
// (Phase 4 drill-down requirement) rather than duplicating that page's view.

function fmtMoney(n?: number | null) {
  if (n == null) return '—';
  return `PKR ${Math.round(n).toLocaleString()}`;
}
function fmtNum(n?: number | null) {
  return n == null ? '—' : n.toLocaleString();
}
function fmtPct(n?: number | null) {
  return n == null ? '—' : `${n}%`;
}
function fmtSeconds(n?: number | null) {
  if (n == null) return '—';
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  return `${h}h ${m}m`;
}

function KpiCard({
  icon: Icon, color, label, value, onClick,
}: { icon: React.ElementType; color: string; label: string; value: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-left w-full transition-shadow',
        onClick && 'hover:shadow-md cursor-pointer'
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg font-black text-gray-900 leading-tight truncate">{value}</p>
      </div>
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{title}</p>;
}

// Sprint 2 Milestone 3 — Executive Action Center. Every item is
// {key, label, count, priority, path} straight from the backend's
// action_center bucket — already deterministically sorted by priority
// there (see prioritize_alerts()-style sort_by_priority in
// executive-analytics.service.js). This component only renders; no
// re-sorting, re-filtering, or re-fetching happens here.
type ActionItem = { key: string; label: string; count: number; priority: string; path: string };

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

function ActionCenterColumn({
  title, items, emptyLabel, navigate,
}: { title: string; items: ActionItem[]; emptyLabel: string; navigate: (path: string) => void }) {
  return (
    <Card className="border-none shadow-sm p-5 flex-1 min-w-0">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-3">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 truncate">
                <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0', PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.low)}>{item.priority}</span>
                <span className="truncate">{item.label}</span>
              </span>
              <span className="text-xs font-black text-gray-900 tabular-nums shrink-0 ml-2">{item.count}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

// Sprint 2 Milestone 2 — Executive Insights. `trend` is {current, previous,
// delta_pct} straight from the backend's trend_kpi() helper — two
// report_builder KPI calls, no client-side recalculation. `invertGood` flips
// the up/down color for metrics where a rise is bad news (e.g. attrition).
function TrendCard({
  icon: Icon, color, label, trend, invertGood = false, format = 'num', onClick,
}: {
  icon: React.ElementType; color: string; label: string;
  trend?: { current: number | null; previous: number | null; delta_pct: number } | null;
  invertGood?: boolean; format?: 'num' | 'money' | 'pct'; onClick?: () => void;
}) {
  const fmt = format === 'money' ? fmtMoney : format === 'pct' ? fmtPct : fmtNum;
  const delta = trend?.delta_pct ?? null;
  const isUp = delta != null && delta > 0;
  const isGood = delta == null ? null : invertGood ? delta <= 0 : delta >= 0;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-left w-full transition-shadow',
        onClick && 'hover:shadow-md cursor-pointer'
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-black text-gray-900 leading-tight truncate">{trend ? fmt(trend.current) : '—'}</p>
          {trend && delta != null && (
            <span className={cn(
              'flex items-center gap-0.5 text-[11px] font-bold tabular-nums',
              isGood === null ? 'text-gray-400' : isGood ? 'text-green-600' : 'text-red-600'
            )}>
              {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta)}%
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetExecutiveDashboard();

  const co = data?.company_overview;
  const ops = data?.operations;
  const fin = data?.financial;
  const prod = data?.productivity;
  const insights = data?.insights;
  const priorityAlerts = data?.priority_alerts as Array<{ key: string; label: string; count: number; severity: string }> | undefined;
  const actionCenter = data?.action_center as {
    requires_attention: ActionItem[]; requires_review: ActionItem[]; informational: ActionItem[];
  } | undefined;

  const alertMeta: Record<string, { icon: React.ElementType; path: string; cls: string }> = {
    overdue_tickets:      { icon: Ticket,       path: '/admin/tickets',           cls: 'bg-red-50 text-red-800 hover:bg-red-100' },
    blocked_projects:     { icon: Briefcase,    path: '/admin/project-tracking',  cls: 'bg-orange-50 text-orange-800 hover:bg-orange-100' },
    overdue_approvals:    { icon: ShieldAlert,  path: '/admin/approvals',         cls: 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100' },
    compliance_reminders: { icon: ShieldAlert,  path: '/admin/policies',          cls: 'bg-purple-50 text-purple-800 hover:bg-purple-100' },
    probation_reminders:  { icon: Users,        path: '/hr/employee-directory',   cls: 'bg-blue-50 text-blue-800 hover:bg-blue-100' },
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Executive Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Company-wide operations, financial, and productivity overview.</p>
      </div>

      {/* Executive Action Center — Sprint 2 Milestone 3. Turns insights into
          direct navigation: every card here reuses an already-computed count
          (from operations/insights/alerts, or a handful of independent
          lookups) and drills into the existing page that owns that workflow —
          no new action pages, no new approval/assignment/escalation flow. */}
      {actionCenter && (
        <div>
          <SectionHeader title="Executive Action Center" />
          <div className="flex flex-col lg:flex-row gap-4">
            <ActionCenterColumn title="Requires Immediate Attention" items={actionCenter.requires_attention} emptyLabel="Nothing urgent right now." navigate={navigate} />
            <ActionCenterColumn title="Requires Review" items={actionCenter.requires_review} emptyLabel="No open review items." navigate={navigate} />
            <ActionCenterColumn title="Informational" items={actionCenter.informational} emptyLabel="No recent activity to report." navigate={navigate} />
          </div>
        </div>
      )}

      {/* Company Overview */}
      <div>
        <SectionHeader title="Company Overview" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard icon={Users} color="bg-blue-500" label="Employees" value={fmtNum(co?.employees)} onClick={() => navigate('/hr/employee-directory')} />
          <KpiCard icon={Briefcase} color="bg-indigo-500" label="Active Projects" value={fmtNum(co?.active_projects)} onClick={() => navigate('/admin/project-tracking')} />
          <KpiCard icon={Ticket} color="bg-orange-500" label="Open Tickets" value={fmtNum(co?.open_tickets)} onClick={() => navigate('/admin/tickets')} />
          <KpiCard icon={Package} color="bg-purple-500" label="Active Assets" value={fmtNum(co?.active_assets)} onClick={() => navigate('/admin/assets')} />
          <KpiCard icon={DollarSign} color="bg-teal-500" label="Monthly Expense" value={fmtMoney(co?.monthly_expense)} onClick={() => navigate('/admin/expenses')} />
          <KpiCard icon={Wallet} color="bg-green-600" label="Current Payroll" value={fmtMoney(co?.current_payroll)} onClick={() => navigate('/admin/payroll')} />
        </div>
      </div>

      {/* Operations */}
      <div>
        <SectionHeader title="Operations" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard
            icon={Activity}
            color="bg-emerald-500"
            label="Project Health"
            value={ops?.project_health ? `${ops.project_health.healthy}H / ${ops.project_health.warning}W / ${ops.project_health.critical}C` : '—'}
            onClick={() => navigate('/admin/project-tracking')}
          />
          <KpiCard icon={AlertTriangle} color="bg-red-500" label="Blocked Projects" value={fmtNum(ops?.blocked_projects)} onClick={() => navigate('/admin/project-tracking')} />
          <KpiCard icon={Clock} color="bg-rose-500" label="Ticket SLA Overdue" value={fmtNum(ops?.ticket_sla_overdue)} onClick={() => navigate('/admin/tickets')} />
          <KpiCard icon={Gauge} color="bg-sky-500" label="Attendance Today" value={fmtNum(ops?.attendance_today)} onClick={() => navigate('/admin/attendance')} />
          <KpiCard icon={Clock} color="bg-amber-500" label="Late Today" value={fmtNum(ops?.late_employees_today)} onClick={() => navigate('/admin/attendance')} />
          <KpiCard icon={CalendarClock} color="bg-cyan-500" label="On Leave Today" value={fmtNum(ops?.leave_today)} onClick={() => navigate('/admin/attendance')} />
        </div>
      </div>

      {/* Financial */}
      <div>
        <SectionHeader title="Financial" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={DollarSign} color="bg-teal-500" label="Monthly Expense" value={fmtMoney(fin?.monthly_expense)} onClick={() => navigate('/admin/expenses')} />
          <KpiCard icon={Wallet} color="bg-green-600" label="Payroll Cost" value={fmtMoney(fin?.payroll_cost)} onClick={() => navigate('/admin/payroll')} />
          <KpiCard icon={Package} color="bg-purple-500" label="Asset Value" value={fmtMoney(fin?.asset_value)} onClick={() => navigate('/admin/assets')} />
          <KpiCard icon={TrendingUp} color="bg-indigo-500" label="Budget Utilization" value={fmtPct(fin?.budget_utilization_pct)} onClick={() => navigate('/admin/project-tracking')} />
        </div>
      </div>

      {/* Productivity */}
      <div>
        <SectionHeader title="Productivity" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard icon={Gauge} color="bg-green-500" label="Productivity %" value={fmtPct(prod?.productivity_pct)} onClick={() => navigate('/admin/monitoring')} />
          <KpiCard icon={Monitor} color="bg-blue-500" label="Monitoring Coverage" value={fmtPct(prod?.monitoring_coverage_pct)} onClick={() => navigate('/admin/monitoring')} />
          <KpiCard icon={Camera} color="bg-purple-500" label="Screenshot Count" value={fmtNum(prod?.screenshot_count)} onClick={() => navigate('/admin/monitoring')} />
          <KpiCard icon={AppWindow} color="bg-orange-500" label="Top Applications" value={prod?.top_applications?.[0]?.app_name || '—'} onClick={() => navigate('/admin/monitoring')} />
        </div>
        {prod?.top_applications?.length > 0 && (
          <Card className="border-none shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Top Applications by Usage Time</p>
            <div className="space-y-2.5">
              {prod.top_applications.map((a: any, i: number) => {
                const max = prod.top_applications[0]?.value || 1;
                return (
                  <div key={`${a.app_name}-${i}`} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-600 w-40 truncate">{a.app_name || 'Unknown'}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-orange-500" style={{ width: `${(a.value / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-black text-gray-900 tabular-nums w-16 text-right">{fmtSeconds(a.value)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Executive Insights — Sprint 2 Milestone 2. Every trend below is the
          same generic report_builder KPI call made twice (current window vs.
          the prior window of equal length) by the backend's trend_kpi()
          helper — no new calculation surface, just period comparison. */}
      <div>
        <SectionHeader title="Executive Insights" />

        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-1">Workforce</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <TrendCard icon={UserPlus} color="bg-blue-500" label="Hiring (30d)" trend={insights?.workforce?.hiring_trend_30d} onClick={() => navigate('/hr/employee-directory')} />
          <KpiCard icon={Users} color="bg-indigo-500" label="Employee Growth" value={fmtNum(insights?.workforce?.employee_growth)} onClick={() => navigate('/hr/employee-directory')} />
          <TrendCard icon={UserMinus} color="bg-red-500" label="Attrition (30d)" trend={insights?.workforce?.attrition_30d} invertGood onClick={() => navigate('/hr/employee-directory')} />
          <KpiCard icon={Clock} color="bg-amber-500" label="Probation Ending Soon" value={fmtNum(insights?.workforce?.probation_ending_soon)} onClick={() => navigate('/hr/employee-directory')} />
        </div>

        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard icon={AlertTriangle} color="bg-orange-500" label="Projects at Risk" value={fmtNum(insights?.delivery?.projects_at_risk)} onClick={() => navigate('/admin/project-tracking')} />
          <KpiCard icon={Briefcase} color="bg-red-500" label="Projects Blocked" value={fmtNum(insights?.delivery?.projects_blocked)} onClick={() => navigate('/admin/project-tracking')} />
          <KpiCard icon={Flag} color="bg-indigo-500" label="Upcoming Milestones (7d)" value={fmtNum(insights?.delivery?.upcoming_milestones_7d)} onClick={() => navigate('/admin/project-tracking')} />
          <KpiCard icon={TrendingUp} color="bg-rose-500" label="Budget Overrun Risk" value={fmtNum(insights?.delivery?.budget_overrun_risk_count)} onClick={() => navigate('/admin/project-tracking')} />
        </div>

        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Financial</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <TrendCard icon={DollarSign} color="bg-teal-500" label="Expense Trend (30d)" trend={insights?.financial?.expense_trend_30d} format="money" invertGood onClick={() => navigate('/admin/expenses')} />
          <TrendCard icon={Wallet} color="bg-green-600" label="Payroll Trend (MoM)" trend={insights?.financial?.payroll_trend_mom} format="money" invertGood onClick={() => navigate('/admin/payroll')} />
          <KpiCard icon={TrendingDown} color="bg-gray-400" label="Budget Utilization Trend" value="No history tracked" onClick={() => navigate('/admin/project-tracking')} />
        </div>

        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Productivity</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <TrendCard icon={Gauge} color="bg-green-500" label="Productivity Trend (7d)" trend={insights?.productivity?.productivity_trend_7d} format="pct" onClick={() => navigate('/admin/monitoring')} />
          <TrendCard icon={Monitor} color="bg-blue-500" label="Monitoring Coverage Trend (7d)" trend={insights?.productivity?.monitoring_coverage_trend_7d} format="pct" onClick={() => navigate('/admin/monitoring')} />
          <TrendCard icon={Clock} color="bg-amber-500" label="Late Attendance Trend (7d)" trend={insights?.productivity?.attendance_late_trend_7d} invertGood onClick={() => navigate('/admin/attendance')} />
        </div>

        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Service Desk</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <TrendCard icon={Ticket} color="bg-orange-500" label="Ticket Volume Trend (30d)" trend={insights?.service_desk?.ticket_volume_trend_30d} invertGood onClick={() => navigate('/admin/tickets')} />
          <TrendCard icon={Activity} color="bg-emerald-500" label="Resolution Trend (30d)" trend={insights?.service_desk?.resolution_trend_30d} onClick={() => navigate('/admin/tickets')} />
          <KpiCard icon={Clock} color="bg-gray-400" label="SLA Trend" value="No history tracked" onClick={() => navigate('/admin/tickets')} />
        </div>
      </div>

      {/* Executive Alerts — reuses the exact counts from `alerts` (Milestone
          1); this section only ranks/labels them by severity, no new alert
          source. */}
      <div>
        <SectionHeader title="Executive Alerts" />
        <Card className="border-none shadow-sm p-5">
          {priorityAlerts && priorityAlerts.length > 0 ? (
            <div className="space-y-2">
              {priorityAlerts.map((a) => {
                const meta = alertMeta[a.key];
                const Icon = meta?.icon || ShieldAlert;
                return (
                  <button
                    key={a.key}
                    onClick={() => meta && navigate(meta.path)}
                    className={cn('w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left', meta?.cls || 'bg-gray-50 text-gray-800 hover:bg-gray-100')}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon size={16} />
                      {a.label}
                      <span className={cn(
                        'text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ml-1',
                        a.severity === 'high' ? 'bg-red-200 text-red-800' : a.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-600'
                      )}>{a.severity}</span>
                    </span>
                    <span className="text-sm font-black tabular-nums">{a.count}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No active alerts — everything is on track.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
