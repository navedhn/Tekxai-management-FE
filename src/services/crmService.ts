import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface CRMDashboard {
  upwork: { total: number; won: number; active: number; won_value: number };
  linkedin: { total: number; won: number; active: number; won_value: number };
  email: { total: number; won: number; active: number; won_value: number };
  deposits_this_month: number;
  hot_leads: {
    upwork: any[];
    linkedin: any[];
  };
  recent_won: any[];
  pipeline_summary: { total_leads: number; total_won_value: number };
}

export function useGetCRMDashboard() {
  return useQuery<CRMDashboard>({
    queryKey: ['crm-dashboard'],
    queryFn: () => apiRequest<CRMDashboard>('api/v1/crm/dashboard'),
  });
}

// ── Post-Sales CRM Dashboard ────────────────────────────────────────────────
// Client-delivery / project-health dashboard for the ERP's CRM workspace.
// Distinct from useGetCRMDashboard above, which is the sales-pipeline (leads)
// dashboard, kept intact for the future standalone Sales CRM app.
export interface ProjectSummary {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
  end_date: string | null;
  days_remaining: number | null;
  health_status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface MilestoneSummary {
  id: string;
  title: string;
  due_date: string;
  project: { id: string; title: string; client_name: string | null };
}

export interface EmployeeAllocation {
  id: string;
  name: string;
  department: string;
  active_projects: number;
}

export interface ClientActivityEntry {
  id: string;
  project: { id: string; title: string; client_name: string | null };
  update_date: string;
  summary: string;
  client_response: string | null;
  updated_by: string | null;
}

export interface PostSalesDashboard {
  top_kpis: {
    active_clients: number;
    active_projects: number;
    queued_projects: number;
    completed_projects: number;
    overdue_projects: number;
    projects_due_this_week: number;
  };
  project_health: {
    critical_projects: { count: number; projects: ProjectSummary[] };
    blocked_projects: { count: number; projects: ProjectSummary[] };
    missing_team_members: { count: number; projects: ProjectSummary[] };
    missing_milestones: { count: number; projects: ProjectSummary[] };
    missing_project_manager: { count: number; projects: ProjectSummary[] };
    waiting_for_client_response: { count: number; projects: ProjectSummary[] };
  };
  status_distribution: Record<string, number>;
  timeline: {
    upcoming_due_dates: ProjectSummary[];
    overdue_due_dates: ProjectSummary[];
    upcoming_milestones: MilestoneSummary[];
    overdue_milestones: MilestoneSummary[];
    projects_with_no_activity: (ProjectSummary & { last_updated: string })[];
  };
  resource_overview: {
    employee_allocation: EmployeeAllocation[];
    employees_overloaded: { count: number; employees: EmployeeAllocation[] };
    employees_available: { count: number; employees: EmployeeAllocation[] };
    department_workload: { department: string; employee_count: number; active_projects: number }[];
    team_capacity: { total_employees: number; allocated: number; available: number; overload_threshold: number };
  };
  client_success: {
    clients_with_active_projects: number;
    clients_waiting_for_feedback: number;
    projects_waiting_for_client: number;
    client_satisfaction: number | null;
    recent_client_activity: ClientActivityEntry[];
  };
}

export function useGetPostSalesDashboard() {
  return useQuery<PostSalesDashboard>({
    queryKey: ['crm-post-sales-dashboard'],
    queryFn: () => apiRequest<PostSalesDashboard>('api/v1/crm/post-sales-dashboard'),
  });
}

export function useGetTeamHierarchy() {
  return useQuery<any[]>({
    queryKey: ['crm-hierarchy'],
    queryFn: () => apiRequest<any[]>('api/v1/crm/hierarchy'),
  });
}

export function useAssignSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, supervisor_id }: { userId: string; supervisor_id: string | null }) =>
      apiRequest<any>(`api/v1/crm/users/${userId}/supervisor`, {
        method: 'PATCH',
        body: JSON.stringify({ supervisor_id }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-hierarchy'] }),
  });
}
