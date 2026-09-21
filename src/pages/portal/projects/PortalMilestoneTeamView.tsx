import React, { useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { PortalMilestone } from './types';

interface PortalMilestoneTeamViewProps {
  milestones: PortalMilestone[];
}

const STATUS_ORDER = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const;

const STATUS_DOT: Record<string, string> = {
  NOT_STARTED: 'bg-(--color-text-secondary)/40',
  IN_PROGRESS: 'bg-blue-500',
  BLOCKED: 'bg-red-500',
  COMPLETED: 'bg-green-500',
};

const PortalMilestoneTeamView: React.FC<PortalMilestoneTeamViewProps> = ({ milestones }) => {
  const { members, unassigned } = useMemo(() => {
    const byUser = new Map<string, { name: string; avatar: string | null; milestones: PortalMilestone[] }>();
    const unassignedList: PortalMilestone[] = [];

    for (const m of milestones) {
      if (m.members.length === 0) { unassignedList.push(m); continue; }
      for (const user of m.members) {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        if (!byUser.has(user.id)) byUser.set(user.id, { name, avatar: user.avatar, milestones: [] });
        byUser.get(user.id)!.milestones.push(m);
      }
    }

    const list = Array.from(byUser.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.milestones.length - a.milestones.length || a.name.localeCompare(b.name));

    return { members: list, unassigned: unassignedList };
  }, [milestones]);

  if (members.length === 0) {
    return (
      <p className="text-sm text-(--color-text-secondary) py-10 text-center">
        No milestones have assigned team members yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {members.map((member) => {
          const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
            acc[s] = member.milestones.filter((m) => m.status === s).length;
            return acc;
          }, {});
          const total = member.milestones.length;
          const donePct = total > 0 ? Math.round((counts.COMPLETED / total) * 100) : 0;

          return (
            <div key={member.id} className="bg-(--color-card) border border-(--color-card-border) rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 text-xs font-black flex items-center justify-center overflow-hidden shrink-0">
                  {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : member.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-(--color-text-primary) text-sm truncate">{member.name}</p>
                  <p className="text-[11px] text-(--color-text-secondary) font-semibold">{total} milestone{total !== 1 ? 's' : ''}</p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-lg font-black text-primary-600 leading-none">{donePct}%</p>
                  <p className="text-[9px] text-(--color-text-secondary) font-bold uppercase tracking-wide">Done</p>
                </div>
              </div>

              <div className="h-2 rounded-full bg-(--color-elevated) overflow-hidden flex mb-3">
                {STATUS_ORDER.map((s) => (
                  counts[s] > 0 && (
                    <div key={s} className={STATUS_DOT[s]} style={{ width: `${(counts[s] / total) * 100}%` }} title={`${s.replace('_', ' ')}: ${counts[s]}`} />
                  )
                ))}
              </div>

              <div className="flex flex-col gap-1">
                {member.milestones.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs font-semibold text-(--color-text-secondary) truncate">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[m.status])} />
                    <span className="truncate">{m.title}</span>
                  </div>
                ))}
                {member.milestones.length > 3 && (
                  <p className="text-[11px] text-(--color-text-secondary) font-semibold pl-3.5">+{member.milestones.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="bg-(--color-card) border border-(--color-card-border) rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary) mb-2">Unassigned milestones</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((m) => (
              <span key={m.id} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-(--color-elevated) text-(--color-text-secondary)">
                {m.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalMilestoneTeamView;
