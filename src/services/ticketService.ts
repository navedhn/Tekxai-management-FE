import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateTicketPayload,
  SupportTicket,
  TicketCategory,
  TicketCategoryRecord,
  TicketRecipient,
  TicketStatus,
  TicketTimelineEntry,
  TicketTypeSummary,
} from '@/types/ticket';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export const TICKET_CATEGORIES: { label: string; value: TicketCategory }[] = [
  { label: 'IT',      value: 'IT' },
  { label: 'HR',      value: 'HR' },
  { label: 'Finance', value: 'FINANCE' },
  { label: 'Admin',   value: 'ADMIN' },
  { label: 'Other',   value: 'OTHER' },
];

export const TICKET_RECIPIENTS: TicketRecipient[] = [
  { id: 'tl',         role: 'team_lead',  label: 'Team Lead (TL)', name: 'Team Lead'     },
  { id: 'office_boy', role: 'office_boy', label: 'Office Boy',      name: 'Office Boy'    },
  { id: 'hr',         role: 'hr',         label: 'HR',              name: 'HR'            },
  { id: 'admin',      role: 'admin',      label: 'Admin',           name: 'Admin Support' },
  { id: 'other',      role: 'other',      label: 'Other',           name: ''              },
];

// Workflow-driven tickets carry per-type status keys (OPEN, MANAGER_APPROVAL,
// PURCHASE, CLOSED, ...) instead of the legacy 'pending'/'in_progress'/
// 'resolved' literals, so comparing t.status directly against those three
// strings undercounts almost every ticket. Classify using the ticket's own
// typeSnapshot.workflow position instead — same 3-way rule the backend's
// get_ticket_stats() `by_bucket` uses: first step = pending, last step =
// resolved, anything else = in progress. Legacy tickets (no typeSnapshot)
// fall back to their original literal status.
export type TicketBucket = 'pending' | 'in_progress' | 'resolved';
export const bucketForTicket = (t: SupportTicket): TicketBucket => {
  const wf = t.typeSnapshot?.workflow;
  if (wf?.length) {
    const idx = wf.findIndex(s => s.key === t.status);
    if (idx === 0) return 'pending';
    if (idx === wf.length - 1) return 'resolved';
    if (idx > 0) return 'in_progress';
  }
  if (t.status === 'resolved' || t.status === 'closed') return 'resolved';
  if (t.status === 'pending') return 'pending';
  return 'in_progress';
};

export const getTicketStats = (tickets: SupportTicket[]) => ({
  total: tickets.length,
  pending: tickets.filter(t => bucketForTicket(t) === 'pending').length,
  inProgress: tickets.filter(t => bucketForTicket(t) === 'in_progress').length,
  resolved: tickets.filter(t => bucketForTicket(t) === 'resolved').length,
});

export const formatTicketDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export interface TicketListFilters {
  search?: string;
  status?: string;
  priority?: string;
  category_id?: string;
  ticket_type_id?: string;
  sla?: 'overdue';
  from?: string;
  to?: string;
  created_by?: string;
}

const fetchTickets = async (filters: TicketListFilters = {}): Promise<SupportTicket[]> => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, String(value));
  }
  const qs = params.toString();
  const res = await apiRequest<any>(`${API_ENDPOINTS.TICKET.LIST}${qs ? `?${qs}` : ''}`);
  return (res?.payload?.records || res?.payload || []) as SupportTicket[];
};

const createTicket = async (payload: CreateTicketPayload): Promise<SupportTicket> => {
  // Service Desk path — the backend derives recipient/assignment from the
  // ticket type's configuration, so only the type-driven fields are sent.
  if (payload.ticketTypeId) {
    const res = await apiRequest<any>(API_ENDPOINTS.TICKET.CREATE, {
      method: 'POST',
      body: JSON.stringify({
        subject:        payload.subject.trim(),
        description:    payload.description.trim(),
        priority:       payload.priority,
        severity:       payload.severity,
        ticket_type_id: payload.ticketTypeId,
        custom_fields:  payload.customFields || {},
        project_id:     payload.projectId,
      }),
    });
    return (res?.payload || res) as SupportTicket;
  }

  const recipient = TICKET_RECIPIENTS.find(r => r.id === payload.recipientId);
  if (!recipient) throw new Error('Invalid recipient');

  const recipientName =
    recipient.role === 'other'
      ? payload.customRecipientName?.trim() || 'Unspecified'
      : recipient.name;

  const res = await apiRequest<any>(API_ENDPOINTS.TICKET.CREATE, {
    method: 'POST',
    body: JSON.stringify({
      subject:         payload.subject.trim(),
      description:     payload.description.trim(),
      category:        payload.category,
      department_id:   payload.departmentId,
      recipient_role:  recipient.role,
      recipient_label: recipient.label,
      recipient_name:  recipientName,
      priority:        payload.priority,
    }),
  });
  return (res?.payload || res) as SupportTicket;
};

