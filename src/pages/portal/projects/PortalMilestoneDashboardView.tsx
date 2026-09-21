import React, { useMemo } from 'react';
import { CheckCircle2, Circle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import DonutBreakdown, { PIE_COLORS } from '@/pages/admin/reports-analytics/components/DonutBreakdown';
import type { PortalMilestone } from './types';

interface PortalMilestoneDashboardViewProps {
  milestones: PortalMilestone[];
}

const STATUS_META = [
  { key: 'NOT_STARTED', label: 'Not Started', icon: Circle, color: 'text-(--color-text-secondary)', bg: 'bg-(--color-elevated)' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'BLOCKED', label: 'Blocked', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
] as const;

const STATUS_BAR_COLOR: Record<string, string> = {
  NOT_STARTED: '#D1D5DB',
  IN_PROGRESS: '#3B82F6',
  BLOCKED: '#EF4444',
  COMPLETED: '#22C55E',
};

const PortalMilestoneDashboardView: React.FC<PortalMilestoneDashboardViewProps> = ({ milestones }) => {
  const counts = useMemo(() => {
    return STATUS_META.reduce<Record<string, number>>((acc, s) => {
      acc[s.key] = milestones.filter((m) => m.status === s.key).length;
      return acc;
    }, {});
  }, [milestones]);

  const total = milestones.length;
  const overallProgress = total > 0 ? Math.round(milestones.reduce((sum, m) => sum + (m.progress_percent ?? 0), 0) / total) : 0;

  const byAssignee = useMemo(() => {
    const byUser = new Map<string, number>();
    let unassignedCount = 0;
    for (const m of milestones) {
      if (m.members.length === 0) { unassignedCount += 1; continue; }
      for (const u of m.members) {
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown';
        byUser.set(name, (byUser.get(name) || 0) + 1);
      }
    }
    const data = Array.from(byUser.entries()).map(([label, value]) => ({ label, value }));
    if (unassignedCount > 0) data.push({ label: 'Unassigned', value: unassignedCount });
    return data;
  }, [milestones]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return milestones
      .filter((m) => m.status !== 'COMPLETED' && m.due_date)
      .map((m) => ({ m, days: Math.ceil((new Date(m.due_date!).getTime() - now.getTime()) / 86400000) }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [milestones]);

  if (total === 0) {
    return (
      <p className="text-sm text-(--color-text-secondary) py-10 text-center">
        No milestones yet — the dashboard will populate once milestones are added.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_META.map((s) => (
          <div key={s.key} className={cn('rounded-2xl p-4 border border-(--color-card-border)', s.bg)}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} className={s.color} />
              <span className={cn('text-[11px] font-black uppercase tracking-wide', s.color)}>{s.label}</span>
            </div>
            <p className="text-2xl font-black text-(--color-text-primary)">{counts[s.key] || 0}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-(--color-card) border border-(--color-card-border) rounded-2xl p-5">
          <p className="text-xs font-black uppercase tracking-wide text-(--color-text-secondary) mb-3">Overall Progress</p>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-3xl font-black text-(--color-text-primary)">{overallProgress}%</span>
            <span className="text-xs text-(--color-text-secondary) font-semibold mb-1">across {total} milestone{total !== 1 ? 's' : ''}</span>
          </div>
          <div className="h-3 rounded-full bg-(--color-elevated) overflow-hidden flex">
            {STATUS_META.map((s) => (
              counts[s.key] > 0 && (
                <div
                  key={s.key}
                  style={{ width: `${(counts[s.key] / total) * 100}%`, background: STATUS_BAR_COLOR[s.key] }}
                  title={`${s.label}: ${counts[s.key]}`}
                />
              )
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {STATUS_META.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 text-[11px] font-semibold text-(--color-text-secondary)">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_BAR_COLOR[s.key] }} />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-(--color-card) border border-(--color-card-border) rounded-2xl p-5">
          <p className="text-xs font-black uppercase tracking-wide text-(--color-text-secondary) mb-3">Milestones by Team Member</p>
          {byAssignee.length > 0 ? (
            <DonutBreakdown data={byAssignee} total={total} totalLabel="Milestones" />
          ) : (
            <p className="text-sm text-(--color-text-secondary) py-6 text-center">No assignees yet.</p>
          )}
        </div>
      </div>

      <div className="bg-(--color-card) border border-(--color-card-border) rounded-2xl p-5">
        <p className="text-xs font-black uppercase tracking-wide text-(--color-text-secondary) mb-3">Upcoming Deadlines</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-(--color-text-secondary) py-4 text-center">Nothing due — all caught up.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map(({ m, days }) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-(--color-card-border) last:border-b-0">
                <span className="text-sm font-bold text-(--color-text-primary) truncate">{m.title}</span>
                <span className={cn('text-xs font-black whitespace-nowrap', days < 0 ? 'text-red-500' : days <= 3 ? 'text-amber-600' : 'text-(--color-text-secondary)')}>
                  {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalMilestoneDashboardView;
