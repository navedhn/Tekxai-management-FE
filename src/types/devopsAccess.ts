export type CommChannel = 'EMAIL' | 'CLICKUP' | 'SLACK' | 'TEAMS' | 'WHATSAPP' | 'GOOGLE_MEET' | 'ZOOM' | 'OTHER';
export type AccessStatus = 'GRANTED' | 'PENDING' | 'NOT_APPLICABLE';
export type AwsAccessStatus = 'GRANTED' | 'PENDING' | 'LIMITED' | 'NOT_APPLICABLE';
export type ProgressSharedStatus = 'NOT_SHARED' | 'SHARED' | 'AWAITING_FEEDBACK' | 'CLIENT_APPROVED';

export interface DevopsAccessTracking {
  id: string | null;
  project_id: string;
  point_of_communication: CommChannel;
  progress_shared_to_client: boolean;
  progress_shared_status: ProgressSharedStatus;
  progress_shared_date: string | null;
  git_access_status: AccessStatus;
  server_access_status: AccessStatus;
  domain_access_status: AccessStatus;
  email_smtp_access_status: AccessStatus;
  aws_access_status: AwsAccessStatus;
  devops_remarks: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type DevopsAccessUpdatePayload = Partial<
  Pick<
    DevopsAccessTracking,
    | 'point_of_communication'
    | 'progress_shared_to_client'
    | 'progress_shared_status'
    | 'progress_shared_date'
    | 'git_access_status'
    | 'server_access_status'
    | 'domain_access_status'
    | 'email_smtp_access_status'
    | 'aws_access_status'
    | 'devops_remarks'
  >
>;

export interface ProjectTrackingLink {
  id: string;
  project_id: string;
  link_type: 'CLICKUP' | 'GOOGLE_SHEET' | 'NOTION' | 'JIRA' | 'GITHUB_PROJECT' | 'LINEAR' | 'OTHER';
  label: string | null;
  url: string;
  created_by: string | null;
  created_at: string;
}
