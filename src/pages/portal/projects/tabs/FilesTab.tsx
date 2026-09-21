import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Table, { Column } from '@/components/ui/Table';
import { PortalFile } from '../types';

const FilesTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data, isLoading } = useQuery<PortalFile[]>({
    queryKey: ['portal', 'files', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.FILES(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  const handleView = async (fileId: string) => {
    const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.FILE_VIEW_URL(projectId, fileId));
    const url = res?.payload?.view_url || res?.payload?.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const columns: Column<PortalFile>[] = [
    {
      header: 'Title',
      key: 'title',
      render: (f) => (
        <span className="flex items-center gap-2 font-semibold text-(--color-text-primary)">
          <FileText size={15} className="text-(--color-text-secondary)" />
          {f.title}
        </span>
      ),
    },
    { header: 'Type', key: 'document_type' },
    { header: 'Added', key: 'created_at', render: (f) => new Date(f.created_at).toLocaleDateString() },
    {
      header: '',
      key: 'id',
      align: 'right',
      render: (f) => (
        <button
          onClick={() => handleView(f.id)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-(--color-border) text-xs font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover) ml-auto"
        >
          <Eye size={13} />
          View
        </button>
      ),
    },
  ];

  return <Table columns={columns} data={data || []} isLoading={isLoading} emptyMessage="No files yet." />;
};

export default FilesTab;