// Root cause of "employee still sees Pending after admin changes status":
// the global QueryClient default (staleTime: 5min, refetchOnWindowFocus:
// false) meant this query only ever refetched on a fresh mount more than
// 5 minutes after the last one — an admin's status change in a completely
// separate browser session never reached an already-open employee tab. No
// websocket infrastructure exists in this app (checked: no socket.io/ws
// dependency anywhere), so per-query polling is the correct fix here. 20s
// is frequent enough to feel "live" for a support-ticket workflow without
// hammering the API — override the global staleTime too, since a value
// shorter than the poll interval would otherwise let a manual refetch (e.g.
// window refocus) serve a cached response instead of hitting the network.
export const useGetTickets = (filters: TicketListFilters = {}) =>
  useQuery({
    queryKey: [...QUERY_KEYS.TICKETS.LIST, filters],
    queryFn: () => fetchTickets(filters),
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

// ─── Service Desk configuration (categories + types with field_schema) ──────

export const useTicketCategoriesQuery = (includeInactive: boolean = false) =>
  useQuery<TicketCategoryRecord[]>({
    queryKey: ['ticket-categories', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      const qs = includeInactive ? '?include_inactive=true' : '';
      const res = await apiRequest<any>(`${API_ENDPOINTS.TICKET_CATEGORY.LIST}${qs}`);
      return (res?.payload || []) as TicketCategoryRecord[];
    },
  });

export const useCreateTicketCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; label: string; sort_order?: number }) =>
      apiRequest<any>(API_ENDPOINTS.TICKET_CATEGORY.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-categories'] }),
  });
};

export const useUpdateTicketCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest<any>(API_ENDPOINTS.TICKET_CATEGORY.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-categories'] }),
  });
};

export const useToggleTicketCategoryActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiRequest<any>(API_ENDPOINTS.TICKET_CATEGORY.ACTIVE(id), { method: 'PATCH', body: JSON.stringify({ is_active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-categories'] }),
  });
};

export const useTicketTypesQuery = (categoryId?: string) =>
  useQuery<TicketTypeSummary[]>({
    queryKey: ['ticket-types', categoryId || 'all'],
    queryFn: async () => {
      const qs = categoryId ? `?category_id=${categoryId}` : '';
      const res = await apiRequest<any>(`${API_ENDPOINTS.TICKET_TYPE.LIST}${qs}`);
      return (res?.payload || []) as TicketTypeSummary[];
    },
    enabled: categoryId !== '',
  });

export const useTicketTimelineQuery = (ticketId?: string) =>
  useQuery<TicketTimelineEntry[]>({
    queryKey: ['ticket-timeline', ticketId],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.TICKET.TIMELINE(ticketId!));
      return (res?.payload?.records || []) as TicketTimelineEntry[];
    },
    enabled: !!ticketId,
    // Same staleness problem as useGetTickets above — a reply or status
    // change made by the other party (admin vs. employee) must show up in
    // an already-open detail view without a manual reload.
    staleTime: 15_000,
    refetchInterval: !!ticketId ? 20_000 : false,
  });

export const useCreateTicketMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      // Invalidate the whole 'tickets' key root so both the employee list
      // (['tickets','list',...]) and the admin list (['tickets','admin-list',...])
      // refetch after a new ticket is created.
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useReassignTicketMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string | null }) =>
      apiRequest<any>(API_ENDPOINTS.TICKET.UPDATE(id), {
        method: 'PATCH',
        body: JSON.stringify({ assignee_id: assigneeId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-timeline'] });
    },
  });
};

export const useTicketTypeAssigneesQuery = (ticketTypeId?: string) =>
  useQuery<{ id: string; first_name: string; last_name: string; email: string }[]>({
    queryKey: ['ticket-type-assignees', ticketTypeId],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.TICKET_TYPE.ASSIGNEES(ticketTypeId!));
      return (res?.payload || []) as any[];
    },
    enabled: !!ticketTypeId,
  });

export const useSetTicketTypeAssigneesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketTypeId, userIds }: { ticketTypeId: string; userIds: string[] }) =>
      apiRequest<any>(API_ENDPOINTS.TICKET_TYPE.ASSIGNEES(ticketTypeId), {
        method: 'PUT',
        body: JSON.stringify({ user_ids: userIds }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-type-assignees', variables.ticketTypeId] });
    },
  });
};

export const useDeleteTicketMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiRequest<any>(API_ENDPOINTS.TICKET.DELETE(id), {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

// `status` here is always 'all' or one of the 3 abstract stat-tab buckets
// (see STATUS_TABS) — never a real workflow status key — so this must
// filter by bucketForTicket(), not by literal t.status equality (which
// never matched real tickets; see getTicketStats above for why).
export const filterTicketsByStatus = (
  tickets: SupportTicket[],
  status: TicketStatus | 'all'
) => (status === 'all' ? tickets : tickets.filter(t => bucketForTicket(t) === status));
