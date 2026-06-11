import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateTicketPayload,
  SupportTicket,
  TicketRecipient,
  TicketStatus,
} from '@/types/ticket';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';

const STORAGE_KEY = 'tekxai_employee_tickets';

export const TICKET_RECIPIENTS: TicketRecipient[] = [
  { id: 'tl', role: 'team_lead', label: 'Team Lead (TL)', name: 'Muhammad Usman' },
  { id: 'office_boy', role: 'office_boy', label: 'Office Boy', name: 'Ahmed Khan' },
  { id: 'hr', role: 'hr', label: 'HR', name: 'Sara Ali' },
  { id: 'admin', role: 'admin', label: 'Admin', name: 'Admin Support' },
  { id: 'other', role: 'other', label: 'Other', name: '' },
];

const SEED_TICKETS: SupportTicket[] = [
  {
    id: 't1',
    ticketNumber: 'TKT-1001',
    subject: 'AC not working in workspace',
    description: 'The air conditioner in the east wing has stopped cooling since yesterday.',
    recipientRole: 'office_boy',
    recipientLabel: 'Office Boy',
    recipientName: 'Ahmed Khan',
    status: 'resolved',
    priority: 'high',
    createdAt: '2026-06-05T09:30:00.000Z',
    resolvedAt: '2026-06-06T14:00:00.000Z',
    resolutionNote: 'Technician fixed the AC unit. Cooling restored.',
    createdBy: 'Employee',
    createdByEmail: 'employee@tekxai.com',
  },
  {
    id: 't2',
    ticketNumber: 'TKT-1002',
    subject: 'Leave approval for next week',
    description: 'Need approval for 2 days leave on June 16–17 for a family event.',
    recipientRole: 'team_lead',
    recipientLabel: 'Team Lead (TL)',
    recipientName: 'Muhammad Usman',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-06-08T11:15:00.000Z',
    createdBy: 'Employee',
    createdByEmail: 'employee@tekxai.com',
  },
  {
    id: 't3',
    ticketNumber: 'TKT-1003',
    subject: 'Salary slip correction',
    description: 'June salary slip shows incorrect commission amount. Please review.',
    recipientRole: 'hr',
    recipientLabel: 'HR',
    recipientName: 'Sara Ali',
    status: 'in_progress',
    priority: 'high',
    createdAt: '2026-06-09T08:45:00.000Z',
    createdBy: 'Employee',
    createdByEmail: 'employee@tekxai.com',
  },
];

const readTickets = (): SupportTicket[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TICKETS));
      return SEED_TICKETS;
    }
    return JSON.parse(raw) as SupportTicket[];
  } catch {
    return SEED_TICKETS;
  }
};

const writeTickets = (tickets: SupportTicket[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
};

const nextTicketNumber = (tickets: SupportTicket[]) => {
  const nums = tickets
    .map(t => parseInt(t.ticketNumber.replace('TKT-', ''), 10))
    .filter(n => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `TKT-${max + 1}`;
};

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
  await new Promise(r => setTimeout(r, 300));
  return readTickets().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

const createTicket = async (payload: CreateTicketPayload): Promise<SupportTicket> => {
  await new Promise(r => setTimeout(r, 500));

  const recipient = TICKET_RECIPIENTS.find(r => r.id === payload.recipientId);
  if (!recipient) throw new Error('Invalid recipient');

  const recipientName =
    recipient.role === 'other'
      ? payload.customRecipientName?.trim() || 'Unspecified'
      : recipient.name;

  const tickets = readTickets();
  const ticket: SupportTicket = {
    id: `t-${Date.now()}`,
    ticketNumber: nextTicketNumber(tickets),
    subject: payload.subject.trim(),
    description: payload.description.trim(),
    recipientRole: recipient.role,
    recipientLabel: recipient.label,
    recipientName,
    status: 'pending',
    priority: payload.priority,
    createdAt: new Date().toISOString(),
    createdBy: payload.createdBy,
    createdByEmail: payload.createdByEmail,
  };

  writeTickets([ticket, ...tickets]);
  return ticket;
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
