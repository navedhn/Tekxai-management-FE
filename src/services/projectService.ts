import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { unwrapApiData, unwrapApiList } from '@/utils/apiResponse';
import { isMockSession } from '@/mocks/mockAuth';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

// --- Types ---

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

// Reuses the existing project_members.role column (was always "MEMBER" and
// unused until this feature — see Tekxai-Operations-OS gap audit, Sprint 2
// Phase 2). No new table.
export type ProjectMemberRole = 'FRONTEND' | 'BACKEND' | 'TEAM_LEAD' | 'QA' | 'DEVOPS' | 'UI_UX' | 'MEMBER';

export const PROJECT_MEMBER_ROLES: { value: ProjectMemberRole; label: string }[] = [
  { value: 'FRONTEND',  label: 'Frontend Developer' },
  { value: 'BACKEND',   label: 'Backend Developer' },
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'QA',        label: 'QA' },
  { value: 'DEVOPS',    label: 'DevOps' },
  { value: 'UI_UX',     label: 'UI/UX' },
  { value: 'MEMBER',    label: 'Member' },
];

export interface ProjectMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
  role?: ProjectMemberRole;
}

export interface ProjectDto {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  owner_id?: string;
  leader_id?: string;
  /** @deprecated use `members` — kept for backward compatibility with the backend's legacy param */
  member_ids?: string[];
  members?: { user_id: string; role: ProjectMemberRole }[];
  client_name?: string;
  dev_status?: string;
  status?: string;
  progress?: number;
  progress_mode?: 'MANUAL' | 'AUTO';
  budget?: number | null;
  budget_currency?: string;
}

export interface BudgetUpdatePayload {
  budget?: number | null;
  budget_currency?: string;
  budget_spent?: number;
}

export interface Milestone {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
}

export interface MilestoneBreakdown {
  completed: number;
  remaining: number;
  blocked: number;
  overdue: number;
  current: Milestone | null;
}

export interface AccessCompletionScore {
  granted: number;
  total: number;
  percent: number;
}

export interface ClientPortalInfo {
  enabled: boolean;
  portal_user: string | null;
  status: string | null;
  access_level: string | null;
}

export type ProjectStatus =
  | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  | 'PLANNING' | 'DESIGN' | 'FRONTEND' | 'BACKEND' | 'QA' | 'CLIENT_REVIEW'
  | 'DEPLOYMENT' | 'SUPPORT' | 'DELIVERED' | 'BLOCKED' | 'ARCHIVED' | string;

export interface ProjectDetail {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number;
  progress_mode?: 'MANUAL' | 'AUTO';
  total_hours: number;
  due_date: string | null;
  start_date: string;
  end_date: string;
  is_overdue?: boolean;
  days_remaining?: number | null;
  member_count: number;
  members: ProjectMember[];
  all_members?: ProjectMember[];
  /** Compact per-role counts for list-view badges, e.g. { FRONTEND: 2, BACKEND: 3, QA: 1 } */
  member_role_counts?: Partial<Record<ProjectMemberRole, number>>;
  owner?: ProjectMember;
  team_leader?: ProjectMember | null;
  milestones?: Milestone[];
  current_milestone?: Milestone | null;
  pending_milestones_count?: number;
  milestone_breakdown?: MilestoneBreakdown;
  access_completion_score?: AccessCompletionScore;
  // Same devops_access row already joined for access_completion_score above —
  // surfaced directly so list/dashboard views don't need a second call to
  // GET /project/:id/devops-access. null when the project has no row yet.
  devops_access?: {
    point_of_communication: string;
    progress_shared_status: string;
    git_access_status: string;
    server_access_status: string;
    domain_access_status: string;
    email_smtp_access_status: string;
  } | null;
  client_portal?: ClientPortalInfo;
  health_score?: number;
  health_status?: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  created_at: string;
  updated_at: string;
  is_saved: boolean;
  description?: string;
  owner_id?: string | number;
  leader_id?: string | number;
  client_name?: string | null;
  dev_status?: string | null;
  budget?: number | null;
  budget_currency?: string;
  budget_spent?: number;
}

// --- API Functions ---

