import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { unwrapApiData, unwrapApiList } from '@/utils/apiResponse';
import { isMockSession } from '@/mocks/mockAuth';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

export type ProjectMemberRole =
  | 'FRONTEND' | 'BACKEND' | 'TEAM_LEAD' | 'QA' | 'DEVOPS' | 'UI_UX'
  | 'AI_ENGINEER' | 'BUSINESS_ANALYST' | 'SALES' | 'ESTIMATOR' | 'OTHER' | 'MEMBER';

export const PROJECT_MEMBER_ROLES: { value: ProjectMemberRole; label: string }[] = [
  { value: 'TEAM_LEAD',        label: 'Team Lead' },
  { value: 'FRONTEND',         label: 'Frontend Developer' },
  { value: 'BACKEND',          label: 'Backend Developer' },
  { value: 'QA',               label: 'QA' },
  { value: 'UI_UX',            label: 'UI/UX' },
  { value: 'AI_ENGINEER',      label: 'AI Engineer' },
  { value: 'BUSINESS_ANALYST', label: 'Business Analyst' },
  { value: 'DEVOPS',           label: 'DevOps' },
  { value: 'SALES',            label: 'Sales' },
  { value: 'ESTIMATOR',        label: 'Estimator' },
  { value: 'OTHER',            label: 'Other' },
  { value: 'MEMBER',           label: 'Member' },
];

export interface ProjectMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
  role?: ProjectMemberRole;
  allocation_percent?: number;
}

export interface ProjectDto {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  owner_id?: string;
  leader_id?: string;

  member_ids?: string[];
  members?: { user_id: string; role: ProjectMemberRole; allocation_percent?: number }[];
  client_name?: string;

  client_id?: string | null;

  bidder_id?: string | null;

  source?: string | null;

  commission_type?: 'PERCENTAGE' | 'FIXED' | null;
  commission_value?: number | null;
  commission_status?: 'FULL_PROJECT_PAID' | 'MILESTONES_PAID' | 'PENDING' | null;
  dev_status?: string;
  status?: string;

  budget?: number | null;
  budget_currency?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  business_unit_id?: string | null;
}

export interface ClientLookupResult {
  id: string;
  name: string;
  company: string | null;
}

export interface BudgetUpdatePayload {
  budget?: number | null;
  budget_currency?: string;
  budget_spent?: number;
}

export type {
  MissedReasonCategory, IssueClassification, QaStatus, DeliveryStatus, MilestoneDelivery,
} from './milestonesService';
import type { MilestoneDelivery as _MilestoneDelivery } from './milestonesService';

export interface Milestone {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  price?: number;
  payment_status?: 'UNPAID' | 'PAID';

  responsible_resources?: { id: string; first_name?: string | null; last_name?: string | null; avatar?: string | null }[];
  delivery?: _MilestoneDelivery;
}

export interface ActiveMilestone {
  id: string;
  title: string;
  due_date: string | null;
  progress_percent: number;
  owner: string | null;

  price: number;
  payment_status: 'UNPAID' | 'PAID';

  responsible_resources?: { id: string; first_name?: string | null; last_name?: string | null; avatar?: string | null }[];
  delivery?: _MilestoneDelivery;
}

export interface ProjectFinancialSummary {
  total: number;
  paid: number;
  remaining: number;
  active: number;
  currency: string;
}

export interface ProgressSharedRecency {
  label: string;
  days_ago: number | null;
  stale: boolean;
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
  deleted_at?: string | null;
  progress: number;
  progress_mode?: 'AUTO';
  total_hours: number;
  due_date: string | null;
  start_date: string;
  end_date: string;
  is_overdue?: boolean;
  days_remaining?: number | null;
  member_count: number;
  members: ProjectMember[];
  all_members?: ProjectMember[];

  member_role_counts?: Partial<Record<ProjectMemberRole, number>>;
  owner?: ProjectMember;
  team_leader?: ProjectMember | null;
  milestones?: Milestone[];
  milestones_added?: boolean;
  active_milestone?: ActiveMilestone | null;
  current_milestone?: Milestone | null;
  pending_milestones_count?: number;
  milestone_breakdown?: MilestoneBreakdown;

  delivery_summary?: { on_time: number; missed: number; pending: number };

  financial?: ProjectFinancialSummary;
  access_completion_score?: AccessCompletionScore;
  frontend_developers?: string[];
  backend_developers?: string[];

  devops_access?: {
    point_of_communication: string;
    progress_shared_status: string;
    progress_shared_date?: string | null;
    progress_shared_recency?: ProgressSharedRecency;
    git_access_status: string;
    server_access_status: string;
    domain_access_status: string;
    email_smtp_access_status: string;
    aws_access_status?: string;
    openai_access_status?: string;
    stripe_access_status?: string;
    azure_access_status?: string;
    devops_remarks?: string | null;
  } | null;
  client_portal?: ClientPortalInfo;
  health_score?: number;
  health_status?: 'HEALTHY' | 'AT_RISK' | 'WARNING' | 'CRITICAL';
  created_at: string;
  updated_at: string;
  is_saved: boolean;
  description?: string;
  owner_id?: string | number;
  leader_id?: string | number;

  client_name?: string | null;
  client_id?: string | null;
  client?: { id: string; name: string; company: string | null } | null;
  bidder_id?: string | null;
  bidder?: ProjectMember | null;
  source?: string | null;
  commission_type?: 'PERCENTAGE' | 'FIXED' | null;
  commission_value?: number | null;
  commission_status?: 'FULL_PROJECT_PAID' | 'MILESTONES_PAID' | 'PENDING' | null;
  dev_status?: string | null;
  budget?: number | null;
  budget_currency?: string;
  budget_spent?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  business_unit_id?: string | null;
  business_unit?: { id: string; name: string } | null;
  project_code?: string | null;
}

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

const restoreProjectApi = async (id: string | number) => {
  return apiRequest(API_ENDPOINTS.PROJECT.RESTORE(id), {
    method: 'PATCH',
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DASHBOARD });
    },
  });
};

export const useRestoreProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.LIST });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DASHBOARD });
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

async function fetchClientsLookupApi(search?: string): Promise<ClientLookupResult[]> {
  const url = search ? `${API_ENDPOINTS.PROJECT.CLIENTS_LOOKUP}?search=${encodeURIComponent(search)}` : API_ENDPOINTS.PROJECT.CLIENTS_LOOKUP;
  const res = await apiRequest<unknown>(url);
  return unwrapApiList<ClientLookupResult>(res);
}

export const useClientsLookupQuery = (search: string, enabled: boolean = true) => {
  return useQuery<ClientLookupResult[]>({
    queryKey: ['project-clients-lookup', search],
    queryFn: () => fetchClientsLookupApi(search),
    enabled,
  });
};
