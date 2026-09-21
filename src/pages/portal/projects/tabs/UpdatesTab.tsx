import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Card from '@/components/ui/Card';
import { TableSkeleton } from '@/components/skeletons';
import { PortalUpdate } from '../types';

const UpdatesTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data, isLoading } = useQuery<PortalUpdate[]>({
    queryKey: ['portal', 'updates', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.UPDATES(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  if (isLoading) return <TableSkeleton columns={2} rows={4} />;

  if (!data || data.length === 0) {
    return <p className="text-sm text-(--color-text-secondary) py-10 text-center">No updates yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((u) => (
        <Card key={u.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-bold text-(--color-text-primary)">{u.title}</p>
            <span className="text-xs text-(--color-text-secondary) shrink-0">
              {u.published_at ? new Date(u.published_at).toLocaleDateString() : ''}
            </span>
          </div>
          <p className="text-sm text-(--color-text-secondary) mt-2 whitespace-pre-wrap">{u.body}</p>
        </Card>
      ))}
    </div>
  );
};

export default UpdatesTab;
