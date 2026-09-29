import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Plus, Link2, Mail, X, Search, Pencil, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useGetProjects } from '@/services/projectService';
import { useAuth } from '@/hooks/useAuth';
import PeopleTab from './PeopleTab';

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

function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; email?: string; phone?: string; company?: string }) =>
      apiRequest(`${v1}/crm/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-clients'] }),
  });
}

function useBackfillClientEmails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dry_run: boolean) =>
      apiRequest<any>(`${v1}/crm/backfill-emails`, {
        method: 'POST',
        body: JSON.stringify({ dry_run }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-clients'] }),
  });
}

function displayClientEmail(c: any): string {
  return (c.email || c.suggested_email || c.primary_portal_email || '').trim();
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-client-portal-invites', clientId] });
      qc.invalidateQueries({ queryKey: ['portal', 'invites', 'client'] });
    },
  });
}

function useRevokeInvite(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      apiRequest(`${v1}/crm/${clientId}/portal-invites/${inviteId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-client-portal-invites', clientId] });
      qc.invalidateQueries({ queryKey: ['portal', 'invites', 'client'] });
    },
  });
}

function useResendInvite(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      apiRequest(`${v1}/crm/${clientId}/portal-invites/${inviteId}/resend`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-client-portal-invites', clientId] });
      qc.invalidateQueries({ queryKey: ['portal', 'invites', 'client'] });
    },
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
  const { role } = useAuth();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') === 'people' ? 'people' : 'clients';
  const activeTab: 'clients' | 'people' = requestedTab === 'people' && isSuperAdmin ? 'people' : 'clients';

  useEffect(() => {
    if (requestedTab === 'people' && !isSuperAdmin) {
      setSearchParams({}, { replace: true });
    }
  }, [requestedTab, isSuperAdmin, setSearchParams]);

  const setTab = (tab: 'clients' | 'people') => {
    if (tab === 'people') setSearchParams({ tab: 'people' });
    else setSearchParams({});
  };

  const [search, setSearch] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [showGrant, setShowGrant] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [grantForm, setGrantForm] = useState({ project_id: '', user_id: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', first_name: '', last_name: '', role_id: '', project_id: '' });

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const backfillEmails = useBackfillClientEmails();
  const { data: clients = [], isLoading } = useGetClients();
  const { data: projects = [] } = useGetProjects({ limit: 1000 });

  const projectOptions = useMemo(
    () => (projects as any[]).map((p: any) => ({ label: p.title, value: p.id })),
    [projects]
  );

  const openEdit = (c: any) => {
    setEditingClient(c);
    setEditForm({
      name: c.name || '',
      email: c.email || c.suggested_email || c.primary_portal_email || '',
      phone: c.phone || '',
      company: c.company || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    if (!editForm.name.trim()) { toast.error('Client name is required'); return; }
    try {
      await updateClient.mutateAsync({ id: editingClient.id, ...editForm });
      toast.success('Client updated');
      setEditingClient(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update client');
    }
  };

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
    return [c.name, c.email, c.suggested_email, c.company, ...(c.portal_emails || [])].some((v) => (v || '').toLowerCase().includes(q));
  });

  const handleBackfillEmails = async () => {
    try {
      const r = await backfillEmails.mutateAsync(false);
      const payload = r?.payload || r;
      const updated = payload?.updated?.length ?? 0;
      const missing = payload?.still_missing?.length ?? 0;
      toast.success(`Updated ${updated} client email(s)${missing ? ` · ${missing} still missing` : ''}`);
      if (missing && payload?.still_missing?.length) {
        const names = payload.still_missing.map((x: any) => x.name).slice(0, 8).join(', ');
        toast.info(`No email found for: ${names}${missing > 8 ? '…' : ''}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sync emails');
    }
  };

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
            <p className="text-xs text-gray-400">{c.company || displayClientEmail(c) || '—'}</p>
          </div>
        </div>
      ),
    },
    { header: 'Email', key: 'email', render: (c) => {
      const shown = displayClientEmail(c);
      const fromPortal = !c.email && !!c.suggested_email;
      return (
        <button
          type="button"
          onClick={() => openEdit(c)}
          className={cn(
            'text-left group inline-flex flex-col items-start gap-0.5 max-w-full rounded-lg px-1.5 py-0.5 -mx-1.5 hover:bg-gray-50',
            c.email ? 'text-gray-600' : shown ? 'text-gray-700' : 'text-primary-600 font-semibold'
          )}
          title={c.email ? 'Edit client contact' : shown ? 'From portal — click to save on client record' : 'Add email'}
        >
          <span className="inline-flex items-center gap-1.5 max-w-full">
            <span className="truncate">{shown || 'Add email'}</span>
            <Pencil size={12} className="shrink-0 opacity-0 group-hover:opacity-60 text-gray-400" />
          </span>
          {fromPortal && (
            <span className="text-[10px] font-semibold text-amber-600">From portal — sync or save</span>
          )}
        </button>
      );
    } },
    { header: 'Company', key: 'company', render: (c) => <span className="text-gray-600">{c.company || '—'}</span> },
    { header: 'Phone', key: 'phone', render: (c) => <span className="text-gray-600">{c.phone || '—'}</span> },
    {
      header: 'Portal users',
      key: 'portal_user_count',
      render: (c) => (
        <span className="text-gray-600 tabular-nums" title={(c.portal_emails || []).join(', ') || undefined}>
          {c.portal_user_count ?? 0}
          {(c.portal_emails?.length ?? 0) > 1 ? ` · ${c.portal_emails.length} emails` : ''}
        </span>
      ),
    },
    {
      header: 'Last active',
      key: 'last_active_at',
      render: (c) => <span className="text-gray-500">{formatShortDate(c.last_active_at)}</span>,
    },
    {
      header: 'Invited',
      key: 'latest_invite_at',
      render: (c) => (
        <div className="text-gray-500 text-xs leading-snug">
          <div>{formatShortDate(c.latest_invite_at)}</div>
          {c.latest_invite_by && <div className="text-[10px] text-gray-400">{c.latest_invite_by}</div>}
        </div>
      ),
    },
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
            onClick={() => openEdit(c)}
          >
            <Pencil size={12} /> Edit
          </Button>
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
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Client CRM</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Client accounts, invites, and portal access — in one place.
          </p>
        </div>
        {activeTab === 'clients' && (
          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <Button
                variant="outline"
                className="rounded-xl gap-2 h-10 px-4 font-bold"
                loading={backfillEmails.isPending}
                onClick={handleBackfillEmails}
                title="Copy missing emails from portal users and invites onto each client record"
              >
                <RefreshCw size={16} /> Sync missing emails
              </Button>
            )}
            <Button
              variant="primary"
              className="rounded-xl gap-2 h-10 px-5 font-black"
              onClick={() => setShowNewClient(true)}
            >
              <Plus size={16} /> New Client
            </Button>
          </div>
        )}
      </div>

      {isSuperAdmin && (
        <div className="flex items-center gap-1 border-b border-gray-200">
          {([
            { id: 'clients' as const, label: 'Clients' },
            { id: 'people' as const, label: 'People' },
          ]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 h-11 text-sm font-semibold border-b-2 -mb-px transition-colors',
                activeTab === t.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'people' ? (
        <PeopleTab onGoToClients={() => setTab('clients')} />
      ) : (
        <>
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
        </>
      )}

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

      <Modal isOpen={!!editingClient} onClose={() => setEditingClient(null)} title="Edit Client Contact">
        <form onSubmit={handleUpdate} className="flex flex-col gap-4 mt-4">
          {[
            { label: 'Client Name *', key: 'name', ph: 'e.g. Acme Corp' },
            { label: 'Email', key: 'email', ph: 'client@company.com', type: 'email' },
            { label: 'Phone', key: 'phone', ph: '+1 555 0000' },
            { label: 'Company', key: 'company', ph: 'Company name' },
          ].map(({ label, key, ph, type }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{label}</label>
              <input
                type={type || 'text'}
                autoFocus={key === 'email' && !editForm.email}
                value={(editForm as any)[key]}
                onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={ph}
                className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setEditingClient(null)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={updateClient.isPending}>Save</Button>
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
