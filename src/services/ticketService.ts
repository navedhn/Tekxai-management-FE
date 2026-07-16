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

export const getTicketStats = (tickets: SupportTicket[]) => ({
  total: tickets.length,
  pending: tickets.filter(t => t.status === 'pending').length,
  inProgress: tickets.filter(t => t.status === 'in_progress').length,
  resolved: tickets.filter(t => t.status === 'resolved').length,
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

export const useGetTickets = (filters: TicketListFilters = {}) =>
  useQuery({
    queryKey: [...QUERY_KEYS.TICKETS.LIST, filters],
    queryFn: () => fetchTickets(filters),
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

export const filterTicketsByStatus = (
  tickets: SupportTicket[],
  status: TicketStatus | 'all'
) => (status === 'all' ? tickets : tickets.filter(t => t.status === status));
