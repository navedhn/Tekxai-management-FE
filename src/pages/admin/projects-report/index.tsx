import React, { useMemo, useState } from 'react';
import { FileBarChart, RefreshCw, Send, Info } from 'lucide-react';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { PageSkeleton } from '@/components/skeletons';
import { useShowPageSkeleton } from '@/hooks/useShowPageSkeleton';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useProjectsReportSummary, useProjectsReportRecipients, useProjectsReportEmailPreview, useSendProjectsReportEmail,
} from '@/services/reportService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import { useFetchUsersQuery } from '@/services/userService';
import { useClientsLookupQuery } from '@/services/projectService';
import { PROJECT_STATUS_OPTIONS } from '@/utils/projectStatus';

const HEALTH_OPTIONS = [
  { label: 'All Health', value: '' },
  { label: 'Healthy', value: 'HEALTHY' },
  { label: 'At Risk', value: 'AT_RISK' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Critical', value: 'CRITICAL' },
];
const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: '' },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

function money(n: number | null | undefined, currency: string = 'PKR') {
  if (n == null) return 'N/A';
  return `${currency} ${Number(n).toLocaleString()}`;
}
// Backend financial aggregates are grouped by currency ({ PKR: 1234, CAD:
// 500 }) rather than a single mixed-currency scalar — a project's own
// budget_currency is a real, meaningful distinction (e.g. Lend It CA is
// CAD), and summing across currencies into one PKR-labelled number would
// silently misstate every multi-currency report. Render one line per
// currency present rather than picking/hiding one.
function moneyByCurrency(byCurrency: Record<string, number> | null | undefined) {
  const entries = Object.entries(byCurrency || {});
  if (entries.length === 0) return money(0);
  return entries.map(([currency, amount]) => money(amount, currency)).join(' · ');
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}
function NA() {
  return <span className="text-gray-300 italic">NOT AVAILABLE</span>;
}

// One compact KPI tile — reused across every metrics row on this page so
// the visual language stays consistent with a single component instead of
// six near-duplicate blocks.
function Tile({ label, value, onClick, tone = 'default' }: { label: string; value: React.ReactNode; onClick?: () => void; tone?: 'default' | 'danger' | 'warn' | 'success' }) {
  const toneClass = {
    default: 'bg-white border-gray-100',
    danger: 'bg-[#FEF3F2] border-[#FECDCA]',
    warn: 'bg-[#FFFAEB] border-[#FEDF89]',
    success: 'bg-[#ECFDF3] border-[#ABEFC6]',
  }[tone];
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-2xl border p-4 text-left shadow-sm ${toneClass} ${onClick ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}
    >
      <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-2xl font-black text-gray-900">{value}</span>
    </Comp>
  );
}

function SectionCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-800">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function DataTable({ columns, rows, emptyText }: { columns: { key: string; label: string; align?: 'right' }[]; rows: any[]; emptyText: string }) {
  if (!rows.length) return <p className="text-sm text-gray-400 font-medium py-6 text-center">{emptyText}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">
            {columns.map((c) => <th key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              {columns.map((c) => <td key={c.key} className={`px-3 py-2.5 text-gray-700 ${c.align === 'right' ? 'text-right' : ''}`}>{r[c.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const AdminProjectsReport: React.FC = () => {
  const toast = useToastContext();
  const [filters, setFilters] = useState({ from: '', to: '', business_unit_id: '', project_manager_id: '', client_id: '', status: '', health_status: '', priority: '' });
  const [drillDown, setDrillDown] = useState<{ title: string; columns: any[]; rows: any[] } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  // PM/Client filters used to take a raw id typed by hand (nobody knows a
  // user cuid or client-account id off the top of their head) — now backed
  // by the same lookup services CreateProjectSlideOver already uses, so the
  // filter is name-searchable and still submits the real id underneath.
  const [pmSearch, setPmSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const { data: pmResults = [], isFetching: pmLoading } = useFetchUsersQuery({ search: pmSearch }, true);
  const { data: clientResults = [], isFetching: clientLoading } = useClientsLookupQuery(clientSearch, true);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [filters]);

  const { data: report, isLoading, isError, refetch, isFetching } = useProjectsReportSummary(params);
  const { data: businessUnits = [] } = useGetBusinessUnitsQuery();
  const showPageSkeleton = useShowPageSkeleton(isLoading);

  if (showPageSkeleton) return <PageSkeleton variant="table" />;

  const set = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }));

  const openDrill = (title: string, columns: any[], rows: any[]) => setDrillDown({ title, columns, rows });

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center">
            <FileBarChart size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Projects Report</h1>
            <p className="text-sm text-gray-400 font-medium">Delivery, Milestones, Collections, Client Health &amp; Exceptions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={RefreshCw} onClick={() => refetch()} loading={isFetching} className="h-11 rounded-xl font-bold text-sm px-5">
            Refresh
          </Button>
          <Button leftIcon={Send} onClick={() => setShowSendModal(true)} className="bg-primary-500 text-white h-11 rounded-xl font-bold text-sm px-5">
            Send Email
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="w-40"><Input label="Date From" type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} className="h-11 rounded-xl" /></div>
        <div className="w-40"><Input label="Date To" type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} className="h-11 rounded-xl" /></div>
        <div className="w-48">
          <SearchableSelect label="Business Unit" options={[{ label: 'All Business Units', value: '' }, ...businessUnits.map((b: any) => ({ label: b.name, value: b.id }))]} value={filters.business_unit_id} onChange={(v) => set('business_unit_id', String(v))} />
        </div>
        <div className="w-56">
          <SearchableSelect
            label="Project Manager"
            options={pmResults.map((u: any) => ({ label: `${u.first_name} ${u.last_name}`.trim(), value: u.id }))}
            value={filters.project_manager_id}
            onChange={(v) => set('project_manager_id', v ? String(v) : '')}
            onSearch={setPmSearch}
            loading={pmLoading}
            placeholder="All Project Managers"
            searchPlaceholder="Search by name..."
            clearable
          />
        </div>
        <div className="w-56">
          <SearchableSelect
            label="Client"
            options={clientResults.map((c: any) => ({ label: c.company || c.name, value: c.id }))}
            value={filters.client_id}
            onChange={(v) => set('client_id', v ? String(v) : '')}
            onSearch={setClientSearch}
            loading={clientLoading}
            placeholder="All Clients"
            searchPlaceholder="Search by name..."
            clearable
          />
        </div>
        <div className="w-40"><SearchableSelect label="Status" options={[{ label: 'All Statuses', value: '' }, ...PROJECT_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))]} value={filters.status} onChange={(v) => set('status', String(v))} /></div>
        <div className="w-40"><SearchableSelect label="Health" options={HEALTH_OPTIONS} value={filters.health_status} onChange={(v) => set('health_status', String(v))} /></div>
        <div className="w-40"><SearchableSelect label="Priority" options={PRIORITY_OPTIONS} value={filters.priority} onChange={(v) => set('priority', String(v))} /></div>
      </div>

      {isError ? (
        <div className="text-center py-16 text-sm text-red-500 font-semibold bg-white rounded-2xl border border-gray-100">Failed to load Projects Report.</div>
      ) : !report ? null : (
        <>
          {/* 1. Overall Delivery */}
          <SectionCard title="Overall Delivery">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Tile label="Active Projects" value={report.overview.active_projects} />
              <Tile label="On Track" value={report.overview.on_track} tone="success" />
              <Tile label="At Risk" value={report.overview.at_risk} tone="warn" />
              <Tile label="Delayed" value={report.overview.delayed} tone="danger" />
              <Tile label="Deliveries Due" value={report.overview.deliveries_due} />
              <Tile label="Delivered" value={report.overview.delivered} tone="success" />
              <Tile label="Missed" value={report.overview.missed} tone="danger"
                onClick={() => openDrill('Missed Milestones', [
                  { key: 'title', label: 'Milestone' }, { key: 'project', label: 'Project' }, { key: 'due_date', label: 'Due Date' },
                ], report.project_execution.filter((r: any) => r.status === 'MISSED').map((r: any) => ({ title: r.committed_deliverable, project: r.project.title, due_date: fmtDate(r.committed_date) })))} />
            </div>
          </SectionCard>

          {/* 2. Milestones & Collections */}
          <SectionCard title="Milestones &amp; Collections">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Tile label="Milestones Due" value={report.milestones.milestones_due}
                onClick={() => openDrill('Milestones Due', [{ key: 'title', label: 'Milestone' }, { key: 'project', label: 'Project' }, { key: 'due_date', label: 'Due Date' }, { key: 'price', label: 'Value', align: 'right' }],
                  report.milestones.records.due.map((m: any) => ({ title: m.title, project: m.project.title, due_date: fmtDate(m.due_date), price: money(m.price, m.currency) })))} />
              <Tile label="Value Due" value={moneyByCurrency(report.milestones.value_due)} />
              <Tile label="Delivered" value={report.milestones.delivered}
                onClick={() => openDrill('Delivered Milestones', [{ key: 'title', label: 'Milestone' }, { key: 'project', label: 'Project' }, { key: 'completed_date', label: 'Completed' }],
                  report.milestones.records.delivered.map((m: any) => ({ title: m.title, project: m.project.title, completed_date: fmtDate(m.completed_date) })))} />
              <Tile label="Client Accepted" value={<NA />} />
              <Tile label="Released" value={<NA />} />
              <Tile label="Collected" value={moneyByCurrency(report.milestones.collected)}
                onClick={() => openDrill('Collected', [{ key: 'title', label: 'Milestone' }, { key: 'project', label: 'Project' }, { key: 'price', label: 'Value', align: 'right' }],
                  report.milestones.records.collected.map((m: any) => ({ title: m.title, project: m.project.title, price: money(m.price, m.currency) })))} />
              <Tile label="Pending Value" value={moneyByCurrency(report.milestones.pending_value)}
                onClick={() => openDrill('Pending Value', [{ key: 'title', label: 'Milestone' }, { key: 'project', label: 'Project' }, { key: 'due_date', label: 'Due Date' }, { key: 'price', label: 'Value', align: 'right' }],
                  report.milestones.records.pending_value.map((m: any) => ({ title: m.title, project: m.project.title, due_date: fmtDate(m.due_date), price: money(m.price, m.currency) })))} />
              <Tile label="Next Expected" value={report.milestones.next_expected ? `${fmtDate(report.milestones.next_expected.date)}` : '—'} />
            </div>
          </SectionCard>

          {/* 3. Project Execution */}
          <SectionCard title="Project Execution" subtitle="Every milestone due this period, or still open past its deadline.">
            <DataTable
              emptyText="No records for the selected period."
              columns={[
                { key: 'project', label: 'Project' }, { key: 'deliverable', label: 'Committed Deliverable' }, { key: 'committed_date', label: 'Committed Date' },
                { key: 'result', label: 'Result' }, { key: 'status', label: 'Status' }, { key: 'variance', label: 'Variance' },
                { key: 'why_missed', label: 'Why Missed' }, { key: 'recovery', label: 'Recovery Action' }, { key: 'owner', label: 'Owner' }, { key: 'revised', label: 'Revised Date' },
              ]}
              rows={report.project_execution.map((r: any) => ({
                project: r.project.title, deliverable: r.committed_deliverable, committed_date: fmtDate(r.committed_date),
                result: r.actual_result, status: <StatusPill status={r.status} />, variance: r.variance_days != null ? `${r.variance_days > 0 ? '+' : ''}${r.variance_days}d` : '—',
                why_missed: r.missed_reason_category || '—', recovery: r.recovery_action || '—', owner: r.owner || 'Unassigned', revised: fmtDate(r.revised_date),
              }))}
            />
          </SectionCard>

          {/* 4. Client Health */}
          <SectionCard title="Client Health">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile label="Awaiting Feedback/Acceptance" value={report.client_health.awaiting_feedback}
                onClick={() => openDrill('Awaiting Feedback', [{ key: 'title', label: 'Project' }], report.client_health.records.awaiting_feedback.map((p: any) => ({ title: p.title })))} />
              <Tile label="Positive / Normal" value={report.client_health.positive} tone="success" />
              <Tile label="At Risk" value={report.client_health.at_risk} tone="warn" />
              <Tile label="Escalated" value={report.client_health.escalated} tone="danger"
                onClick={() => openDrill('Escalated Clients', [{ key: 'name', label: 'Client' }], report.client_health.records.escalated)} />
            </div>
            {report.client_health.not_classified > 0 && (
              <p className="text-xs text-gray-400">{report.client_health.not_classified} linked client(s) have no health classification set yet.</p>
            )}
          </SectionCard>

          {/* 5. Team / Resource Exceptions */}
          <SectionCard title="Team / Resource Exceptions" subtitle="No expected-vs-actual productivity metric exists in ERP today — this shows real delivery evidence instead of a fabricated number.">
            <DataTable
              emptyText="No records for the selected period."
              columns={[
                { key: 'resource', label: 'Resource / Team' }, { key: 'project', label: 'Project' }, { key: 'expected', label: 'Expected Output' },
                { key: 'actual', label: 'Actual Output / Result' }, { key: 'impact', label: 'Impact' }, { key: 'exception', label: 'Exception' },
                { key: 'action', label: 'Corrective Action' }, { key: 'owner', label: 'Owner' }, { key: 'review', label: 'Review Date' },
              ]}
              rows={report.team_exceptions.map((r: any) => ({
                resource: r.resource, project: r.project.title, expected: r.expected, actual: r.actual_result, impact: r.impact,
                exception: r.exception, action: r.corrective_action || '—', owner: r.owner || 'Unassigned', review: fmtDate(r.review_date),
              }))}
            />
          </SectionCard>

          {/* 6. Financial & Scope Exceptions */}
          <SectionCard title="Financial &amp; Scope Exceptions">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-2">
              <Tile label="Expected Value" value={moneyByCurrency(report.financial_exceptions.expected_value)} />
              <Tile label="Collected" value={moneyByCurrency(report.financial_exceptions.collected)} tone="success" />
              <Tile label="Pending" value={moneyByCurrency(report.financial_exceptions.pending)} />
              <Tile label="Overdue" value={moneyByCurrency(report.financial_exceptions.overdue)} tone="danger"
                onClick={() => openDrill('Overdue Collections', [{ key: 'title', label: 'Milestone' }, { key: 'project', label: 'Project' }, { key: 'due_date', label: 'Due Date' }, { key: 'price', label: 'Value', align: 'right' }],
                  report.financial_exceptions.records.overdue.map((m: any) => ({ title: m.title, project: m.project.title, due_date: fmtDate(m.due_date), price: money(m.price, m.currency) })))} />
              <Tile label="Scope Exceptions" value={report.financial_exceptions.scope_exceptions_count}
                onClick={() => openDrill('Scope Exceptions', [{ key: 'title', label: 'Milestone' }, { key: 'project', label: 'Project' }, { key: 'detail', label: 'Detail' }],
                  report.financial_exceptions.records.scope_exceptions.map((m: any) => ({ title: m.title, project: m.project.title, detail: m.missed_reason_detail || '—' })))} />
              <Tile label="Cost Exceptions" value={report.financial_exceptions.cost_exceptions_count}
                onClick={() => openDrill('Cost Exceptions (Budget)', [{ key: 'title', label: 'Project' }, { key: 'budget', label: 'Budget', align: 'right' }, { key: 'spent', label: 'Spent', align: 'right' }],
                  report.financial_exceptions.records.cost_exceptions.map((p: any) => ({ title: p.title, budget: money(p.budget), spent: money(p.budget_spent) })))} />
            </div>
          </SectionCard>

          {/* 7. Open / Carry-Forward Exceptions */}
          <SectionCard title="Open / Carry-Forward Exceptions" subtitle="Recomputed live from still-open records — a genuine issue can never silently disappear from this list until it is actually resolved.">
            <DataTable
              emptyText="No open exceptions."
              columns={[
                { key: 'issue', label: 'Issue' }, { key: 'category', label: 'Category' }, { key: 'project', label: 'Project' }, { key: 'client', label: 'Client' },
                { key: 'root_cause', label: 'Root Cause' }, { key: 'action', label: 'Action' }, { key: 'owner', label: 'Owner' },
                { key: 'deadline', label: 'Deadline' }, { key: 'status', label: 'Status' }, { key: 'updated', label: 'Last Updated' },
              ]}
              rows={report.open_exceptions.map((r: any) => ({
                issue: r.issue, category: r.category, project: r.project.title, client: r.client || '—', root_cause: r.root_cause || '—',
                action: r.action || '—', owner: r.owner || 'Unassigned', deadline: fmtDate(r.deadline), status: r.status, updated: fmtDate(r.last_updated),
              }))}
            />
          </SectionCard>

          {/* 8. Corrective Actions */}
          <SectionCard title="Corrective Actions">
            <DataTable
              emptyText="No corrective actions recorded."
              columns={[{ key: 'issue', label: 'Issue' }, { key: 'root_cause', label: 'Root Cause' }, { key: 'action', label: 'Action' }, { key: 'owner', label: 'Owner' }, { key: 'deadline', label: 'Deadline' }, { key: 'result', label: 'Result' }]}
              rows={report.corrective_actions.map((r: any) => ({ issue: r.issue, root_cause: r.root_cause || '—', action: r.action || '—', owner: r.owner || 'Unassigned', deadline: fmtDate(r.deadline), result: r.result }))}
            />
          </SectionCard>

          {/* 9. Management Decisions Required */}
          <SectionCard title="Management Decisions Required" subtitle="Pending extension requests — the existing approval mechanism, not a new one.">
            <DataTable
              emptyText="No decisions required right now."
              columns={[{ key: 'issue', label: 'Issue' }, { key: 'options', label: 'Options' }, { key: 'recommendation', label: 'Owner Recommendation' }, { key: 'decision', label: 'Decision Required' }, { key: 'deadline', label: 'Deadline' }]}
              rows={report.management_decisions.map((r: any) => ({ issue: r.issue, options: r.options.join(' / '), recommendation: r.owner_recommendation || '—', decision: r.decision_required, deadline: fmtDate(r.deadline) }))}
            />
          </SectionCard>

          {/* 10. Next Commitments */}
          <SectionCard title="Next Targets / Commitments">
            <DataTable
              emptyText="No upcoming commitments."
              columns={[{ key: 'project', label: 'Project' }, { key: 'deliverable', label: 'Deliverable' }, { key: 'date', label: 'Committed Date' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'result', label: 'Expected Result' }, { key: 'risk', label: 'Risk' }]}
              rows={report.next_commitments.map((r: any) => ({ project: r.project.title, deliverable: r.deliverable, date: fmtDate(r.committed_date), owner: r.owner || 'Unassigned', status: r.current_status, result: r.expected_result, risk: r.risk }))}
            />
          </SectionCard>

          {/* Definitions / Legend */}
          <SectionCard title="Report Definitions / Legend">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-xs text-gray-500">
              {Object.entries(report.definitions).map(([key, def]) => (
                <p key={key}><Info size={11} className="inline mr-1 -mt-0.5 text-gray-300" /><span className="font-bold text-gray-600">{key.replace(/_/g, ' ')}:</span> {def as string}</p>
              ))}
            </div>
          </SectionCard>
        </>
      )}

      {drillDown && (
        <Modal isOpen onClose={() => setDrillDown(null)} title={drillDown.title}>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <DataTable columns={drillDown.columns} rows={drillDown.rows} emptyText="No records." />
          </div>
        </Modal>
      )}

      {showSendModal && report && (
        <SendReportModal params={params} onClose={() => setShowSendModal(false)} />
      )}
    </div>
  );
};

