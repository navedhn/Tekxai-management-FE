import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useFetchUsersQuery } from '@/services/userService';
import { useToastContext } from '@/components/toast/ToastProvider';

type MentionableUser = { id: string; first_name: string; last_name: string; user_type: 'INTERNAL' | 'CLIENT'; avatar?: string | null };

// ClickUp-style "Followers" widget — a small stack of current roster
// avatars plus a + button that opens a search-and-add popover. Adding
// someone here is exactly the SUPER_ADMIN-only employee-portal-invite
// flow already built into the People page (POST /employee-portal-invites)
// — this is just a second, more discoverable entry point for it, scoped
// to this one project instead of picking a project in a separate modal.
// SUPER_ADMIN only: granting portal access is a privileged action, same
// gate the People page itself uses.
const ProjectPeopleWidget: React.FC<{ projectId: string }> = ({ projectId }) => {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: roster = [] } = useQuery<MentionableUser[]>({
    queryKey: ['portal', 'mentionable-users', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MENTIONABLE_USERS(projectId)),
    select: (r: any) => r?.payload || [],
  });

  const { data: employees = [], isLoading: employeesLoading } = useFetchUsersQuery({ search }, open);

  const rosterIds = new Set(roster.map((u) => u.id));
  const results = (employees as any[]).filter((u) => !rosterIds.has(u.id));

  const invite = useMutation({
    mutationFn: (userId: string) => apiRequest<any>(API_ENDPOINTS.EMPLOYEE_PORTAL_INVITES.CREATE, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, project_id: projectId }),
    }),
    onSuccess: () => {
      toast.success('Invite sent');
      qc.invalidateQueries({ queryKey: ['portal', 'mentionable-users', projectId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to send invite'),
  });

  const visibleRoster = roster.slice(0, 4);
  const overflowCount = roster.length - visibleRoster.length;

  const initials = (u: MentionableUser) => `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center pl-1 pr-2 h-9 rounded-full border border-(--color-border) bg-(--color-surface) hover:bg-(--color-state-hover)"
        title="People with access to this project"
      >
        <div className="flex -space-x-2">
          {visibleRoster.map((u) => (
            <div
              key={u.id}
              className="h-7 w-7 rounded-full border-2 border-(--color-surface) bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-black overflow-hidden"
            >
              {u.avatar ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : initials(u)}
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="h-7 w-7 rounded-full border-2 border-(--color-surface) bg-(--color-elevated) text-(--color-text-secondary) flex items-center justify-center text-[10px] font-black">
              +{overflowCount}
            </div>
          )}
          <div className="h-7 w-7 rounded-full border-2 border-(--color-surface) bg-(--color-elevated) text-(--color-text-secondary) flex items-center justify-center">
            <Plus size={14} />
          </div>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-30 w-80 rounded-2xl border border-(--color-border) bg-(--color-surface) shadow-xl flex flex-col max-h-[420px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
            <p className="text-sm font-black text-(--color-text-primary)">People</p>
            <button onClick={() => setOpen(false)} className="text-(--color-text-secondary) hover:text-(--color-text-primary)">
              <X size={16} />
            </button>
          </div>

          <div className="p-3 border-b border-(--color-border)">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-secondary)" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people to add…"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-(--color-border) bg-(--color-app-bg) text-sm outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {search.trim() && (
              <div className="p-2">
                {employeesLoading && <p className="text-xs text-(--color-text-secondary) text-center py-3">Searching…</p>}
                {!employeesLoading && results.length === 0 && (
                  <p className="text-xs text-(--color-text-secondary) text-center py-3">No matching employees not already on this project.</p>
                )}
                {results.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => invite.mutate(u.id)}
                    disabled={invite.isPending}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-(--color-state-hover) text-left disabled:opacity-50"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-black overflow-hidden shrink-0">
                      {u.avatar ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-(--color-text-primary) truncate">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-(--color-text-secondary) truncate">{u.email}</p>
                    </div>
                    <Plus size={14} className="text-(--color-text-secondary) shrink-0" />
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary)">
              On this project — {roster.length}
            </div>
            <div className="p-2 pt-0">
              {roster.map((u) => (
                <div key={u.id} className="flex items-center gap-2 px-2 py-2">
                  <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-black overflow-hidden shrink-0">
                    {u.avatar ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : initials(u)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-(--color-text-primary) truncate">{u.first_name} {u.last_name}</p>
                  </div>
                  <span className="text-[10px] font-bold text-(--color-text-secondary) uppercase shrink-0">
                    {u.user_type === 'CLIENT' ? 'Client' : 'Team'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default ProjectPeopleWidget;
