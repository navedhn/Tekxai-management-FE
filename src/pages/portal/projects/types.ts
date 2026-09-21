export type PortalProjectDetail = {
  id: string;
  title: string;
  status: string;
  project_type: string;
  progress: number;
  start_date: string | null;
  end_date: string | null;
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

export type PortalMessage = {
  id: string;
  content: string;
  milestone_id: string | null;
  parent_id: string | null;
  created_at: string;
  user: { id: string; first_name: string; last_name: string; user_type: 'INTERNAL' | 'CLIENT' };
  attachment_file_key: string | null;
  attachment_file_name: string | null;
  attachment_mime_type: string | null;
  attachment_size_bytes: number | null;
  reactions: Array<{ id: string; user_id: string; emoji: string }>;
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