const MOCK_PROJECTS: ProjectDetail[] = [
  {
    id: '01',
    title: 'Home Page',
    status: 'IN_PROGRESS',
    progress: 25,
    total_hours: 20,
    due_date: '2025-01-10',
    start_date: '2024-12-01',
    end_date: '2025-01-10',
    member_count: 3,
    members: [],
    created_at: '2024-12-01T00:00:00.000Z',
    updated_at: '2024-12-15T00:00:00.000Z',
    is_saved: false,
  },
  {
    id: '02',
    title: 'Web Design',
    status: 'IN_PROGRESS',
    progress: 50,
    total_hours: 20,
    due_date: '2024-02-24',
    start_date: '2024-01-01',
    end_date: '2024-02-24',
    member_count: 2,
    members: [],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-02-01T00:00:00.000Z',
    is_saved: true,
  },
  {
    id: '03',
    title: 'Dashboard Design',
    status: 'PENDING',
    progress: 70,
    total_hours: 20,
    due_date: '2025-03-10',
    start_date: '2025-01-01',
    end_date: '2025-03-10',
    member_count: 2,
    members: [],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-20T00:00:00.000Z',
    is_saved: false,
  },
];

const getProjectsApi = async (params?: Record<string, any>) => {
  if (isMockSession()) {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_PROJECTS;
  }

  const filteredParams = params
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
    : {};
  
  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${API_ENDPOINTS.PROJECT.LIST}?${queryString}` : API_ENDPOINTS.PROJECT.LIST;
  const res = await apiRequest<unknown>(url);
  return unwrapApiList<ProjectDetail>(res);
};

const getProjectByIdApi = async (id: string | number) => {
  if (isMockSession()) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_PROJECTS.find((p) => String(p.id) === String(id)) ?? MOCK_PROJECTS[0];
  }

  const res = await apiRequest<unknown>(API_ENDPOINTS.PROJECT.DETAIL(id));
  return unwrapApiData<ProjectDetail>(res);
};

const createProjectApi = async (data: ProjectDto) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.PROJECT.CREATE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return unwrapApiData<ProjectDetail>(res);
};

const updateProjectApi = async ({ id, data }: { id: string | number; data: Partial<ProjectDto> }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.PROJECT.UPDATE(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return unwrapApiData<ProjectDetail>(res);
};

const updateBudgetApi = async ({ id, data }: { id: string | number; data: BudgetUpdatePayload }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.PROJECT.BUDGET(id), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return unwrapApiData<ProjectDetail>(res);
};

const deleteProjectApi = async (id: string | number) => {
  return apiRequest(API_ENDPOINTS.PROJECT.DELETE(id), {
    method: 'DELETE',
  });
};

const saveProjectApi = async (id: string | number) => {
  return apiRequest(API_ENDPOINTS.PROJECT.SAVE(id), {
    method: 'POST',
  });
};

const unsaveProjectApi = async (id: string | number) => {
  return apiRequest(API_ENDPOINTS.PROJECT.UNSAVE(id), {
    method: 'DELETE',
  });
};

const getSavedProjectsApi = async () => {
  if (isMockSession()) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_PROJECTS.filter((p) => p.is_saved);
  }

  const res = await apiRequest<unknown>(API_ENDPOINTS.PROJECT.SAVED);
  return unwrapApiList<ProjectDetail>(res);
};

// --- Hooks ---

export const useGetProjects = (params?: Record<string, any>) => {
  return useQuery<ProjectDetail[]>({
    queryKey: [...QUERY_KEYS.PROJECT.LIST, params],
    queryFn: () => getProjectsApi(params),
  });
};

export const useGetProjectDetails = (id: string | number | null) => {
  return useQuery<ProjectDetail>({
    queryKey: QUERY_KEYS.PROJECT.DETAIL(id || ''),
    queryFn: () => getProjectByIdApi(id!),
    enabled: !!id,
  });
};

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.LIST });
    },
  });
};

export const useUpdateProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProjectApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.LIST });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(data.id) });
    },
  });
};

export const useUpdateBudgetMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBudgetApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.LIST });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(data.id) });
    },
  });
};

export const useDeleteProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.LIST });
    },
  });
};

export const useSaveProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.SAVED });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.LIST });
    },
  });
};

export const useUnsaveProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unsaveProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.SAVED });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.LIST });
    },
  });
};

export const useGetSavedProjects = () => {
  return useQuery<ProjectDetail[]>({
    queryKey: QUERY_KEYS.PROJECT.SAVED,
    queryFn: getSavedProjectsApi,
  });
};
