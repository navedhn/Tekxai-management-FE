import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

// GITHUB/SERVER/DOMAIN/SMTP/OPENAI/STRIPE/AWS intentionally excluded — those
// are tracked exclusively by DevOps Access (git/server/domain/email_smtp/
// openai/stripe/aws_access_status), matching the backend's DEPENDENCY_TYPES
// (dependencies.validation.js) so the same access item can't be tracked in
// two different places with two different statuses.
export type DependencyType =
  | 'ANTHROPIC' | 'GEMINI'
  | 'TWILIO' | 'FIREBASE' | 'SUPABASE' | 'DIGITALOCEAN' | 'CLOUDFLARE'
  | 'GOOGLE_OAUTH' | 'APPLE_DEVELOPER' | 'PLAY_STORE' | 'META' | 'SENDGRID' | 'OTHER';

export type DependencyStatus = 'NOT_STARTED' | 'WAITING' | 'ACTIVE' | 'BLOCKED' | 'COMPLETED';

export interface ProjectDependency {
  id: string;
  project_id: string;
  name: string;
  type: DependencyType;
  category?: string | null;
  owner?: string | null;
  status: DependencyStatus;
  vendor?: string | null;
  external_url?: string | null;
  notes?: string | null;
  blocking: boolean;
  created_at: string;
  updated_at: string;
}

export type DependencyInput = Pick<ProjectDependency, 'name' | 'type'> &
  Partial<Pick<ProjectDependency, 'category' | 'owner' | 'status' | 'vendor' | 'external_url' | 'notes' | 'blocking'>>;

async function fetchDependencies(projectId: string): Promise<ProjectDependency[]> {
  const res = await apiRequest<any>(API_ENDPOINTS.DEPENDENCIES.LIST(projectId));
  return (res?.payload?.records || res?.payload || res || []) as ProjectDependency[];
}

export function useDependencies(projectId: string | null | undefined) {
  return useQuery<ProjectDependency[]>({
    queryKey: QUERY_KEYS.DEPENDENCIES.LIST(projectId || ''),
    queryFn: () => fetchDependencies(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateDependency(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DependencyInput) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.DEPENDENCIES.CREATE(projectId), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.DEPENDENCIES.LIST(projectId || '') }),
  });
}

export function useUpdateDependency(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dependencyId, updates }: { dependencyId: string; updates: Partial<DependencyInput> }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.DEPENDENCIES.UPDATE(projectId, dependencyId), {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.DEPENDENCIES.LIST(projectId || '') }),
  });
}

export function useDeleteDependency(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dependencyId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.DEPENDENCIES.DELETE(projectId, dependencyId), { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.DEPENDENCIES.LIST(projectId || '') }),
  });
}
