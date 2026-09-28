import React, { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Building2, Plus, Link2, FolderOpen, Mail, X, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useGetProjects } from '@/services/projectService';

const v1 = 'api/v1';

function useGetClients() {
  return useQuery({
    queryKey: ['crm-clients'],
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/crm`);
      return r?.payload?.records || [];
    },
  });
}

// Existing grants for this client, grouped by project (reuses the already-
// updated GET /crm/:id/projects, which now groups by project with a
// per-project users[] list since multiple portal users can share access).
function useClientProjectAccess(clientId: string) {
  return useQuery({
    queryKey: ['crm-client-project-access', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/crm/${clientId}/projects`);
      return r?.payload || [];
    },
  });
}

function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest(`${v1}/crm`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-clients'] }),
  });
}

// Portal users belonging to this client only (user_type: CLIENT AND
// client_account_id: clientId, enforced server-side) — the Grant Access
// picker must never offer a user from another client.
function usePortalUsers(clientId: string) {
  return useQuery({
    queryKey: ['crm-client-portal-users', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/crm/${clientId}/portal-users`);
      return r?.payload || [];
    },
  });
}

// Client Portal Foundation — access is now per portal user + project, not
// per company. Canonical endpoint: POST /crm/clients/:clientId/projects/:projectId/client-access.
// The old POST /crm/:clientId/access intentionally returns 410.
function useGrantAccess(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { user_id: string; project_id: string }) =>
      apiRequest(`${v1}/crm/clients/${clientId}/projects/${data.project_id}/client-access`, {
        method: 'POST',
        body: JSON.stringify({ user_id: data.user_id }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-clients'] }),
  });
}

// Roles for the invite form's role picker. Gated server-side by
// erp.permissions.view — a CRM-only manager without that permission will
// see an empty list rather than a 403 breaking the whole page (the invite
// form still submits fine once a role_id is picked some other way, but in
// practice this endpoint is reachable for the admins who manage clients).
function useRoles() {
  return useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/permission/roles`);
      return r?.payload || [];
    },
    retry: false,
  });
}

function useClientPortalInvites(clientId: string) {
  return useQuery({
    queryKey: ['crm-client-portal-invites', clientId],
    enabled: !!clientId,
    // Invite status (PENDING -> ACCEPTED) changes from a completely
    // separate session (the client accepting their invite elsewhere), so
    // this admin's own React Query cache has no way to know it's stale.
    // Always refetch on mount/reopen rather than trusting a cached PENDING
    // that may already be accepted.
    refetchOnMount: 'always',
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/crm/${clientId}/portal-invites`);
      return r?.payload?.records || [];
    },
  });
}

function useCreateInvite(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; first_name: string; last_name: string; role_id: string; project_id?: string }) =>
      apiRequest(`${v1}/crm/${clientId}/portal-invites`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-client-portal-invites', clientId] }),
  });
}

function useRevokeInvite(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      apiRequest(`${v1}/crm/${clientId}/portal-invites/${inviteId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-client-portal-invites', clientId] }),
  });
}

function useResendInvite(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      apiRequest(`${v1}/crm/${clientId}/portal-invites/${inviteId}/resend`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-client-portal-invites', clientId] }),
  });
}

function useRevokeAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ project_id, user_id }: { project_id: string; user_id: string }) =>
      apiRequest(`${v1}/crm/projects/${project_id}/client-access/${user_id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-clients'] }),
  });
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-green-50 text-green-600 border-green-100',
  INACTIVE:  'bg-gray-50 text-gray-400 border-gray-100',
};

const CRMPage: React.FC = () => {
  const toast = useToastContext();
  const { data: clients = [], isLoading } = useGetClients();
  const { data: projects = [] } = useGetProjects({ limit: 1000 });
  const createClient = useCreateClient();

  const projectOptions = useMemo(
    () => (projects as any[]).map((p: any) => ({ label: p.title, value: p.id })),
    [projects]
  );

  const [search, setSearch] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [showGrant, setShowGrant] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [grantForm, setGrantForm] = useState({ project_id: '', user_id: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', first_name: '', last_name: '', role_id: '', project_id: '' });

  const { data: portalUsers = [], isLoading: portalUsersLoading } = usePortalUsers(showGrant || '');
  const { data: clientProjectAccess = [] } = useClientProjectAccess(showGrant || '');
  const grant = useGrantAccess(showGrant || '');
  const revoke = useRevokeAccess();

  const { data: roles = [] } = useRoles();
  const { data: invites = [], isLoading: invitesLoading } = useClientPortalInvites(showInvite || '');
  const createInvite = useCreateInvite(showInvite || '');
  const revokeInvite = useRevokeInvite(showInvite || '');
  const resendInvite = useResendInvite(showInvite || '');

  const filteredClients = (clients as any[]).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.email, c.company].some((v) => (v || '').toLowerCase().includes(q));
  });

  const existingUsersForSelectedProject: any[] =
    clientProjectAccess.find((p: any) => p.id === grantForm.project_id)?.users || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name) { toast.error('Client name is required'); return; }
    try {
      await createClient.mutateAsync(clientForm);
      toast.success('Client account created');
      setShowNewClient(false);
      setClientForm({ name: '', email: '', phone: '', company: '' });
    } catch { toast.error('Failed to create client'); }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantForm.project_id) { toast.error('Select a project'); return; }
    if (!grantForm.user_id) { toast.error('Select a portal user'); return; }
    try {
      await grant.mutateAsync(grantForm);
      toast.success('Project access granted');
      setGrantForm((p) => ({ ...p, user_id: '' }));
    } catch { toast.error('Failed to grant access'); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email) { toast.error('Email is required'); return; }
    if (!inviteForm.role_id) { toast.error('Select a role'); return; }
    try {
      await createInvite.mutateAsync({
        email: inviteForm.email, first_name: inviteForm.first_name, last_name: inviteForm.last_name,
        role_id: inviteForm.role_id, project_id: inviteForm.project_id || undefined,
      });
      toast.success('Invitation sent');
      setInviteForm({ email: '', first_name: '', last_name: '', role_id: '', project_id: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send invitation');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite.mutateAsync(inviteId);
      toast.success('Invitation revoked');
    } catch { toast.error('Failed to revoke invitation'); }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      await resendInvite.mutateAsync(inviteId);
      toast.success('Invitation resent');
    } catch { toast.error('Failed to resend invitation'); }
  };

  const handleRevoke = async (project_id: string, user_id: string) => {
    try {
      await revoke.mutateAsync({ project_id, user_id });
      toast.success('Access revoked');
    } catch { toast.error('Failed to revoke access'); }
  };

  const columns: Column<any>[] = [
    {
      header: 'Client',
      key: 'name',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm">
            {c.name?.[0]}
          </div>
          <div>
            <p className="font-black text-gray-900">{c.name}</p>
            <p className="text-xs text-gray-400">{c.company || c.email || '—'}</p>
          </div>
        </div>
      ),
    },
    { header: 'Email', key: 'email', render: (c) => <span className="text-gray-600">{c.email || '—'}</span> },
    { header: 'Phone', key: 'phone', render: (c) => <span className="text-gray-600">{c.phone || '—'}</span> },
    {
      header: 'Projects',
      key: 'project_access',
      render: (c) => (
        <span className="font-bold text-gray-700">{c.project_access?.length || 0} project(s)</span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (c) => (
        <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5', STATUS_COLORS[c.status] || '')}>
          {c.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      key: 'id',
      align: 'right',
      render: (c) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5 h-8 text-xs"
            onClick={() => { setShowInvite(c.id); setInviteForm({ email: '', first_name: '', last_name: '', role_id: '', project_id: '' }); }}
          >
            <Mail size={12} /> Invite User
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5 h-8 text-xs"
            onClick={() => { setShowGrant(c.id); setGrantForm({ project_id: '', user_id: '' }); }}
          >
            <Link2 size={12} /> Grant Access
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Client CRM</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Manage client accounts and grant project portal access.
          </p>
        </div>
        <Button
          variant="primary"
          className="rounded-xl gap-2 h-10 px-5 font-black"
          onClick={() => setShowNewClient(true)}
        >
          <Plus size={16} /> New Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients by name, email, or company…"
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
        />
      </div>

      <Card className="border-none shadow-sm">
        <Table columns={columns} data={filteredClients} isLoading={isLoading} emptyMessage={search ? 'No clients match your search.' : 'No clients yet.'} />
      </Card>

      <Modal isOpen={showNewClient} onClose={() => setShowNewClient(false)} title="Add Client Account">
        <form onSubmit={handleCreate} className="flex flex-col gap-4 mt-4">
          {[
            { label: 'Client Name *', key: 'name', ph: 'e.g. Acme Corp' },
            { label: 'Email', key: 'email', ph: 'client@company.com' },
            { label: 'Phone', key: 'phone', ph: '+1 555 0000' },
            { label: 'Company', key: 'company', ph: 'Company name' },
          ].map(({ label, key, ph }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{label}</label>
              <input
                value={(clientForm as any)[key]}
                onChange={(e) => setClientForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={ph}
                className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowNewClient(false)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={createClient.isPending}>Create Client</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showGrant} onClose={() => setShowGrant(null)} title="Grant Project Access">
        <form onSubmit={handleGrant} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Project</label>
            <SearchableSelect
              options={projectOptions}
              value={grantForm.project_id || null}
              onChange={(value) => setGrantForm((p) => ({ ...p, project_id: value ? String(value) : '' }))}
              placeholder="Select project"
              searchPlaceholder="Search projects…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Portal User</label>
            <select
              value={grantForm.user_id}
              onChange={(e) => setGrantForm((p) => ({ ...p, user_id: e.target.value }))}
              disabled={portalUsersLoading || !(portalUsers as any[]).length}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none disabled:opacity-50"
            >
              <option value="">
                {portalUsersLoading ? 'Loading portal users…' : (portalUsers as any[]).length ? 'Select portal user' : 'No portal users for this client yet'}
              </option>
              {(portalUsers as any[]).map((u: any) => (
                <option key={u.id} value={u.id}>
                  {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email} ({u.email})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 font-medium">
              Only portal users (user_type: CLIENT) belonging to this client account can be granted access.
            </p>
          </div>

          {grantForm.project_id && existingUsersForSelectedProject.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Currently Granted</label>
              <div className="flex flex-col gap-1.5">
                {existingUsersForSelectedProject.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between px-3 h-9 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs font-semibold text-gray-700">
                      {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRevoke(grantForm.project_id, u.id)}
                      disabled={revoke.isPending}
                      className="text-[11px] font-bold text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowGrant(null)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={grant.isPending}>Grant Access</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showInvite} onClose={() => setShowInvite(null)} title="Invite Client Portal User">
        <form onSubmit={handleInvite} className="flex flex-col gap-4 mt-4">
          <p className="text-xs text-gray-500 font-medium -mt-1">
            Emails an invite link — the client sets their own password and creates their account when they accept it.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">First Name</label>
              <input
                value={inviteForm.first_name}
                onChange={(e) => setInviteForm((p) => ({ ...p, first_name: e.target.value }))}
                placeholder="Jane"
                className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Last Name</label>
              <input
                value={inviteForm.last_name}
                onChange={(e) => setInviteForm((p) => ({ ...p, last_name: e.target.value }))}
                placeholder="Client"
                className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Email *</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="client@company.com"
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Role *</label>
            <select
              value={inviteForm.role_id}
              onChange={(e) => setInviteForm((p) => ({ ...p, role_id: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            >
              <option value="">Select role</option>
              {(roles as any[]).map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Project (optional)</label>
            <SearchableSelect
              options={projectOptions}
              value={inviteForm.project_id || null}
              onChange={(value) => setInviteForm((p) => ({ ...p, project_id: value ? String(value) : '' }))}
              placeholder="No project yet — invite to the client account only"
              searchPlaceholder="Search projects…"
            />
            <p className="text-[11px] text-gray-400 font-medium">
              If set, accepting the invite also grants access to this project — otherwise grant it afterward.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowInvite(null)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={createInvite.isPending}>Send Invitation</Button>
          </div>

          {(invites as any[]).length > 0 && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 mt-2">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase pt-3">Sent Invitations</label>
              <div className="flex flex-col gap-1.5">
                {(invites as any[]).map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between px-3 h-11 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{inv.email}</p>
                      <p className="text-[10px] text-gray-400">
                        {inv.status}{inv.project ? ` · ${inv.project.title}` : ''}
                      </p>
                    </div>
                    {inv.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResendInvite(inv.id)}
                          disabled={resendInvite.isPending}
                          className="text-[11px] font-bold text-primary-600 hover:text-primary-700 disabled:opacity-50"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          disabled={revokeInvite.isPending}
                          className="text-[11px] font-bold text-red-500 hover:text-red-600 disabled:opacity-50 flex items-center gap-1"
                        >
                          <X size={11} /> Revoke
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {invitesLoading && <p className="text-xs text-gray-400 text-center pt-2">Loading invitations…</p>}
        </form>
      </Modal>
    </div>
  );
};

export default CRMPage;
