import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { unwrapApiData, unwrapApiList } from '@/utils/apiResponse';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

// --- Types ---

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

export interface ProjectMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
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
}

export interface ProjectDetail {
  id: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | string;
  progress: number;
  total_hours: number;
  due_date: string | null;
  start_date: string;
  end_date: string;
  member_count: number;
  members: ProjectMember[];
  all_members?: ProjectMember[];
  owner?: ProjectMember;
  team_leader?: ProjectMember | null;
  created_at: string;
  updated_at: string;
  is_saved: boolean;
  description?: string;
  owner_id?: string | number;
  leader_id?: string | number;
}

// --- API Functions ---

const getProjectsApi = async (params?: Record<string, any>) => {
  const filteredParams = params 
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
    : {};
  
  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${API_ENDPOINTS.PROJECT.LIST}?${queryString}` : API_ENDPOINTS.PROJECT.LIST;
  const res = await apiRequest<unknown>(url);
  return unwrapApiList<ProjectDetail>(res);
};

const getProjectByIdApi = async (id: string | number) => {
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
