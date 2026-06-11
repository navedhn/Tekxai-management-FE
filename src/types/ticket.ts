export type TicketStatus = 'pending' | 'in_progress' | 'resolved';

export type TicketRecipientRole =
  | 'team_lead'
  | 'office_boy'
  | 'hr'
  | 'admin'
  | 'other';

export type TicketPriority = 'low' | 'medium' | 'high';

export interface TicketRecipient {
  id: string;
  role: TicketRecipientRole;
  label: string;
  name: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  recipientRole: TicketRecipientRole;
  recipientLabel: string;
  recipientName: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdBy: string;
  createdByEmail: string;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  recipientId: string;
  customRecipientName?: string;
  priority: TicketPriority;
  createdBy: string;
  createdByEmail: string;
}
