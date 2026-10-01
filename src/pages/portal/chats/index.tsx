import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { PageSkeleton } from '@/components/skeletons';
import PortalChatChannelList from './PortalChatChannelList';

const PortalChatsPage: React.FC = () => {
  const { isLoading: projectsLoading } = useQuery({
    queryKey: ['portal', 'projects'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
  });

  const { isLoading: unreadLoading } = useQuery({
    queryKey: ['portal', 'unread-counts'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.UNREAD_COUNTS),
    refetchInterval: 15000,
  });

  if (projectsLoading || unreadLoading) return <PageSkeleton />;

  return (
    <div className="h-[calc(100dvh-3rem-3.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-4rem)] -mx-3 sm:-mx-4 lg:mx-0 flex min-h-0 overflow-hidden rounded-none lg:rounded-2xl border-y lg:border border-(--color-border) bg-(--color-surface)">
      <div className="w-full max-w-md lg:max-w-sm mx-auto lg:mx-0 h-full min-h-0 border-r border-(--color-border) lg:border-r-0">
        <PortalChatChannelList className="h-full" />
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-center px-8 text-center bg-white">
        <div className="max-w-sm">
          <p className="font-black text-(--color-text-primary) text-lg tracking-tight">Select a channel</p>
          <p className="text-sm text-(--color-text-secondary) mt-1.5">
            Choose a project chat from the list to read messages and reply — same layout as Communication on a project.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalChatsPage;
