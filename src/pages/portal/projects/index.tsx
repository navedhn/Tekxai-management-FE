import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Table, { Column } from '@/components/ui/Table';
import Card from '@/components/ui/Card';
import { PageSkeleton } from '@/components/skeletons';

type PortalProject = {
  id: string;
  title: string;
  status: string;
  project_type: string;
  progress: number;
  start_date: string | null;
  end_date: string | null;
  client: { id: string; name: string } | null;
};

const statusBadge = (status: string) => (
  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-(--color-elevated) text-(--color-text-secondary)">
    {status}
  </span>
);

const PAGE_SIZE = 10;

const PortalProjects: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery<PortalProject[]>({
    queryKey: ['portal', 'projects'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    select: (r: any) => r?.payload?.records || [],
  });

  const filtered = (data || []).filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.title, p.client?.name].some((v) => (v || '').toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const columns: Column<PortalProject>[] = [
    {
      header: 'Title',
      key: 'title',
      render: (p) => (
        <button
          onClick={() => navigate(`/portal/projects/${p.id}`)}
          className="font-bold text-(--color-text-primary) hover:text-primary-600 hover:underline text-left"
        >
          {p.title}
        </button>
      ),
    },
    { header: 'Client', key: 'client', render: (p) => <span className="text-(--color-text-secondary)">{p.client?.name || '—'}</span> },
    { header: 'Type', key: 'project_type' },
    { header: 'Status', key: 'status', render: (p) => statusBadge(p.status) },
    { header: 'Progress', key: 'progress', render: (p) => <span className="font-semibold">{p.progress}%</span> },
    { header: 'End Date', key: 'end_date', render: (p) => (p.end_date ? new Date(p.end_date).toLocaleDateString() : '—') },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-black text-(--color-text-primary) tracking-tight">Projects</h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">All projects you have access to.</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-secondary)" />
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by title or client…"
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
        />
      </div>

      <Card className="p-0 overflow-hidden hidden lg:block">
        <Table
          columns={columns}
          data={paginated}
          emptyMessage={search ? 'No projects match your search.' : 'No projects yet.'}
          className="p-6"
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setPage,
            totalEntries: filtered.length,
            entriesPerPage: PAGE_SIZE,
          }}
        />
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {paginated.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/portal/projects/${p.id}`)}
            className="text-left bg-(--color-surface) border border-(--color-border) rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-(--color-text-primary)">{p.title}</p>
              {statusBadge(p.status)}
            </div>
            <p className="text-xs text-(--color-text-secondary) mt-1">{p.project_type} · {p.progress}%</p>
          </button>
        ))}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 px-4 rounded-lg border border-(--color-border) text-sm font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-(--color-text-secondary)">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-9 px-4 rounded-lg border border-(--color-border) text-sm font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalProjects;
