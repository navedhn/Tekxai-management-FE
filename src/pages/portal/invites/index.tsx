import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Mail } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { PageSkeleton } from '@/components/skeletons';

type PortalInvite = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
  client_account: { id: string; name: string } | null;
  project: { id: string; title: string } | null;
  role: { id: string; name: string } | null;
  inviter: { id: string; first_name: string; last_name: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  ACCEPTED: 'bg-green-50 text-green-600 border-green-100',
  EXPIRED: 'bg-gray-50 text-gray-400 border-gray-100',
  REVOKED: 'bg-red-50 text-red-500 border-red-100',
};

// Company-wide client-portal invite roster — who's been invited to which
// client's portal, for which project, pending or accepted. This whole
// page only renders for SUPER_ADMIN (see ClientPortalLayout's nav gate and
// the router entry); the backend independently enforces the same via
// authorize('SUPER_ADMIN') on GET /portal/invites, so a direct URL visit
// by anyone else 403s regardless of this page rendering.
const PortalInvitesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<PortalInvite[]>({
    queryKey: ['portal', 'invites'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.INVITES),
    select: (r: any) => r?.payload?.records || [],
  });

  if (isLoading) return <PageSkeleton />;

  const invites = data || [];
  const filtered = invites.filter((inv) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [inv.email, inv.client_account?.name, inv.project?.title]
      .some((v) => (v || '').toLowerCase().includes(q));
  });

  const columns: Column<PortalInvite>[] = [
    {
      header: 'Invitee',
      key: 'email',
      render: (inv) => (
        <div>
          <p className="font-bold text-(--color-text-primary)">
            {[inv.first_name, inv.last_name].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="text-xs text-(--color-text-secondary)">{inv.email}</p>
        </div>
      ),
    },
    {
      header: 'Client',
      key: 'client_account',
      render: (inv) => <span className="font-semibold">{inv.client_account?.name || '—'}</span>,
    },
    {
      header: 'Project',
      key: 'project',
      render: (inv) => <span className="text-(--color-text-secondary)">{inv.project?.title || '—'}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (inv) => (
        <Badge variant="info" className={`text-[10px] font-bold border rounded-lg px-2 py-0.5 ${STATUS_STYLES[inv.status] || ''}`}>
          {inv.status}
        </Badge>
      ),
    },
    {
      header: 'Invited',
      key: 'created_at',
      render: (inv) => <span className="text-(--color-text-secondary)">{new Date(inv.created_at).toLocaleDateString()}</span>,
    },
    {
      header: 'Accepted',
      key: 'accepted_at',
      render: (inv) => (
        <span className="text-(--color-text-secondary)">
          {inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: 'Invited By',
      key: 'inviter',
      render: (inv) => (
        <span className="text-(--color-text-secondary)">
          {inv.inviter ? `${inv.inviter.first_name} ${inv.inviter.last_name}` : '—'}
        </span>
      ),
    },
  ];

  const pendingCount = invites.filter((i) => i.status === 'PENDING').length;
  const acceptedCount = invites.filter((i) => i.status === 'ACCEPTED').length;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-black text-(--color-text-primary) tracking-tight flex items-center gap-2">
          <Mail size={22} className="text-primary-500" /> Client Portal Invites
        </h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">
          Every client portal invite ever sent — who, for which project, pending or accepted.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-semibold text-(--color-text-secondary)">Total Invites</p>
          <p className="text-2xl font-black text-(--color-text-primary) mt-1">{invites.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-(--color-text-secondary)">Pending</p>
          <p className="text-2xl font-black text-yellow-600 mt-1">{pendingCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-(--color-text-secondary)">Accepted</p>
          <p className="text-2xl font-black text-green-600 mt-1">{acceptedCount}</p>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-secondary)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, client, or project…"
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <Table
          columns={columns}
          data={filtered}
          emptyMessage={search ? 'No invites match your search.' : 'No invites sent yet.'}
          className="p-6"
        />
      </Card>
    </div>
  );
};

export default PortalInvitesPage;
