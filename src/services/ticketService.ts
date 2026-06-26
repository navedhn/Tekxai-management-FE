import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateTicketPayload,
  SupportTicket,
  TicketRecipient,
  TicketStatus,
} from '@/types/ticket';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

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

const fetchTickets = async (): Promise<SupportTicket[]> => {
  const res = await apiRequest<any>(API_ENDPOINTS.TICKET.LIST);
  return (res?.payload?.records || res?.payload || []) as SupportTicket[];
};

const createTicket = async (payload: CreateTicketPayload): Promise<SupportTicket> => {
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
      recipient_role:  recipient.role,
      recipient_label: recipient.label,
      recipient_name:  recipientName,
      priority:        payload.priority,
    }),
  });
  return (res?.payload || res) as SupportTicket;
};

export const useGetTickets = () =>
  useQuery({
    queryKey: QUERY_KEYS.TICKETS.LIST,
    queryFn: fetchTickets,
  });

export const useCreateTicketMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TICKETS.LIST });
    },
  });
};

export const filterTicketsByStatus = (
  tickets: SupportTicket[],
  status: TicketStatus | 'all'
) => (status === 'all' ? tickets : tickets.filter(t => t.status === status));
