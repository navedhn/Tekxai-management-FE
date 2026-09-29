import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, MoreHorizontal, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

const V1 = 'api/v1';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useFetchUsersQuery } from '@/services/userService';
import { useGetProjects } from '@/services/projectService';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { PageSkeleton } from '@/components/skeletons';

type ClientInvite = {
  id: string;
  kind: 'client';
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  created_at: string;
  accepted_at: string | null;
  client_account: { id: string; name: string } | null;
  project: { id: string; title: string } | null;
  role: { id: string; name: string } | null;
  inviter: { id: string; first_name: string; last_name: string } | null;
  accepted_user: { id: string; first_name: string | null; last_name: string | null; last_active_at: string | null } | null;
};

type EmployeeInvite = {
  id: string;
  kind: 'employee';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  created_at: string;
  accepted_at: string | null;
  user: { id: string; first_name: string; last_name: string; email: string; avatar: string | null; last_active_at: string | null } | null;
  project: { id: string; title: string } | null;
  inviter: { id: string; first_name: string; last_name: string } | null;
};

// A client invite row's own first_name/last_name are captured once, at
// invite-creation time (often just left blank by whoever sent it) — once
// the invite is accepted, accepted_user carries the client's REAL, current
// profile name (the one they actually typed in and that shows up in chat),
// which should win whenever it's available.
function clientDisplayName(r: ClientInvite): string {
  const accepted = [r.accepted_user?.first_name, r.accepted_user?.last_name].filter(Boolean).join(' ').trim();
  if (accepted) return accepted;
  return [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  ACCEPTED: 'bg-green-50 text-green-600 border-green-100',
  EXPIRED: 'bg-gray-50 text-gray-400 border-gray-100',
  REVOKED: 'bg-red-50 text-red-500 border-red-100',
};

// Status column sort order (ascending); an unknown status sorts last.
const STATUS_ORDER: Record<string, number> = { ACCEPTED: 0, PENDING: 1, EXPIRED: 2, REVOKED: 3 };
type StatusSort = 'none' | 'asc' | 'desc';
const NEXT_STATUS_SORT: Record<StatusSort, StatusSort> = { none: 'asc', asc: 'desc', desc: 'none' };

const RowMenu: React.FC<{
  canRevoke: boolean;
  canResend?: boolean;
  onRevoke: () => void;
  onResend?: () => void;
  resendPending?: boolean;
}> = ({ canRevoke, canResend, onRevoke, onResend, resendPending }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1">
            {canResend && onResend && (
              <button
                onClick={() => { setOpen(false); onResend(); }}
                disabled={resendPending}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resendPending ? 'Resending…' : 'Resend invite'}
              </button>
            )}
            <button
              onClick={() => { setOpen(false); onRevoke(); }}
              disabled={!canRevoke}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Revoke invite
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// SUPER_ADMIN-only "People" view — every client AND employee portal
// invite ever sent, who invited whom to which project, pending or
// accepted. Since portal access became invite-gated (no employee gets in
// just by being a project member), this is also the only place to grant
// an employee portal access at all.
const PortalInvitesPage: React.FC = () => {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusSort, setStatusSort] = useState<StatusSort>('none');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteTab, setInviteTab] = useState<'employee' | 'client'>('employee');
  const [employeeForm, setEmployeeForm] = useState<{ user_id: string | null; project_id: string | null }>({ user_id: null, project_id: null });
  const [employeeSearch, setEmployeeSearch] = useState('');

  const { data: clientInvites = [], isLoading: loadingClients } = useQuery<ClientInvite[]>({
    queryKey: ['portal', 'invites', 'client'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.INVITES),
    select: (r: any) => (r?.payload?.records || []).map((i: any) => ({ ...i, kind: 'client' })),
  });
  const { data: employeeInvites = [], isLoading: loadingEmployees } = useQuery<EmployeeInvite[]>({
    queryKey: ['portal', 'invites', 'employee'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE_PORTAL_INVITES.LIST_ALL),
    select: (r: any) => (r?.payload?.records || []).map((i: any) => ({ ...i, kind: 'employee' })),
  });
  const { data: employees = [], isLoading: employeesLoading } = useFetchUsersQuery({ search: employeeSearch }, showInvite && inviteTab === 'employee');
  const { data: projects = [] } = useGetProjects();

  const createEmployeeInvite = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE_PORTAL_INVITES.CREATE, {
      method: 'POST',
      body: JSON.stringify({ user_id: employeeForm.user_id, project_id: employeeForm.project_id }),
    }),
    onSuccess: () => {
      toast.success('Invite sent');
      qc.invalidateQueries({ queryKey: ['portal', 'invites', 'employee'] });
      setShowInvite(false);
      setEmployeeForm({ user_id: null, project_id: null });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to send invite'),
  });

  const revokeEmployeeInvite = useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.EMPLOYEE_PORTAL_INVITES.REVOKE(id), { method: 'DELETE' }),
    onSuccess: () => { toast.success('Invite revoked'); qc.invalidateQueries({ queryKey: ['portal', 'invites', 'employee'] }); },
    onError: () => toast.error('Failed to revoke invite'),
  });

  const revokeClientInvite = useMutation({
    mutationFn: ({ clientId, inviteId }: { clientId: string; inviteId: string }) =>
      apiRequest<any>(`${V1}/crm/${clientId}/portal-invites/${inviteId}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Invite revoked'); qc.invalidateQueries({ queryKey: ['portal', 'invites', 'client'] }); },
    onError: () => toast.error('Failed to revoke invite'),
  });

  const resendClientInvite = useMutation({
    mutationFn: ({ clientId, inviteId }: { clientId: string; inviteId: string }) =>
      apiRequest<any>(`${V1}/crm/${clientId}/portal-invites/${inviteId}/resend`, { method: 'POST' }),
    onSuccess: () => { toast.success('Invitation resent'); qc.invalidateQueries({ queryKey: ['portal', 'invites', 'client'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed to resend invite'),
  });

  if (loadingClients || loadingEmployees) return <PageSkeleton />;

  const rows = [...clientInvites, ...employeeInvites].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // The backend still hands back one invite row per (person, project) pair,
  // but this view is meant to answer "who has portal access", not "which of
  // their project invites is this" — so fold every person's rows down to
  // one, keyed by their real user id where one exists (accepted client /
  // any employee invite), falling back to email for a client who hasn't
  // accepted yet and so has no user row at all.
  // Keyed by email for a client (stable across every one of their invite
  // rows — accepted_user is only ever set on the SPECIFIC rows that have
  // individually been accepted, so a person accepted on 2 of their 39
  // project invites and still-pending on the other 37 would otherwise
  // split into two different "people" if keyed by accepted_user?.id: one
  // group under their real user id, one under email). Employee rows have
  // a real user_id on every row from the start, so that stays the key.
  type PersonRow = (ClientInvite | EmployeeInvite) & { projectCount: number; invites: (ClientInvite | EmployeeInvite)[] };
  const personMap = new Map<string, PersonRow>();
  for (const r of rows) {
    const key = r.kind === 'client' ? r.email : (r.user?.id || r.id);
    const existing = personMap.get(key);
    if (existing) {
      existing.invites.push(r);
      existing.projectCount += 1;
      // ACCEPTED on any one project means this person genuinely has portal
      // access today — that should win over a PENDING row from some other
      // project, rather than the arbitrary first-sorted row's status.
      if (r.status === 'ACCEPTED') existing.status = 'ACCEPTED';
      // Same reasoning as the key above: whichever row happened to sort
      // first might be one of the not-yet-accepted ones (no accepted_user,
      // so no real name) — adopt a real name from ANY row in the group
      // the moment one shows up.
      if (existing.kind === 'client' && r.kind === 'client' && !existing.accepted_user && r.accepted_user) {
        existing.accepted_user = r.accepted_user;
      }
    } else {
      personMap.set(key, { ...r, projectCount: 1, invites: [r] });
    }
  }
  const people = [...personMap.values()];

  const q = search.trim().toLowerCase();
  const filtered = people.filter((r) => {
    if (!q) return true;
    const name = r.kind === 'client'
      ? clientDisplayName(r)
      : [r.user?.first_name, r.user?.last_name].filter(Boolean).join(' ');
    const email = r.kind === 'client' ? r.email : r.user?.email;
    return [name, email].some((v) => (v || '').toLowerCase().includes(q));
  });
  // Array.sort is stable, so people with the same status keep the default
  // newest-invite-first order.
  if (statusSort !== 'none') {
    const dir = statusSort === 'asc' ? 1 : -1;
    const rank = (status: string) => STATUS_ORDER[status] ?? Object.keys(STATUS_ORDER).length;
    filtered.sort((a, b) => dir * (rank(a.status) - rank(b.status)));
  }
  const StatusSortIcon = statusSort === 'asc' ? ArrowUp : statusSort === 'desc' ? ArrowDown : ArrowUpDown;

  const pendingCount = people.filter((r) => r.status === 'PENDING').length;
  const acceptedCount = people.filter((r) => r.status === 'ACCEPTED').length;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">People</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Manage client and employee portal access — who's been invited, to which project, pending or accepted.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-semibold text-gray-500">Total People</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{people.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Pending</p>
          <p className="text-2xl font-black text-yellow-600 mt-1">{pendingCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500">Accepted</p>
          <p className="text-2xl font-black text-green-600 mt-1">{acceptedCount}</p>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-teal-50/60 flex items-center gap-3 px-5 py-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people by name or email…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shrink-0"
        >
          <Plus size={16} /> Invite People
        </button>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide">
                <th className="sticky left-0 z-20 bg-gray-50 px-5 py-3 border-b border-r border-gray-100">Name</th>
                <th className="px-5 py-3 border-b border-gray-100">Email</th>
                <th className="px-5 py-3 border-b border-gray-100">Type</th>
                <th
                  className="px-5 py-3 border-b border-gray-100"
                  aria-sort={statusSort === 'asc' ? 'ascending' : statusSort === 'desc' ? 'descending' : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => setStatusSort((v) => NEXT_STATUS_SORT[v])}
                    className={`inline-flex items-center gap-1 uppercase tracking-wide font-bold hover:text-gray-600 ${statusSort !== 'none' ? 'text-gray-700' : ''}`}
                    title={statusSort === 'none' ? 'Sort by status' : statusSort === 'asc' ? 'Accepted first' : 'Pending first'}
                  >
                    Status
                    <StatusSortIcon size={13} className={statusSort === 'none' ? 'opacity-50' : ''} />
                  </button>
                </th>
                <th className="px-5 py-3 border-b border-gray-100">Last Active</th>
                <th className="px-5 py-3 border-b border-gray-100">Invited By</th>
                <th className="px-5 py-3 border-b border-gray-100">Invited On</th>
                <th className="px-5 py-3 border-b border-gray-100">Access</th>
                <th className="px-5 py-3 border-b border-gray-100 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-gray-400">
                  {search ? 'No one matches your search.' : 'No invites sent yet.'}
                </td></tr>
              )}
              {filtered.map((r) => {
                const name = r.kind === 'client'
                  ? clientDisplayName(r) || '—'
                  : [r.user?.first_name, r.user?.last_name].filter(Boolean).join(' ') || '—';
                const email = r.kind === 'client' ? r.email : (r.user?.email || '—');
                const lastActiveAt = r.kind === 'client' ? r.accepted_user?.last_active_at : r.user?.last_active_at;
                const access = r.kind === 'client' ? (r.role?.name || '—') : 'Portal Access';
                const pendingInvites = r.invites.filter((i) => i.status === 'PENDING');
                return (
                  <tr key={`${r.kind}-${r.invites[0].id}`} className="group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/60 px-5 py-3 border-b border-r border-gray-100 font-bold text-gray-900">
                      {name}
                    </td>
                    <td className="px-5 py-3 border-b border-gray-100 text-gray-600 group-hover:bg-gray-50/60">{email}</td>
                    <td className="px-5 py-3 border-b border-gray-100 group-hover:bg-gray-50/60">
                      <Badge variant="info" className="text-[10px] font-bold border rounded-lg px-2 py-0.5 bg-gray-50 text-gray-500 border-gray-100">
                        {r.kind === 'client' ? 'Client' : 'Employee'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 border-b border-gray-100 group-hover:bg-gray-50/60">
                      <Badge variant="info" className={`text-[10px] font-bold border rounded-lg px-2 py-0.5 ${STATUS_STYLES[r.status] || ''}`}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 border-b border-gray-100 text-gray-500 group-hover:bg-gray-50/60">
                      {lastActiveAt ? new Date(lastActiveAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 border-b border-gray-100 text-gray-500 group-hover:bg-gray-50/60">
                      {r.inviter ? `${r.inviter.first_name} ${r.inviter.last_name}` : '—'}
                    </td>
                    <td className="px-5 py-3 border-b border-gray-100 text-gray-500 group-hover:bg-gray-50/60">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 border-b border-gray-100 text-gray-600 group-hover:bg-gray-50/60">
                      <div className="flex items-center gap-1.5">
                        <span>{access}</span>
                        <span className="text-[10px] font-bold text-gray-400" title={`${r.projectCount} project${r.projectCount === 1 ? '' : 's'}`}>
                          · {r.projectCount} project{r.projectCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 border-b border-gray-100 group-hover:bg-gray-50/60">
                      {pendingInvites.length > 0 && (
                        <RowMenu
                          canRevoke
                          canResend={r.kind === 'client' && pendingInvites.some((i) => i.kind === 'client' && !!i.client_account)}
                          resendPending={resendClientInvite.isPending}
                          onResend={() => {
                            // One email per person — resend the newest pending
                            // client invite (covers expired-by-date PENDING too).
                            const newest = [...pendingInvites]
                              .filter((i): i is ClientInvite => i.kind === 'client' && !!i.client_account)
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                            if (!newest?.client_account) return;
                            resendClientInvite.mutate({ clientId: newest.client_account.id, inviteId: newest.id });
                          }}
                          onRevoke={() => {
                            for (const inv of pendingInvites) {
                              if (inv.kind === 'employee') revokeEmployeeInvite.mutate(inv.id);
                              else if (inv.client_account) revokeClientInvite.mutate({ clientId: inv.client_account.id, inviteId: inv.id });
                            }
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite People">
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 w-fit">
            <button
              onClick={() => setInviteTab('employee')}
              className={`px-3 h-8 rounded-lg text-xs font-black ${inviteTab === 'employee' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
            >
              Employee
            </button>
            <button
              onClick={() => setInviteTab('client')}
              className={`px-3 h-8 rounded-lg text-xs font-black ${inviteTab === 'client' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
            >
              Client
            </button>
          </div>

          {inviteTab === 'employee' ? (
            <>
              <p className="text-xs text-gray-500 -mt-1">
                Portal access is invite-only now — an employee can't open a project's client-facing view until invited here and they accept.
              </p>
              <SearchableSelect
                label="Employee"
                placeholder="Search employees…"
                value={employeeForm.user_id}
                onSearch={setEmployeeSearch}
                loading={employeesLoading}
                onChange={(v) => setEmployeeForm((f) => ({ ...f, user_id: v as string }))}
                options={(employees as any[]).map((u) => ({ value: u.id, label: `${u.first_name} ${u.last_name}`, description: u.email }))}
              />
              <SearchableSelect
                label="Project"
                placeholder="Search projects…"
                value={employeeForm.project_id}
                onChange={(v) => setEmployeeForm((f) => ({ ...f, project_id: v as string }))}
                options={(projects as any[]).map((p) => ({ value: p.id, label: p.title }))}
              />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!employeeForm.user_id || !employeeForm.project_id || createEmployeeInvite.isPending}
                  onClick={() => createEmployeeInvite.mutate()}
                  className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  Send Invite
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">
              Client invites are sent from that client&rsquo;s row in{' '}
              <a href="/portal/crm" className="font-bold text-primary-600 hover:underline">Client CRM</a>
              {' '}— this is where you can review or revoke them afterward.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PortalInvitesPage;