function StatusPill({ status }: { status: string }) {
  const cls = status === 'MISSED' ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]' : status === 'ON_TIME' ? 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' : 'bg-gray-50 text-gray-500 border-gray-200';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${cls}`}>{status}</span>;
}

// Recipients -> Preview -> Send. Preview renders the exact HTML the
// backend would send (build_projects_report_email(), same call the real
// send uses) inside a sandboxed iframe — never a client-approximated copy.
function SendReportModal({ params, onClose }: { params: Record<string, string>; onClose: () => void }) {
  const toast = useToastContext();
  const { data: recipients = [], isLoading: loadingRecipients } = useProjectsReportRecipients();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extraEmailsText, setExtraEmailsText] = useState('');
  const { data: preview, isLoading: loadingPreview } = useProjectsReportEmailPreview(params, true);
  const send = useSendProjectsReportEmail();

  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const parseExtraEmails = (s: string) =>
    [...new Set(s.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSend = async () => {
    const extra = parseExtraEmails(extraEmailsText);
    if (selected.size === 0 && extra.length === 0) { toast.error('Select a recipient or add an email address.'); return; }
    const bad = extra.filter((e) => !EMAIL_RE.test(e));
    if (bad.length) { toast.error(`Not a valid email: ${bad.join(', ')}`); return; }
    try {
      await send.mutateAsync({
        ...(selected.size ? { recipient_ids: [...selected] } : {}),
        ...(extra.length ? { extra_emails: extra } : {}),
        ...params,
      });
      toast.success('Project report sent successfully.');
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to send report email.');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Send Project Report">
      <div className="flex flex-col gap-4 mt-4">
        <div>
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Recipients</label>
          <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
            {loadingRecipients ? (
              <p className="text-xs text-gray-400 p-3">Loading authorized recipients…</p>
            ) : recipients.length === 0 ? (
              <p className="text-xs text-gray-400 p-3">No users are currently authorized to receive this report.</p>
            ) : recipients.map((r: any) => (
              <label key={r.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 rounded accent-primary-600" />
                <span className="flex-1 text-sm font-semibold text-gray-800">{r.name}</span>
                <span className="text-[10px] font-black uppercase text-gray-400">{r.role}</span>
                <span className="text-xs text-gray-400">{r.email}</span>
              </label>
            ))}
          </div>
          <label className="mt-3 block text-[10px] font-black text-gray-400 tracking-widest uppercase">Other recipients</label>
          <input
            type="text"
            value={extraEmailsText}
            onChange={(e) => setExtraEmailsText(e.target.value)}
            placeholder="email@example.com, another@example.com"
            className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400"
          />
          <p className="mt-1 text-[11px] text-gray-400">Comma-separated. These are sent the report even if they aren’t ERP users.</p>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Subject</label>
          <p className="mt-1 text-sm font-semibold text-gray-800">{preview?.subject || (loadingPreview ? 'Loading…' : '—')}</p>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Email Preview</label>
          <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
            {loadingPreview ? (
              <p className="text-xs text-gray-400 p-6 text-center">Generating preview…</p>
            ) : (
              <iframe title="report-email-preview" srcDoc={preview?.html || ''} sandbox="" className="w-full border-0" style={{ height: 420, background: '#fff' }} />
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" fullWidth className="gap-1" loading={send.isPending} onClick={handleSend}>
            <Send size={14} /> Send Email
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AdminProjectsReport;
