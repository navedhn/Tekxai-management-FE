export type MilestonesView = 'dashboard' | 'list' | 'board' | 'timeline' | 'table' | 'workload' | 'team';

export type PortalProjectDetail = {
  id: string;
  title: string;
  status: string;
  project_type: string;
  progress: number;
  start_date: string | null;
  end_date: string | null;
  client_id: string | null;
  project_manager: { id: string; first_name: string; last_name: string } | null;
  current_milestone: { id: string; title: string; status: string; due_date: string | null } | null;
};

export type PortalDeliverable = { id: string; title: string; document_type: string };

export type PortalMilestone = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  progress_percent: number;
  completed_date: string | null;
  sequence: number | null;
  estimated_start: string | null;
  estimated_end: string | null;
  members: { id: string; first_name: string | null; last_name: string | null; avatar: string | null }[];
  deliverables: PortalDeliverable[];
};

export type PortalUpdate = {
  id: string;
  title: string;
  body: string;
  milestone_id: string | null;
  published_at: string | null;
  created_at: string;
};

export type PortalMessageAttachment = {
  // null for a single-file message (its file lives in the attachment_*
  // columns); the view-url endpoint's default then returns that file.
  id: string | null;
  file_key: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
};

export const messageAttachments = (m: Pick<PortalMessage, 'attachments' | 'attachment_file_key' | 'attachment_file_name' | 'attachment_mime_type' | 'attachment_size_bytes'>): PortalMessageAttachment[] => {
  if (m.attachments) return m.attachments;
  if (!m.attachment_file_key) return [];
  return [{ id: null, file_key: m.attachment_file_key, file_name: m.attachment_file_name, mime_type: m.attachment_mime_type, size_bytes: m.attachment_size_bytes }];
};

export type PortalMessage = {
  id: string;
  content: string;
  milestone_id: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user: { id: string; first_name: string; last_name: string; user_type: 'INTERNAL' | 'CLIENT'; avatar?: string | null };
  attachment_file_key: string | null;
  attachment_file_name: string | null;
  attachment_mime_type: string | null;
  attachment_size_bytes: number | null;
  // Every file on the message, in send order. Absent on messages from an
  // older API response — use messageAttachments() rather than reading this
  // directly, it falls back to the single attachment_* fields.
  attachments?: PortalMessageAttachment[];
  reactions: Array<{ id: string; user_id: string; emoji: string; user: { id: string; first_name: string; last_name: string } }>;
  mentions: string[];
};

export type PortalFile = {
  id: string;
  title: string;
  document_type: string;
  milestone_id: string | null;
  created_at: string;
};

export type PortalApproval = {
  id: string;
  milestone_id: string;
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';
  submitted_at: string | null;
  responded_at: string | null;
  comment: string | null;
};
