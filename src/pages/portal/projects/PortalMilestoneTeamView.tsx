import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import type { PortalMilestone } from './types';

interface PortalMilestoneTeamViewProps {
  projectId: string;
  milestones: PortalMilestone[];
}

type MentionableUser = { id: string; first_name: string; last_name: string; user_type: 'INTERNAL' | 'CLIENT'; designation: string | null };

const STATUS_ORDER = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const;

const STATUS_DOT: Record<string, string> = {
  NOT_STARTED: 'bg-(--color-text-secondary)/40',
  IN_PROGRESS: 'bg-blue-500',
  BLOCKED: 'bg-red-500',
  COMPLETED: 'bg-green-500',
};

// "Team" means everyone with actual portal access to this project — not
// just whoever happens to have a milestone assigned to them, which the
// previous purely-milestone-derived version silently omitted anyone else
// entirely. Reuses the same mentionable-users endpoint the @mention picker
// already relies on for "who's eligible on this project" (internal
// project members/owner/leader, plus fellow client portal users) — that
// endpoint excludes the caller themselves (mentioning your own name makes
// no sense there), so the current viewer is added back in here since they
// obviously have access too.
const PortalMilestoneTeamView: React.FC<PortalMilestoneTeamViewProps> = ({ projectId, milestones }) => {
  const { user } = useAuth();
  const { data: mentionable = [], isLoading } = useQuery<MentionableUser[]>({
    queryKey: ['portal', 'mentionable-users', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MENTIONABLE_USERS(projectId)),
    select: (r: any) => r?.payload || [],
  });

  const { members, unassigned } = useMemo(() => {
    const milestonesByUser = new Map<string, PortalMilestone[]>();
    for (const m of milestones) {
      for (const u of m.members) {
        const list = milestonesByUser.get(u.id) || [];
        list.push(m);
        milestonesByUser.set(u.id, list);
      }
    }
    const avatarById = new Map<string, string | null>();
    for (const m of milestones) for (const u of m.members) avatarById.set(u.id, u.avatar);

    const roster = [...mentionable];
    if (user?.id && !roster.some((u) => u.id === user.id)) {
      roster.push({
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        user_type: (user.user_type as 'INTERNAL' | 'CLIENT') || 'INTERNAL',
        designation: (user as any).designation ?? null,
      });
    }

    const list = roster
      .map((u) => ({
        id: u.id,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown',
        avatar: avatarById.get(u.id) ?? null,
        userType: u.user_type,
        designation: u.designation,
        milestones: milestonesByUser.get(u.id) || [],
      }))
      .sort((a, b) => b.milestones.length - a.milestones.length || a.name.localeCompare(b.name));

    const assignedIds = new Set(roster.map((u) => u.id));
    const unassignedList = milestones.filter((m) => m.members.length === 0 || !m.members.some((u) => assignedIds.has(u.id)));

    return { members: list, unassigned: unassignedList };
  }, [mentionable, milestones, user]);

  if (isLoading) {
    return <p className="text-sm text-(--color-text-secondary) py-10 text-center">Loading team…</p>;
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-(--color-text-secondary) py-10 text-center">
        Nobody has portal access to this project yet.
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
                  <p className="text-[11px] text-(--color-text-secondary) font-semibold truncate">
                    {member.userType === 'CLIENT' ? 'Client' : (member.designation || 'TekXAI Team')}
                  </p>
                </div>
                {total > 0 && (
                  <div className="ml-auto text-right shrink-0">
                    <p className="text-lg font-black text-primary-600 leading-none">{donePct}%</p>
                    <p className="text-[9px] text-(--color-text-secondary) font-bold uppercase tracking-wide">Done</p>
                  </div>
                )}
              </div>

              {total > 0 && (
                <>
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
                </>
              )}
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
