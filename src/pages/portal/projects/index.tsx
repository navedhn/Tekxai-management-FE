import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
};

const statusBadge = (status: string) => (
  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-(--color-elevated) text-(--color-text-secondary)">
    {status}
  </span>
);

const PortalProjects: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<PortalProject[]>({
    queryKey: ['portal', 'projects'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    select: (r: any) => r?.payload?.records || [],
  });

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

      <Card className="p-0 overflow-hidden hidden lg:block">
        <Table
          columns={columns}
          data={data || []}
          emptyMessage="No projects yet."
          className="p-6"
        />
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {(data || []).map((p) => (
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
      </div>
    </div>
  );
};

export default PortalProjects;
