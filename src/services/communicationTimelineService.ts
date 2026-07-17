import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export type CommunicationEventType =
  | 'WEEKLY_UPDATE' | 'DISCUSSION' | 'MEETING' | 'MEETING_DECISION' | 'ACTION_ITEM' | 'ACTIVITY';

export interface CommunicationEvent {
  id: string;
  type: CommunicationEventType;
  date: string;
  author: string | null;
  summary: string | null;
  related_entity: Record<string, any>;
}

async function fetchTimeline(projectId: string): Promise<CommunicationEvent[]> {
  const res = await apiRequest<any>(API_ENDPOINTS.COMMUNICATION_TIMELINE.GET(projectId));
  return (res?.payload?.records || res?.payload || res || []) as CommunicationEvent[];
}

export function useCommunicationTimeline(projectId: string | null | undefined) {
  return useQuery<CommunicationEvent[]>({
    queryKey: QUERY_KEYS.COMMUNICATION_TIMELINE.GET(projectId || ''),
    queryFn: () => fetchTimeline(projectId!),
    enabled: !!projectId,
  });
}
