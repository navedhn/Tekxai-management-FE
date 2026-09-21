import React, { useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { Milestone, MilestoneStatus } from '@/services/milestonesService';

interface MilestoneTeamViewProps {
  milestones: Milestone[];
  onOpenMilestone: (milestone: Milestone) => void;
}

const STATUS_ORDER: MilestoneStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];

const STATUS_DOT: Record<MilestoneStatus, string> = {
  NOT_STARTED: 'bg-gray-300',
  IN_PROGRESS: 'bg-blue-500',
  BLOCKED: 'bg-red-500',
  COMPLETED: 'bg-green-500',
};

const MilestoneTeamView: React.FC<MilestoneTeamViewProps> = ({ milestones, onOpenMilestone }) => {
  const active = useMemo(() => milestones.filter((m) => !m.archived_at), [milestones]);

  const { members, unassigned } = useMemo(() => {
    const byUser = new Map<string, { name: string; avatar: string | null; milestones: Milestone[] }>();
    const unassignedList: Milestone[] = [];

    for (const m of active) {
      const memberList = m.members || [];
      if (memberList.length === 0) { unassignedList.push(m); continue; }
      for (const { user } of memberList) {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        if (!byUser.has(user.id)) byUser.set(user.id, { name, avatar: user.avatar || null, milestones: [] });
        byUser.get(user.id)!.milestones.push(m);
      }
    }

    const list = Array.from(byUser.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.milestones.length - a.milestones.length || a.name.localeCompare(b.name));

    return { members: list, unassigned: unassignedList };
  }, [active]);

  if (active.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-sm">
        No milestones yet for this project.
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-sm">
        No milestones have assignees yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {members.map((member) => {
          const counts = STATUS_ORDER.reduce<Record<MilestoneStatus, number>>((acc, s) => {
            acc[s] = member.milestones.filter((m) => m.status === s).length;
            return acc;
          }, { NOT_STARTED: 0, IN_PROGRESS: 0, BLOCKED: 0, COMPLETED: 0 });
          const total = member.milestones.length;
          const donePct = total > 0 ? Math.round((counts.COMPLETED / total) * 100) : 0;

          return (
            <div key={member.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 text-xs font-black flex items-center justify-center overflow-hidden shrink-0">
                  {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : member.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{member.name}</p>
                  <p className="text-[11px] text-gray-400 font-semibold">{total} milestone{total !== 1 ? 's' : ''}</p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-lg font-black text-[#005CDA] leading-none">{donePct}%</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Done</p>
                </div>
              </div>

              <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex mb-3">
                {STATUS_ORDER.map((s) => (
                  counts[s] > 0 && (
                    <div
                      key={s}
                      className={STATUS_DOT[s]}
                      style={{ width: `${(counts[s] / total) * 100}%` }}
                      title={`${s.replace('_', ' ')}: ${counts[s]}`}
                    />
                  )
                ))}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
                {STATUS_ORDER.map((s) => (
                  <div key={s} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                    <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[s])} />
                    {s.replace('_', ' ')} <span className="font-black text-gray-700">{counts[s]}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1 pt-3 border-t border-gray-50">
                {member.milestones.slice(0, 3).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onOpenMilestone(m)}
                    className="flex items-center gap-2 text-left text-xs font-semibold text-gray-600 hover:text-[#005CDA] truncate"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[m.status])} />
                    <span className="truncate">{m.title}</span>
                  </button>
                ))}
                {member.milestones.length > 3 && (
                  <p className="text-[11px] text-gray-400 font-semibold pl-3.5">+{member.milestones.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">Unassigned milestones</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((m) => (
              <button
                key={m.id}
                onClick={() => onOpenMilestone(m)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
              >
                {m.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneTeamView;
