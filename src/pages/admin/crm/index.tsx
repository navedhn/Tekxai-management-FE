import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { Building2, Plus, Link2, FolderOpen } from 'lucide-react';
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
  const { data: projects = [] } = useGetProjects();
  const createClient = useCreateClient();

  const [showNewClient, setShowNewClient] = useState(false);
  const [showGrant, setShowGrant] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [grantForm, setGrantForm] = useState({ project_id: '', user_id: '' });

  const { data: portalUsers = [], isLoading: portalUsersLoading } = usePortalUsers(showGrant || '');
  const { data: clientProjectAccess = [] } = useClientProjectAccess(showGrant || '');
  const grant = useGrantAccess(showGrant || '');
  const revoke = useRevokeAccess();

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
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl gap-1.5 h-8 text-xs"
          onClick={() => { setShowGrant(c.id); setGrantForm({ project_id: '', user_id: '' }); }}
        >
          <Link2 size={12} /> Grant Access
        </Button>
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

      <Card className="border-none shadow-sm">
        <Table columns={columns} data={clients} isLoading={isLoading} emptyMessage="No clients yet." />
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
            <select
              value={grantForm.project_id}
              onChange={(e) => setGrantForm((p) => ({ ...p, project_id: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            >
              <option value="">Select project</option>
              {(projects as any[]).map((p: any) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
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
    </div>
  );
};

export default CRMPage;
