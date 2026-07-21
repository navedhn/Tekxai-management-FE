export type CommChannel =
  | 'EMAIL' | 'CLICKUP' | 'SLACK' | 'TEAMS' | 'WHATSAPP' | 'DISCORD' | 'SKYPE'
  | 'ZOOM' | 'UPWORK' | 'FIVERR' | 'PHONE' | 'GOOGLE_MEET' | 'OTHER';
export type AccessStatus = 'GRANTED' | 'PENDING' | 'NOT_APPLICABLE';
export type AwsAccessStatus = 'GRANTED' | 'PENDING' | 'LIMITED' | 'NOT_APPLICABLE';
export type AzureAccessStatus = AwsAccessStatus;
export type ProgressSharedStatus = 'NOT_SHARED' | 'SHARED' | 'AWAITING_FEEDBACK' | 'CLIENT_APPROVED';
export type HostingEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
export type DomainSslStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NOT_CONFIGURED';
export type DatabaseBackupStatus = 'ENABLED' | 'DISABLED' | 'UNKNOWN';
export type ApiKeysStatus = 'GRANTED' | 'PENDING' | 'NOT_APPLICABLE';

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
  openai_access_status: AccessStatus;
  stripe_access_status: AccessStatus;
  azure_access_status: AzureAccessStatus;
  devops_remarks: string | null;

  git_provider: string | null;
  git_repo_url: string | null;
  git_organization: string | null;
  git_default_branch: string | null;

  hosting_provider: string | null;
  hosting_environment: HostingEnvironment | null;
  hosting_server: string | null;
  hosting_region: string | null;

  domain_name: string | null;
  domain_dns_provider: string | null;
  domain_ssl_status: DomainSslStatus | null;
  domain_expiry_date: string | null;

  database_provider: string | null;
  database_version: string | null;
  database_backup_status: DatabaseBackupStatus | null;

  storage_provider: string | null;
  cdn_provider: string | null;
  smtp_provider: string | null;
  third_party_services: string | null;
  api_keys_status: ApiKeysStatus;
  point_of_contact: string | null;
  credentials_verified_date: string | null;

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
    | 'openai_access_status'
    | 'stripe_access_status'
    | 'azure_access_status'
    | 'devops_remarks'
    | 'git_provider'
    | 'git_repo_url'
    | 'git_organization'
    | 'git_default_branch'
    | 'hosting_provider'
    | 'hosting_environment'
    | 'hosting_server'
    | 'hosting_region'
    | 'domain_name'
    | 'domain_dns_provider'
    | 'domain_ssl_status'
    | 'domain_expiry_date'
    | 'database_provider'
    | 'database_version'
    | 'database_backup_status'
    | 'storage_provider'
    | 'cdn_provider'
    | 'smtp_provider'
    | 'third_party_services'
    | 'api_keys_status'
    | 'point_of_contact'
    | 'credentials_verified_date'
  >
>;

export interface ProjectTrackingLink {
  id: string;
  project_id: string;
  link_type: 'CLICKUP' | 'TRACKING_SHEET' | 'GOOGLE_SHEET' | 'FIGMA' | 'LOOM' | 'GITHUB' | 'NOTION' | 'JIRA' | 'GITHUB_PROJECT' | 'LINEAR' | 'OTHER';
  label: string | null;
  url: string;
  created_by: string | null;
  created_at: string;
}
