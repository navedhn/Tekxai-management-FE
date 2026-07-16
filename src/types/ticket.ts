// Service-desk tickets carry workflow-defined statuses (any string from the
// type's workflow steps); the three literals below are the legacy statuses.
export type TicketStatus = 'pending' | 'in_progress' | 'resolved' | (string & {});

export type TicketRecipientRole =
  | 'team_lead'
  | 'office_boy'
  | 'hr'
  | 'admin'
  | 'other';

export type TicketPriority = 'low' | 'medium' | 'high';

export type TicketCategory = 'IT' | 'HR' | 'FINANCE' | 'ADMIN' | 'OTHER';

export interface TicketRecipient {
  id: string;
  role: TicketRecipientRole;
  label: string;
  name: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  user?: { id: string; first_name: string; last_name: string; email: string; avatar?: string };
}

// ─── Service Desk (ticket-type driven) shapes — mirror the backend's
// ticket_types.field_schema / workflow JSON exactly ─────────────────────────

export interface TicketFieldDef {
  key: string;
  label: string;
  type: string; // text | textarea | number | date | time | checkbox | switch | select | multiselect | ...
  placeholder?: string;
  help_text?: string;
  required?: boolean;
  default?: unknown;
  options?: string[];
}

export interface TicketFormSection {
  section: string;
  fields: TicketFieldDef[];
}

export interface TicketWorkflowStep {
  key: string;
  label: string;
  requires_approval?: boolean;
  approver_role?: string;
}

export interface TicketTypeSummary {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  category_id: string;
  project_association: 'NONE' | 'OPTIONAL' | 'REQUIRED';
  field_schema: TicketFormSection[];
  workflow: TicketWorkflowStep[];
  response_sla_mins?: number | null;
  resolution_sla_mins?: number | null;
  is_active: boolean;
}

export interface TicketCategoryRecord {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface TicketApproval {
  id: string;
  action: 'APPROVE' | 'REJECT';
  comment?: string | null;
  stage: string;
  created_at: string;
  approver?: { id: string; first_name: string; last_name: string; email: string };
}

export interface TicketTimelineEntry {
  id: string;
  action: string;
  description?: string | null;
  created_at: string;
  user?: { id: string; first_name: string; last_name: string };
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category?: TicketCategory;
  departmentId?: string;
  department?: { id: string; name: string } | null;
  recipientRole: TicketRecipientRole;
  recipientLabel: string;
  recipientName: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity?: string | null;
  createdAt: string;
  resolvedAt?: string;
  closedAt?: string | null;
  resolutionNote?: string;
  createdBy: string;
  createdByEmail: string;
  ticketType?: { id: string; key: string; label: string; category?: { id: string; key: string; label: string } } | null;
  assignee?: { id: string; first_name: string; last_name: string; email: string } | null;
  team?: { id: string; name: string } | null;
  project?: { id: string; title: string } | null;
  customFields?: Record<string, unknown> | null;
  typeSnapshot?: { field_schema?: TicketFormSection[]; workflow?: TicketWorkflowStep[]; type_name?: string } | null;
  responseDueAt?: string | null;
  resolutionDueAt?: string | null;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  approvals?: TicketApproval[];
  replies?: TicketReply[];
  attachments?: { id: string; file_name: string; file_key: string; mime_type: string; file_size: number; created_at: string }[];
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  category?: TicketCategory;
  departmentId?: string;
  recipientId: string;
  customRecipientName?: string;
  priority: TicketPriority;
  createdBy: string;
  createdByEmail: string;
  // Service Desk path — present when the ticket is raised against a configured type
  ticketTypeId?: string;
  customFields?: Record<string, unknown>;
  projectId?: string;
  severity?: string;
}
