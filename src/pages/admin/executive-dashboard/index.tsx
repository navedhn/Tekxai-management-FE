import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import {
  Users, Briefcase, Ticket, Package, DollarSign, Wallet,
  Activity, Gauge, AlertTriangle, Clock, CalendarClock,
  ArrowUpRight, ArrowDownRight, UserPlus,
  Search, Lightbulb, ClipboardList, ShieldAlert, UserMinus,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useGetExecutiveDashboard } from '@/services/executiveAnalyticsService';

// Sprint 3 — Executive Dashboard redesign. An executive dashboard answers
// "what requires my attention today", not "here is every metric we track" —
// so this page intentionally shows only: one summary, an action center,
// <=8 company-health KPIs, a handful of trend widgets, a dedicated risks
// list, root-cause panels, and AI recommendations. Anything more granular
// (the old ~30-card Company Overview/Operations/Financial/Productivity/
// Executive Insights wall) belongs in each module's own report screen, not
// here — this pass removes those sections rather than trims them, per the
// "raw data belongs in reports" instruction. UI-only: still reads from the
// exact same /executive-analytics dashboard payload, no backend changes.
// A few spec items (Revenue, Project Delivery Trend, Contracts Expiring,
// Assets Due as a distinct "due" concept) have no backing field anywhere in
// that payload — they're left out rather than faked; the closest existing
// equivalents (Pending Asset Returns, Compliance Reminders, Payroll Not
// Processed) are used instead where one exists.

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

// Shared by "Top Applications by Usage Time" and the Root Cause factor
// breakdowns below — both render the same {label, value} bar-list shape,
// just with a different value formatter.
function BarList({ items, formatValue }: { items: { label: string; value: number }[]; formatValue: (n: number) => string }) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-600 w-40 truncate">{item.label || 'Unknown'}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-orange-500" style={{ width: `${(Math.abs(item.value) / max) * 100}%` }} />
          </div>
          <span className="text-xs font-black text-gray-900 tabular-nums w-16 text-right">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Sprint 2 Milestone 3 — Executive Action Center. Every item is
// {key, label, count, priority, path} straight from the backend's
// action_center bucket — already deterministically sorted by priority
// there (see prioritize_alerts()-style sort_by_priority in
// executive-analytics.service.js). This component only renders; no
// re-sorting, re-filtering, or re-fetching happens here.
type ActionItem = { key: string; label: string; count: number; priority: string; path: string };

