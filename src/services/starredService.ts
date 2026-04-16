import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export interface StarredItem {
    id: string;
    item_type: string;
    name?: string;
    title?: string;
    content?: string;
    created_at?: string;
    author?: {
        name: string;
        avatar?: string;
    };
    [key: string]: any;
}

export interface StarredList {
    comments: StarredItem[];
    projects: StarredItem[];
    tasks: StarredItem[];
}

export const getStarredQueriesApi = async (params?: Record<string, any>): Promise<any> => {
    const filteredParams = params 
        ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
        : {};
    
    const queryString = new URLSearchParams(filteredParams).toString();
    const url = queryString ? `${API_ENDPOINTS.STARRED.QUERIES}?${queryString}` : API_ENDPOINTS.STARRED.QUERIES;
    
    const res = await apiRequest<any>(url);
    const data = res?.payload || res;
    
    // If the backend returns a direct array when paginated/tabbed, support it
    if (Array.isArray(data)) return data; 
    
    return {
        comments: data?.comments || [],
        projects: data?.projects || [],
        tasks: data?.tasks || []
    };
};

export const starItemApi = async ({ item_type, id }: { item_type: string; id: string | number }) => {
    return apiRequest(API_ENDPOINTS.STARRED.STAR_ITEM(item_type, id), {
        method: 'POST',
    });
};

export const unstarItemApi = async ({ item_type, id }: { item_type: string; id: string | number }) => {
    return apiRequest(API_ENDPOINTS.STARRED.UNSTAR_ITEM(item_type, id), {
        method: 'DELETE',
    });
};

// Hooks
export const useGetStarredQueries = (params?: Record<string, any>) => {
    return useQuery<any>({
        queryKey: [...QUERY_KEYS.STARRED.QUERIES, params],
        queryFn: () => getStarredQueriesApi(params),
    });
};

export const useStarItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: starItemApi,
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STARRED.QUERIES });
        },
    });
};

export const useUnstarItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: unstarItemApi,
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STARRED.QUERIES });
        },
    });
};
