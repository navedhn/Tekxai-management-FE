import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useFetchUsersQuery } from '@/services/userService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';

type ProjectAccessPerson = { id: string; type: 'INTERNAL' | 'CLIENT'; first_name: string; last_name: string; email: string; role: string | null };
type EmployeeInvite = { id: string; status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'; user: { id: string; first_name: string; last_name: string; avatar: string | null } | null };

// ClickUp-style "Followers" widget — a small stack of current roster
// avatars plus a + button that opens a search-and-add popover.
//
// Deliberately NOT built on GET /portal/projects/:id/mentionable-users —
// that endpoint's roster is "who's assignable/mentionable" (every
// project_member, whether or not they've actually accepted a portal
// invite yet, by design — see internal_project_recipients' own comment).
// This widget's whole point is showing who ACTUALLY has portal access
// right now, so it instead reads real accepted employee_portal_invites
// (internal) + client_project_access (client) directly. A project member
// who's assigned in the main app but hasn't accepted a portal invite is
// therefore NOT shown as "on this project" here, and correctly still
// shows up as invitable in search — inviting them is exactly the point.
// Adding someone here calls the same SUPER_ADMIN-only employee-portal-
// invite flow from Client CRM → People (POST /employee-portal-invites) —
// this is just a second, project-scoped entry point for it. SUPER_ADMIN
// only: granting portal access is a privileged action.
const ProjectPeopleWidget: React.FC<{ projectId: string; clientId: string | null }> = ({ projectId, clientId }) => {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: access } = useQuery<{ internal: ProjectAccessPerson[]; clients: ProjectAccessPerson[] }>({
    queryKey: ['project', 'access', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PROJECT_ACCESS.LIST(projectId)),
    select: (r: any) => r?.payload || { internal: [], clients: [] },
  });

  const { data: invites = [] } = useQuery<EmployeeInvite[]>({
    queryKey: ['employee-portal-invites', 'project', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE_PORTAL_INVITES.LIST_FOR_PROJECT(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  const acceptedEmployees = invites.filter((i) => i.status === 'ACCEPTED' && i.user);
  const pendingEmployees = invites.filter((i) => i.status === 'PENDING' && i.user);
  const clients = access?.clients || [];

  // Never re-surface someone who's already on this project one way or
  // another — a live employee invite (pending or accepted), or an existing
  // client_project_access grant.
  const alreadyInvitedIds = new Set(invites.filter((i) => i.status === 'PENDING' || i.status === 'ACCEPTED').map((i) => i.user?.id));
  const alreadyClientIds = new Set(clients.map((c) => c.id));

  // Company-wide search, both INTERNAL and CLIENT — this widget adds either
  // kind of person to the project, just through two different grants
  // underneath (see handleAdd below). A CLIENT result is only ever
  // real to add here if they already have a portal account (a users row) on
  // THIS project's own client account; someone who's never accepted any
  // portal invite yet has no users row at all and so can never appear in
  // this search — they'd need a fresh client_portal_invite from the CRM
  // instead, which is a different, email-driven flow than "add existing
  // person to one more project".
  const { data: employees = [], isLoading: employeesLoading } = useFetchUsersQuery(
    { search },
    open && search.trim().length > 0
  );
  const results = (employees as any[]).filter((u) =>
    !alreadyInvitedIds.has(u.id) && !alreadyClientIds.has(u.id)
  );

  const inviteEmployee = useMutation({
    mutationFn: (userId: string) => apiRequest<any>(API_ENDPOINTS.EMPLOYEE_PORTAL_INVITES.CREATE, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, project_id: projectId }),
    }),
    onSuccess: () => {
      toast.success('Invite sent');
      qc.invalidateQueries({ queryKey: ['employee-portal-invites', 'project', projectId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to send invite'),
  });

  const grantClient = useMutation({
    mutationFn: (userId: string) => {
      if (!clientId) throw new Error('This project has no client account to grant access under');
      return apiRequest<any>(API_ENDPOINTS.PROJECT_ACCESS.GRANT_CLIENT(clientId, projectId), {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    },
    onSuccess: () => {
      toast.success('Access granted');
      qc.invalidateQueries({ queryKey: ['project', 'access', projectId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to grant access'),
  });

  const handleAdd = (u: { id: string; user_type?: string }) => {
    if (u.user_type === 'CLIENT') grantClient.mutate(u.id);
    else inviteEmployee.mutate(u.id);
  };
  const addPending = inviteEmployee.isPending || grantClient.isPending;

  const totalOnProject = acceptedEmployees.length + clients.length;
  type Avatar = { id: string; name: string; avatar?: string | null };
  const visibleAvatars: Avatar[] = [
    ...acceptedEmployees.map((i) => ({ id: i.user!.id, name: `${i.user!.first_name} ${i.user!.last_name}`, avatar: i.user!.avatar })),
    ...clients.map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })),
  ].slice(0, 4);
  const overflowCount = totalOnProject - visibleAvatars.length;

  const initials = (name: string) => name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center pl-1 pr-2 h-9 rounded-full border border-(--color-border) bg-(--color-surface) hover:bg-(--color-state-hover)"
        title="People with access to this project"
      >
        <div className="flex -space-x-2">
          {visibleAvatars.map((u) => (
            <div
              key={u.id}
              className="h-7 w-7 rounded-full border-2 border-(--color-surface) bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-black overflow-hidden"
            >
              {u.avatar ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : initials(u.name)}
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
                    <p className="text-xs text-(--color-text-secondary) text-center py-3">No matching people to add.</p>
                  )}
                  {results.map((u: any) => {
                    const isClient = u.user_type === 'CLIENT';
                    // A CLIENT result only ever belongs to grant_project_client_access
                    // if they're this project's own client's contact — someone from
                    // a different client account showing up on a broad name/email
                    // match can't be granted here (the backend would 400 anyway).
                    const disabled = addPending || (isClient && u.client_account_id !== clientId);
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleAdd(u)}
                        disabled={disabled}
                        title={disabled && isClient ? "Belongs to a different client account" : undefined}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-(--color-state-hover) text-left disabled:opacity-40"
                      >
                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-xs font-black overflow-hidden shrink-0', isClient ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-100 text-primary-600')}>
                          {u.avatar ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : initials(`${u.first_name || ''} ${u.last_name || ''}`)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-(--color-text-primary) truncate">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-(--color-text-secondary) truncate">{u.email}</p>
                        </div>
                        <span className="text-[9px] font-black text-(--color-text-secondary) uppercase shrink-0">{isClient ? 'Client' : 'Team'}</span>
                        <Plus size={14} className="text-(--color-text-secondary) shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary)">
                On this project — {totalOnProject}
              </div>
              <div className="p-2 pt-0">
                {acceptedEmployees.map((i) => (
                  <div key={i.user!.id} className="flex items-center gap-2 px-2 py-2">
                    <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-black overflow-hidden shrink-0">
                      {i.user!.avatar ? <img src={i.user!.avatar!} alt="" className="h-full w-full object-cover" /> : initials(`${i.user!.first_name} ${i.user!.last_name}`)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-(--color-text-primary) truncate">{i.user!.first_name} {i.user!.last_name}</p>
                    </div>
                    <span className="text-[10px] font-bold text-(--color-text-secondary) uppercase shrink-0">Team</span>
                  </div>
                ))}
                {clients.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-2 py-2">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black overflow-hidden shrink-0">
                      {initials(`${c.first_name} ${c.last_name}`)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-(--color-text-primary) truncate">{c.first_name} {c.last_name}</p>
                    </div>
                    <span className="text-[10px] font-bold text-(--color-text-secondary) uppercase shrink-0">Client</span>
                  </div>
                ))}
                {totalOnProject === 0 && (
                  <p className="text-xs text-(--color-text-secondary) text-center py-3">No one has portal access to this project yet.</p>
                )}
              </div>

              {pendingEmployees.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wide text-(--color-text-secondary)">
                    Invited, not yet accepted — {pendingEmployees.length}
                  </div>
                  <div className="p-2 pt-0">
                    {pendingEmployees.map((i) => (
                      <div key={i.user!.id} className="flex items-center gap-2 px-2 py-2 opacity-70">
                        <div className="h-8 w-8 rounded-full bg-(--color-elevated) text-(--color-text-secondary) flex items-center justify-center text-xs font-black overflow-hidden shrink-0">
                          {i.user!.avatar ? <img src={i.user!.avatar!} alt="" className="h-full w-full object-cover" /> : initials(`${i.user!.first_name} ${i.user!.last_name}`)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-(--color-text-primary) truncate">{i.user!.first_name} {i.user!.last_name}</p>
                        </div>
                        <Clock size={13} className="text-(--color-text-secondary) shrink-0" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectPeopleWidget;
