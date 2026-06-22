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

function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest(`${v1}/crm`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-clients'] }),
  });
}

function useGrantAccess(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { project_id: string; access_level: string }) =>
      apiRequest(`${v1}/crm/${clientId}/access`, { method: 'POST', body: JSON.stringify(data) }),
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
  const [grantForm, setGrantForm] = useState({ project_id: '', access_level: 'VIEWER' });

  const grant = useGrantAccess(showGrant || '');

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
    try {
      await grant.mutateAsync(grantForm);
      toast.success('Project access granted');
      setShowGrant(null);
    } catch { toast.error('Failed to grant access'); }
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
          onClick={() => { setShowGrant(c.id); setGrantForm({ project_id: '', access_level: 'VIEWER' }); }}
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

      {/* New client modal */}
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

      {/* Grant project access modal */}
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
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Access Level</label>
            <select
              value={grantForm.access_level}
              onChange={(e) => setGrantForm((p) => ({ ...p, access_level: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            >
              <option value="VIEWER">Viewer — can view project progress</option>
              <option value="COMMENTER">Commenter — can leave comments</option>
            </select>
          </div>
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
