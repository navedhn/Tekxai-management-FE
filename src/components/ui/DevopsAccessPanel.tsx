import React, { useEffect, useState } from 'react';
import { Server, Plus, ExternalLink, Trash2 } from 'lucide-react';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';
import Input from './Input';
import StatusDropdown, { StatusOption } from './StatusDropdown';
import ScoreRing from './ScoreRing';
import Badge from './Badge';
import Loader from './Loader';
import { useAuth } from '@/hooks/useAuth';
import { useDevopsAccess, useUpdateDevopsAccess } from '@/services/devopsAccessService';
import { useTrackingLinks, useCreateTrackingLink, useDeleteTrackingLink } from '@/services/trackingLinksService';
import type {
  AccessStatus, ApiKeysStatus, AwsAccessStatus, CommChannel, DatabaseBackupStatus,
  DevopsAccessUpdatePayload, DomainSslStatus, HostingEnvironment, ProgressSharedStatus,
} from '@/types/devopsAccess';
import type { AccessCompletionScore } from '@/services/projectService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';

const ACCESS_OPTIONS: StatusOption[] = [
  { label: 'Granted', value: 'GRANTED', colorClassName: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' },
  { label: 'Pending', value: 'PENDING', colorClassName: 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]' },
  { label: 'N/A', value: 'NOT_APPLICABLE', colorClassName: 'bg-gray-50 text-gray-500 border-gray-200' },
];

const AWS_OPTIONS: StatusOption[] = [
  { label: 'Granted', value: 'GRANTED', colorClassName: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' },
  { label: 'Limited', value: 'LIMITED', colorClassName: 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]' },
  { label: 'Pending', value: 'PENDING', colorClassName: 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]' },
  { label: 'N/A', value: 'NOT_APPLICABLE', colorClassName: 'bg-gray-50 text-gray-500 border-gray-200' },
];

const PROGRESS_SHARED_OPTIONS: StatusOption[] = [
  { label: 'Not Shared', value: 'NOT_SHARED', colorClassName: 'bg-gray-50 text-gray-500 border-gray-200' },
  { label: 'Shared', value: 'SHARED', colorClassName: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]' },
  { label: 'Awaiting Feedback', value: 'AWAITING_FEEDBACK', colorClassName: 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]' },
  { label: 'Client Approved', value: 'CLIENT_APPROVED', colorClassName: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' },
];

const COMM_CHANNEL_OPTIONS: { label: string; value: CommChannel }[] = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'Clickup', value: 'CLICKUP' },
  { label: 'Slack', value: 'SLACK' },
  { label: 'Microsoft Teams', value: 'TEAMS' },
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Google Meet', value: 'GOOGLE_MEET' },
  { label: 'Zoom', value: 'ZOOM' },
  { label: 'Other Platform', value: 'OTHER' },
];

const HOSTING_ENV_OPTIONS: { label: string; value: HostingEnvironment }[] = [
  { label: 'Production', value: 'PRODUCTION' },
  { label: 'Staging', value: 'STAGING' },
  { label: 'Development', value: 'DEVELOPMENT' },
];

const DOMAIN_SSL_OPTIONS: StatusOption[] = [
  { label: 'Active', value: 'ACTIVE', colorClassName: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' },
  { label: 'Expiring', value: 'EXPIRING', colorClassName: 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]' },
  { label: 'Expired', value: 'EXPIRED', colorClassName: 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]' },
  { label: 'Not Configured', value: 'NOT_CONFIGURED', colorClassName: 'bg-gray-50 text-gray-500 border-gray-200' },
];

const DB_BACKUP_OPTIONS: StatusOption[] = [
  { label: 'Enabled', value: 'ENABLED', colorClassName: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' },
  { label: 'Disabled', value: 'DISABLED', colorClassName: 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]' },
  { label: 'Unknown', value: 'UNKNOWN', colorClassName: 'bg-gray-50 text-gray-500 border-gray-200' },
];

const API_KEYS_OPTIONS: StatusOption[] = [
  { label: 'Granted', value: 'GRANTED', colorClassName: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' },
  { label: 'Pending', value: 'PENDING', colorClassName: 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]' },
  { label: 'N/A', value: 'NOT_APPLICABLE', colorClassName: 'bg-gray-50 text-gray-500 border-gray-200' },
];

type InfraFormState = Pick<
  DevopsAccessUpdatePayload,
  | 'git_provider' | 'git_repo_url' | 'git_organization' | 'git_default_branch'
  | 'hosting_provider' | 'hosting_server' | 'hosting_region'
  | 'domain_name' | 'domain_dns_provider' | 'domain_expiry_date'
  | 'database_provider' | 'database_version'
  | 'storage_provider' | 'cdn_provider' | 'smtp_provider' | 'third_party_services'
  | 'point_of_contact'
>;

const EMPTY_INFRA_FORM: InfraFormState = {
  git_provider: '', git_repo_url: '', git_organization: '', git_default_branch: '',
  hosting_provider: '', hosting_server: '', hosting_region: '',
  domain_name: '', domain_dns_provider: '', domain_expiry_date: '',
  database_provider: '', database_version: '',
  storage_provider: '', cdn_provider: '', smtp_provider: '', third_party_services: '',
  point_of_contact: '',
};

const LINK_TYPE_OPTIONS = [
  { label: 'ClickUp', value: 'CLICKUP' },
  { label: 'Google Sheet', value: 'GOOGLE_SHEET' },
  { label: 'Notion', value: 'NOTION' },
  { label: 'Jira', value: 'JIRA' },
  { label: 'GitHub Project', value: 'GITHUB_PROJECT' },
  { label: 'Linear', value: 'LINEAR' },
  { label: 'Other', value: 'OTHER' },
];

interface DevopsAccessPanelProps {
  projectId: string;
  ownerId?: string | null;
  leaderId?: string | null;
  accessScore?: AccessCompletionScore;
  healthScore?: number;
  healthStatus?: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

const HEALTH_STYLES: Record<string, { color: string; badge: string }> = {
  HEALTHY:  { color: '#027A48', badge: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' },
  WARNING:  { color: '#C4320A', badge: 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]' },
  CRITICAL: { color: '#C01048', badge: 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]' },
};

const DevopsAccessPanel: React.FC<DevopsAccessPanelProps> = ({ projectId, ownerId, leaderId, accessScore, healthScore, healthStatus }) => {
  const { user, role } = useAuth();
  const toast = useToastContext();
  const { data, isLoading } = useDevopsAccess(projectId);
  const { mutate, isPending } = useUpdateDevopsAccess(projectId);

  const { data: links = [] } = useTrackingLinks(projectId);
  const createLink = useCreateTrackingLink(projectId);
  const deleteLink = useDeleteTrackingLink(projectId);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkForm, setLinkForm] = useState({ link_type: 'CLICKUP', label: '', url: '' });

  const canEdit = role === 'ADMIN' || role === 'SUPER_ADMIN' || user?.id === ownerId || user?.id === leaderId;

  const [remarks, setRemarks] = useState('');
  const [infraForm, setInfraForm] = useState<InfraFormState>(EMPTY_INFRA_FORM);

  useEffect(() => {
    setRemarks(data?.devops_remarks || '');
  }, [data?.devops_remarks]);

  useEffect(() => {
    if (!data) return;
    setInfraForm({
      git_provider: data.git_provider || '',
      git_repo_url: data.git_repo_url || '',
      git_organization: data.git_organization || '',
      git_default_branch: data.git_default_branch || '',
      hosting_provider: data.hosting_provider || '',
      hosting_server: data.hosting_server || '',
      hosting_region: data.hosting_region || '',
      domain_name: data.domain_name || '',
      domain_dns_provider: data.domain_dns_provider || '',
      domain_expiry_date: data.domain_expiry_date ? data.domain_expiry_date.slice(0, 10) : '',
      database_provider: data.database_provider || '',
      database_version: data.database_version || '',
      storage_provider: data.storage_provider || '',
      cdn_provider: data.cdn_provider || '',
      smtp_provider: data.smtp_provider || '',
      third_party_services: data.third_party_services || '',
      point_of_contact: data.point_of_contact || '',
    });
  }, [data]);

  const infraDirty = data && Object.keys(infraForm).some((key) => {
    const k = key as keyof InfraFormState;
    const original = k === 'domain_expiry_date'
      ? (data.domain_expiry_date ? data.domain_expiry_date.slice(0, 10) : '')
      : (data[k as keyof typeof data] as string | null) || '';
    return (infraForm[k] || '') !== original;
  });

  const handleSaveInfra = () => {
    update(infraForm);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader size={32} />
      </div>
    );
  }
  if (!data) return null;

  const update = (payload: Record<string, unknown>) => {
    mutate(payload, { onError: (e: any) => toast.error(e?.message || 'Failed to update DevOps access') });
  };

  const handleAddLink = () => {
    if (!linkForm.url.trim()) return toast.error('URL is required');
    createLink.mutate(linkForm, {
      onSuccess: () => { toast.success('Tracking link added'); setLinkForm({ link_type: 'CLICKUP', label: '', url: '' }); setShowAddLink(false); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add link'),
    });
  };

  const health = healthStatus ? HEALTH_STYLES[healthStatus] : null;

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center justify-between gap-3 p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Server size={18} strokeWidth={2.5} className="text-primary-500" />
          <h3 className="font-black text-gray-900 tracking-tight text-[15px]">DevOps / Client Handoff</h3>
        </div>
        <div className="flex items-center gap-6">
          {accessScore && (
            <ScoreRing percent={accessScore.percent} size={52} strokeWidth={5} label={undefined} sublabel={`${accessScore.granted}/${accessScore.total} Access`} />
          )}
          {typeof healthScore === 'number' && health && (
            <div className="flex flex-col items-center gap-1">
              <ScoreRing percent={healthScore} size={52} strokeWidth={5} color={health.color} />
              <Badge variant="info" className={cn('rounded-lg px-2 py-0.5 text-[9px] font-black border', health.badge)}>{healthStatus}</Badge>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Point of Communication</span>
            {canEdit ? (
              <Select
                options={COMM_CHANNEL_OPTIONS}
                value={data.point_of_communication}
                onChange={(v) => update({ point_of_communication: v as CommChannel })}
              />
            ) : (
              <span className="text-sm font-bold text-gray-900">
                {COMM_CHANNEL_OPTIONS.find((o) => o.value === data.point_of_communication)?.label || data.point_of_communication}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Progress Shared to Client</span>
            <StatusDropdown
              value={data.progress_shared_status}
              options={PROGRESS_SHARED_OPTIONS}
              disabled={!canEdit}
              onChange={(v) => update({
                progress_shared_status: v as ProgressSharedStatus,
                progress_shared_date: v !== 'NOT_SHARED' ? new Date().toISOString() : null,
              })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Git Access</span>
            <StatusDropdown
              value={data.git_access_status}
              options={ACCESS_OPTIONS}
              disabled={!canEdit}
              onChange={(v) => update({ git_access_status: v as AccessStatus })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Server Access</span>
            <StatusDropdown
              value={data.server_access_status}
              options={ACCESS_OPTIONS}
              disabled={!canEdit}
              onChange={(v) => update({ server_access_status: v as AccessStatus })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Domain Access</span>
            <StatusDropdown
              value={data.domain_access_status}
              options={ACCESS_OPTIONS}
              disabled={!canEdit}
              onChange={(v) => update({ domain_access_status: v as AccessStatus })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email / SMTP</span>
            <StatusDropdown
              value={data.email_smtp_access_status}
              options={ACCESS_OPTIONS}
              disabled={!canEdit}
              onChange={(v) => update({ email_smtp_access_status: v as AccessStatus })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AWS Access</span>
            <StatusDropdown
              value={data.aws_access_status}
              options={AWS_OPTIONS}
              disabled={!canEdit}
              onChange={(v) => update({ aws_access_status: v as AwsAccessStatus })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-4 border-t border-gray-50">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Git Repository</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input placeholder="Provider (e.g. GitHub)" value={infraForm.git_provider || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, git_provider: e.target.value }))} />
            <Input placeholder="Repository URL" value={infraForm.git_repo_url || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, git_repo_url: e.target.value }))} containerClassName="sm:col-span-2" />
            <Input placeholder="Organization" value={infraForm.git_organization || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, git_organization: e.target.value }))} />
            <Input placeholder="Default Branch" value={infraForm.git_default_branch || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, git_default_branch: e.target.value }))} />
          </div>

          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hosting</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input placeholder="Provider (e.g. AWS, Vercel)" value={infraForm.hosting_provider || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, hosting_provider: e.target.value }))} />
            {canEdit ? (
              <Select options={HOSTING_ENV_OPTIONS} value={data.hosting_environment || ''} onChange={(v) => update({ hosting_environment: v as HostingEnvironment })} placeholder="Environment" />
            ) : (
              <span className="text-sm font-bold text-gray-900 self-center">{HOSTING_ENV_OPTIONS.find(o => o.value === data.hosting_environment)?.label || '—'}</span>
            )}
            <Input placeholder="Server" value={infraForm.hosting_server || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, hosting_server: e.target.value }))} />
            <Input placeholder="Region" value={infraForm.hosting_region || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, hosting_region: e.target.value }))} />
          </div>

          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Domain</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            <Input placeholder="Domain" value={infraForm.domain_name || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, domain_name: e.target.value }))} />
            <Input placeholder="DNS Provider" value={infraForm.domain_dns_provider || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, domain_dns_provider: e.target.value }))} />
            {canEdit ? (
              <StatusDropdown value={data.domain_ssl_status || 'NOT_CONFIGURED'} options={DOMAIN_SSL_OPTIONS} onChange={(v) => update({ domain_ssl_status: v as DomainSslStatus })} />
            ) : (
              <span className={cn('inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border w-fit', DOMAIN_SSL_OPTIONS.find(o => o.value === data.domain_ssl_status)?.colorClassName || 'bg-gray-50 text-gray-500 border-gray-200')}>
                {DOMAIN_SSL_OPTIONS.find(o => o.value === data.domain_ssl_status)?.label || 'Not Configured'}
              </span>
            )}
            <Input type="date" placeholder="Expiry Date" value={infraForm.domain_expiry_date || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, domain_expiry_date: e.target.value }))} />
          </div>

          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Database</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            <Input placeholder="Provider (e.g. PostgreSQL)" value={infraForm.database_provider || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, database_provider: e.target.value }))} />
            <Input placeholder="Version" value={infraForm.database_version || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, database_version: e.target.value }))} />
            {canEdit ? (
              <StatusDropdown value={data.database_backup_status || 'UNKNOWN'} options={DB_BACKUP_OPTIONS} onChange={(v) => update({ database_backup_status: v as DatabaseBackupStatus })} />
            ) : (
              <span className={cn('inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border w-fit', DB_BACKUP_OPTIONS.find(o => o.value === data.database_backup_status)?.colorClassName || 'bg-gray-50 text-gray-500 border-gray-200')}>
                {DB_BACKUP_OPTIONS.find(o => o.value === data.database_backup_status)?.label || 'Unknown'}
              </span>
            )}
          </div>

          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Storage, CDN &amp; SMTP</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input placeholder="Storage Provider" value={infraForm.storage_provider || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, storage_provider: e.target.value }))} />
            <Input placeholder="CDN Provider" value={infraForm.cdn_provider || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, cdn_provider: e.target.value }))} />
            <Input placeholder="SMTP Provider" value={infraForm.smtp_provider || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, smtp_provider: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Third-party Services</span>
              <Textarea
                value={infraForm.third_party_services || ''}
                disabled={!canEdit}
                onChange={(e) => setInfraForm((f) => ({ ...f, third_party_services: e.target.value }))}
                placeholder="Which third-party services are integrated (informational — track granular status in the Dependencies tab)"
                className="min-h-[60px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">API Keys Status</span>
              {canEdit ? (
                <StatusDropdown value={data.api_keys_status} options={API_KEYS_OPTIONS} onChange={(v) => update({ api_keys_status: v as ApiKeysStatus })} />
              ) : (
                <span className={cn('inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border w-fit', API_KEYS_OPTIONS.find(o => o.value === data.api_keys_status)?.colorClassName)}>
                  {API_KEYS_OPTIONS.find(o => o.value === data.api_keys_status)?.label || data.api_keys_status}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <Input label="Point of Contact" placeholder="Who to contact for access issues" value={infraForm.point_of_contact || ''} disabled={!canEdit} onChange={(e) => setInfraForm((f) => ({ ...f, point_of_contact: e.target.value }))} />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Credentials Verified</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700">
                  {data.credentials_verified_date ? new Date(data.credentials_verified_date).toLocaleDateString() : 'Never verified'}
                </span>
                {canEdit && (
                  <button
                    onClick={() => update({ credentials_verified_date: new Date().toISOString() })}
                    className="text-[11px] font-black text-primary-500 hover:bg-primary-50 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Mark Verified Today
                  </button>
                )}
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <Button
                onClick={handleSaveInfra}
                disabled={isPending || !infraDirty}
                className="bg-[#005CDA11] hover:bg-[#005CDA22] border-none font-black text-[11px] h-9 rounded-xl py-0 px-4 disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save Infrastructure Details'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Devops Remarks</span>
          {canEdit ? (
            <>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Notes for the devops/handoff team..."
                className="min-h-[80px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => update({ devops_remarks: remarks })}
                  disabled={isPending || remarks === (data.devops_remarks || '')}
                  className="bg-[#005CDA11] hover:bg-[#005CDA22] border-none font-black text-[11px] h-9 rounded-xl py-0 px-4 disabled:opacity-50"
                >
                  {isPending ? 'Saving…' : 'Save Remarks'}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-600 leading-relaxed">{data.devops_remarks || 'No remarks yet.'}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tracking Links</span>
            {canEdit && (
              <button
                onClick={() => setShowAddLink((s) => !s)}
                className="flex items-center gap-1.5 text-[11px] font-black text-primary-500 hover:bg-primary-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus size={13} /> Add Link
              </button>
            )}
          </div>

          {showAddLink && (
            <div className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50/60 rounded-xl">
              <Select
                options={LINK_TYPE_OPTIONS}
                value={linkForm.link_type}
                onChange={(v) => setLinkForm((f) => ({ ...f, link_type: String(v) }))}
                containerClassName="sm:w-40"
              />
              <Input
                placeholder="Label (optional)"
                value={linkForm.label}
                onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
                containerClassName="sm:w-40"
              />
              <Input
                placeholder="https://..."
                value={linkForm.url}
                onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
                containerClassName="flex-1"
              />
              <Button onClick={handleAddLink} disabled={createLink.isPending} className="bg-primary-500 text-white h-11 px-4 rounded-xl font-bold text-xs shrink-0">
                {createLink.isPending ? 'Adding…' : 'Add'}
              </Button>
            </div>
          )}

          {links.length === 0 ? (
            <span className="text-xs text-gray-400 italic">No tracking links added yet.</span>
          ) : (
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50/60 rounded-xl">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-primary-600 hover:underline truncate">
                    <ExternalLink size={13} className="shrink-0" />
                    <span className="truncate">{link.label || link.url}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase shrink-0">{LINK_TYPE_OPTIONS.find(o => o.value === link.link_type)?.label || link.link_type}</span>
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => deleteLink.mutate(link.id, { onError: (e: any) => toast.error(e?.message || 'Failed to delete link') })}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevopsAccessPanel;