// Sprint 2 Milestone 4 — Executive Drill-down & Decision Support. Every
// field below comes straight from the backend's root_cause/recommendations/
// executive_summary — see build_root_cause() etc. in
// executive-analytics.service.js. No client-side calculation; this only
// renders what the API already computed.
type RootCausePanel = { key: string; kpi: string; summary: string; factors: { label: string; value: number }[]; path: string };
type Recommendation = { recommendation: string; reason: string; priority: string; path: string };
type ExecutiveSummary = { critical_issues: number; high_priority_items: number; recommendations_count: number; highlights: string[] };

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
  const rootCause = data?.root_cause as RootCausePanel[] | undefined;
  const recommendations = data?.recommendations as Recommendation[] | undefined;
  const execSummary = data?.executive_summary as ExecutiveSummary | undefined;
  const pmHealth = data?.project_management_health as {
    projects_at_risk: number; delayed_projects: number; upcoming_deliveries: number;
    missing_milestones: number;
    // 4-tier Green/Yellow/Orange/Red (was a 2-way healthy/at_risk split).
    milestone_health: { healthy: number; at_risk: number; warning: number; critical: number };
  } | undefined;

  // Risks section — pulled from the same action-center items already
  // rendered above, just re-surfaced as a dedicated "what could go wrong"
  // list per the spec's Risks section, instead of only living inside the
  // three action-center columns.
  const allActionItems: ActionItem[] = [
    ...(actionCenter?.requires_attention || []),
    ...(actionCenter?.requires_review || []),
  ];
  const findAction = (key: string) => allActionItems.find((i) => i.key === key);

  const riskMeta: Record<string, { icon: React.ElementType; path: string; cls: string }> = {
    projects_at_risk:      { icon: AlertTriangle, path: '/admin/project-tracking',   cls: 'bg-red-50 text-red-800 hover:bg-red-100' },
    blocked_projects:      { icon: Briefcase,     path: '/admin/project-tracking',   cls: 'bg-orange-50 text-orange-800 hover:bg-orange-100' },
    payroll_not_processed: { icon: Wallet,        path: '/admin/payroll',            cls: 'bg-red-50 text-red-800 hover:bg-red-100' },
    pending_asset_returns: { icon: Package,       path: '/admin/assets',             cls: 'bg-purple-50 text-purple-800 hover:bg-purple-100' },
    compliance_reminders:  { icon: ShieldAlert,   path: '/admin/policies',           cls: 'bg-purple-50 text-purple-800 hover:bg-purple-100' },
    overdue_approvals:     { icon: ShieldAlert,   path: '/admin/approvals',          cls: 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100' },
    ticket_sla_overdue:    { icon: Ticket,        path: '/admin/tickets',            cls: 'bg-red-50 text-red-800 hover:bg-red-100' },
    probation_reminders:   { icon: UserMinus,     path: '/admin/employee-directory', cls: 'bg-blue-50 text-blue-800 hover:bg-blue-100' },
  };

  const risks: { key: string; label: string; count: number }[] = [
    { key: 'projects_at_risk', label: 'Projects At Risk', count: pmHealth?.projects_at_risk || 0 },
    ...(findAction('blocked_projects') ? [{ key: 'blocked_projects', label: 'Blocked Projects', count: findAction('blocked_projects')!.count }] : []),
    ...(findAction('payroll_not_processed') ? [{ key: 'payroll_not_processed', label: 'Payroll Not Processed', count: findAction('payroll_not_processed')!.count }] : []),
    ...(findAction('pending_asset_returns') ? [{ key: 'pending_asset_returns', label: 'Pending Asset Returns', count: findAction('pending_asset_returns')!.count }] : []),
    ...(findAction('overdue_approvals') ? [{ key: 'overdue_approvals', label: 'Overdue Approvals', count: findAction('overdue_approvals')!.count }] : []),
    ...((ops?.ticket_sla_overdue || 0) > 0 ? [{ key: 'ticket_sla_overdue', label: 'Ticket SLA Overdue', count: ops.ticket_sla_overdue }] : []),
    ...(priorityAlerts?.find((a) => a.key === 'compliance_reminders') ? [{ key: 'compliance_reminders', label: 'Compliance Reminders', count: priorityAlerts.find((a) => a.key === 'compliance_reminders')!.count }] : []),
    ...(priorityAlerts?.find((a) => a.key === 'probation_reminders') ? [{ key: 'probation_reminders', label: 'Probation Reminders', count: priorityAlerts.find((a) => a.key === 'probation_reminders')!.count }] : []),
  ].filter((r) => r.count > 0);

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

      {/* Executive Summary — Sprint 2 Milestone 4. A single roll-up of counts
          already computed by the Action Center above plus a handful of
          insight trends — no new calculation, just the headline numbers an
          executive would otherwise have to skim every section to find. */}
      {execSummary && (
        <Card className="border-none shadow-sm p-5 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ClipboardList size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-wider">Executive Summary</p>
              <p className="text-sm font-semibold mt-0.5">
                {execSummary.critical_issues} critical issue{execSummary.critical_issues === 1 ? '' : 's'} · {execSummary.high_priority_items} high-priority item{execSummary.high_priority_items === 1 ? '' : 's'} · {execSummary.recommendations_count} recommendation{execSummary.recommendations_count === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {execSummary.highlights.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {execSummary.highlights.map((h, i) => (
                <li key={i} className="text-xs font-semibold bg-white/10 rounded-lg px-2.5 py-1.5">{h}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

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

      {/* Company Health — spec caps this at 8 KPI cards, so this replaces the
          old Company Overview + Operations + Financial + Productivity wall
          (~20 cards). One representative metric per domain; anything more
          granular belongs on that module's own page (each card still drills
          there). */}
      <div>
        <SectionHeader title="Company Health" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={Users} color="bg-blue-500" label="Employees" value={fmtNum(co?.employees)} onClick={() => navigate('/admin/employee-directory')} />
          <KpiCard icon={Briefcase} color="bg-indigo-500" label="Active Projects" value={fmtNum(co?.active_projects)} onClick={() => navigate('/admin/project-tracking')} />
          <KpiCard icon={Gauge} color="bg-sky-500" label="Attendance Today" value={fmtNum(ops?.attendance_today)} onClick={() => navigate('/admin/attendance')} />
          <KpiCard icon={Ticket} color="bg-orange-500" label="Open Tickets" value={fmtNum(co?.open_tickets)} onClick={() => navigate('/admin/tickets')} />
          <KpiCard icon={Package} color="bg-purple-500" label="Active Assets" value={fmtNum(co?.active_assets)} onClick={() => navigate('/admin/assets')} />
          <KpiCard icon={DollarSign} color="bg-teal-500" label="Monthly Expense" value={fmtMoney(fin?.monthly_expense)} onClick={() => navigate('/admin/finance/expenses')} />
          <KpiCard icon={Wallet} color="bg-green-600" label="Current Payroll" value={fmtMoney(co?.current_payroll)} onClick={() => navigate('/admin/payroll')} />
          <KpiCard icon={Activity} color="bg-emerald-500" label="Productivity" value={fmtPct(prod?.productivity_pct)} onClick={() => navigate('/admin/monitoring')} />
        </div>
      </div>

      {/* Project Health — one consolidated scorecard replacing the previous
          five separate cards (Projects At Risk / Delayed / Upcoming
          Deliveries / Missing Milestones / Milestone Health), per the
          spec's explicit "remove duplicated KPI cards, create one Project
          Health widget" instruction. Same pmHealth data, just one click
          target instead of five. */}
      {pmHealth && (
        <button
          onClick={() => navigate('/admin/project-tracking')}
          className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Project Health</p>
            {pmHealth.milestone_health && (
              <span className="text-[11px] font-black tabular-nums text-gray-500">
                {pmHealth.milestone_health.healthy}G · {pmHealth.milestone_health.at_risk}Y · {pmHealth.milestone_health.warning}O · {pmHealth.milestone_health.critical}R
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span className="text-sm"><b className="text-gray-900">{fmtNum(pmHealth.projects_at_risk)}</b> <span className="text-gray-500">at risk</span></span>
            <span className="text-sm"><b className="text-gray-900">{fmtNum(pmHealth.delayed_projects)}</b> <span className="text-gray-500">delayed</span></span>
            <span className="text-sm"><b className="text-gray-900">{fmtNum(pmHealth.upcoming_deliveries)}</b> <span className="text-gray-500">upcoming deliveries</span></span>
            <span className="text-sm"><b className="text-gray-900">{fmtNum(pmHealth.missing_milestones)}</b> <span className="text-gray-500">missing milestones</span></span>
          </div>
        </button>
      )}

      {/* Trend Widgets — six period-over-period trends instead of the old
          20-card Executive Insights wall; each still links to its module.
          "Revenue Trend" and "Project Delivery Trend" from the spec have no
          backing field anywhere in the dashboard payload (no revenue concept
          exists yet, and delivery health has no historical snapshot to trend
          against) — omitted rather than faked. */}
      <div>
        <SectionHeader title="Trend Widgets" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <TrendCard icon={UserPlus} color="bg-blue-500" label="Hiring Trend (30d)" trend={insights?.workforce?.hiring_trend_30d} onClick={() => navigate('/admin/employee-directory')} />
          <TrendCard icon={UserMinus} color="bg-red-500" label="Attrition Trend (30d)" trend={insights?.workforce?.attrition_30d} invertGood onClick={() => navigate('/admin/employee-directory')} />
          <TrendCard icon={Clock} color="bg-amber-500" label="Attendance Lateness Trend (7d)" trend={insights?.productivity?.attendance_late_trend_7d} invertGood onClick={() => navigate('/admin/attendance')} />
          <TrendCard icon={DollarSign} color="bg-teal-500" label="Expense Trend (30d)" trend={insights?.financial?.expense_trend_30d} format="money" invertGood onClick={() => navigate('/admin/finance/expenses')} />
          <TrendCard icon={Wallet} color="bg-green-600" label="Payroll Trend (MoM)" trend={insights?.financial?.payroll_trend_mom} format="money" invertGood onClick={() => navigate('/admin/payroll')} />
          <TrendCard icon={Gauge} color="bg-emerald-500" label="Productivity Trend (7d)" trend={insights?.productivity?.productivity_trend_7d} format="pct" onClick={() => navigate('/admin/monitoring')} />
        </div>
      </div>

      {/* Risks — the spec's dedicated "what could go wrong" section, built
          from the same action-center/alert data already fetched above (no
          new backend calls). Contracts Expiring and a distinct "Assets Due"
          concept aren't computed anywhere in this payload — Pending Asset
          Returns is used as the closest existing equivalent. */}
      <div>
        <SectionHeader title="Risks" />
        <Card className="border-none shadow-sm p-5">
          {risks.length > 0 ? (
            <div className="space-y-2">
              {risks.map((r) => {
                const meta = riskMeta[r.key];
                const Icon = meta?.icon || ShieldAlert;
                return (
                  <button
                    key={r.key}
                    onClick={() => meta && navigate(meta.path)}
                    className={cn('w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left', meta?.cls || 'bg-gray-50 text-gray-800 hover:bg-gray-100')}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon size={16} />
                      {r.label}
                    </span>
                    <span className="text-sm font-black tabular-nums">{r.count}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No active risks — everything is on track.</p>
          )}
        </Card>
      </div>

      {/* Root Cause Analysis — Sprint 2 Milestone 4. Every panel/factor here
          is assembled from data Milestones 1-3 already computed (delivery
          health, insight trends, expense breakdown) — see build_root_cause()
          in executive-analytics.service.js. Clicking a panel drills into the
          same existing module page its KPI already links to above. */}
      {rootCause && rootCause.length > 0 && (
        <div>
          <SectionHeader title="Root Cause Analysis" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rootCause.map((panel) => (
              <button
                key={panel.key}
                onClick={() => navigate(panel.path)}
                className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Search size={14} />
                  </div>
                  <p className="text-sm font-black text-gray-900">{panel.kpi}</p>
                </div>
                <p className="text-xs text-gray-500 mb-3">{panel.summary}</p>
                <BarList items={panel.factors} formatValue={(n) => n.toLocaleString()} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations — Sprint 2 Milestone 4. Deterministic rule-based
          suggestions, one per already-flagged Action Center item — no AI,
          no notification engine. See get_recommendations() in
          executive-analytics.service.js. */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <SectionHeader title="AI Recommendations" />
          <Card className="border-none shadow-sm p-5">
            <div className="space-y-2">
              {recommendations.map((r, i) => (
                <button
                  key={i}
                  onClick={() => navigate(r.path)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Lightbulb size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{r.recommendation}</span>
                      <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0', PRIORITY_STYLES[r.priority] || PRIORITY_STYLES.low)}>{r.priority}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
