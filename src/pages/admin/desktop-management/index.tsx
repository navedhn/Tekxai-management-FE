import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Rocket, RotateCcw, X, Clock, AlertTriangle, CheckCircle2, Ban, TrendingUp, XCircle, Target, Trash2, Bug } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';

type ReleaseChannel = 'stable' | 'beta' | 'internal' | 'development';
type ReleaseStatus = 'ACTIVE' | 'ROLLED_BACK' | 'DISABLED';
type RolloutPercentage = 10 | 25 | 50 | 100;
type TargetType = 'business_unit' | 'department' | 'team' | 'user';
type CrashStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';

// Enterprise Deployment Rings — a "Pilot Group"/"IT Team"/"Management"/
// "Developers" ring is just a target row against one of these four
// underlying org-structure fields, not a separate concept — see be-work's
// desktop.controller.js release_matches_targets.
interface DesktopReleaseTarget {
  id: string;
  target_type: TargetType;
  target_value: string;
}

interface DesktopRelease {
  id: string;
  version: string;
  minimum_version: string;
  force_update: boolean;
  release_notes: string | null;
  windows_url: string | null;
  mac_url: string | null;
  linux_url: string | null;
  created_at: string;
  channel: ReleaseChannel;
  rollout_percentage: RolloutPercentage;
  status: ReleaseStatus;
  disabled_reason: string | null;
  disabled_at: string | null;
  rolled_back_at: string | null;
  publisher?: { first_name: string; last_name: string };
  disabler?: { first_name: string; last_name: string } | null;
  rollback_actor?: { first_name: string; last_name: string } | null;
  targets: DesktopReleaseTarget[];
}

interface DesktopInstallation {
  id: string;
  user_id: string;
  current_version: string | null;
  os: string | null;
  platform: string | null;
  device: string | null;
  channel: ReleaseChannel;
  last_seen_at: string | null;
  last_update_check_at: string | null;
  last_successful_update_at: string | null;
  force_update_requested_at: string | null;
  is_outdated: boolean;
  // Desktop Diagnostics — reported alongside telemetry, see be-work's
  // prisma schema desktop_installations comment for why GB floats.
  arch: string | null;
  disk_free_gb: number | null;
  disk_total_gb: number | null;
  memory_total_gb: number | null;
  memory_free_gb: number | null;
  user: { id: string; first_name: string; last_name: string; email: string };
}

interface DesktopAnalytics {
  since_days: number;
  total_installations: number;
  version_distribution: Record<string, number>;
  pending_updates: number;
  successful_updates: number;
  failed_updates: number;
  failed_by_version: { version: string; count: number }[];
}

interface DesktopCrashReport {
  id: string;
  version: string;
  os: string | null;
  application: string;
  stack_trace: string;
  last_action: string | null;
  status: CrashStatus;
  resolution: string | null;
  created_at: string;
  user: { id: string; first_name: string; last_name: string; email: string } | null;
  resolver?: { first_name: string; last_name: string } | null;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';
const labelCls = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';
const CHANNELS: ReleaseChannel[] = ['stable', 'beta', 'internal', 'development'];
const ROLLOUT_STEPS: RolloutPercentage[] = [10, 25, 50, 100];

const CHANNEL_BADGE: Record<ReleaseChannel, string> = {
  stable: 'bg-emerald-50 text-emerald-700',
  beta: 'bg-blue-50 text-blue-700',
  internal: 'bg-purple-50 text-purple-700',
  development: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ status }: { status: ReleaseStatus }) {
  if (status === 'ACTIVE') return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">Active</span>;
  if (status === 'DISABLED') return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700">Disabled</span>;
  return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-500">Rolled Back</span>;
}

const TARGET_TYPES: TargetType[] = ['business_unit', 'department', 'team', 'user'];
const TARGET_TYPE_LABEL: Record<TargetType, string> = {
  business_unit: 'Business Unit',
  department: 'Department',
  team: 'Team',
  user: 'User',
};
function fmtGb(n: number | null | undefined) {
  return typeof n === 'number' ? `${n.toFixed(1)} GB` : '—';
}

function CrashStatusBadge({ status }: { status: CrashStatus }) {
  const map: Record<CrashStatus, string> = {
    OPEN: 'bg-red-50 text-red-700',
    ACKNOWLEDGED: 'bg-amber-50 text-amber-700',
    RESOLVED: 'bg-emerald-50 text-emerald-700',
    IGNORED: 'bg-gray-100 text-gray-500',
  };
  return <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', map[status])}>{status[0] + status.slice(1).toLowerCase()}</span>;
}

// ── Manage deployment-ring targets modal ────────────────────────────────────
// No targets = release reaches everyone in its channel, exactly as before
// Enterprise Deployment Rings existed — this modal is purely additive.
function ManageTargetsModal({ release, onClose }: { release: DesktopRelease; onClose: () => void }) {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [targetType, setTargetType] = useState<TargetType>('business_unit');
  const [targetValue, setTargetValue] = useState('');

  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.DESKTOP.RELEASE_TARGETS(release.id), {
        method: 'POST',
        body: JSON.stringify({ target_type: targetType, target_value: targetValue.trim() }),
      }),
    onSuccess: () => {
      toast.success('Target added');
      setTargetValue('');
      qc.invalidateQueries({ queryKey: ['desktop-releases'] });
    },
    onError: (err: any) => toast.error(err?.data?.message || err?.message || 'Failed to add target'),
  });

  const removeMutation = useMutation({
    mutationFn: (targetId: string) => apiRequest<any>(API_ENDPOINTS.DESKTOP.RELEASE_TARGET_DELETE(release.id, targetId), { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Target removed');
      qc.invalidateQueries({ queryKey: ['desktop-releases'] });
    },
    onError: (err: any) => toast.error(err?.data?.message || err?.message || 'Failed to remove target'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-primary-600"><Target size={18} /><h2 className="text-lg font-black text-gray-900">Deployment Targets — {release.version}</h2></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          No targets — reaches everyone in the {release.channel} channel. Add one or more targets to restrict this
          release to a specific business unit, department, team, or individual employee (e.g. a Pilot Group or IT Team).
        </p>
        <div className="space-y-2 mb-4">
          {release.targets.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No targets — reaches everyone.</p>
          ) : release.targets.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-gray-700">{TARGET_TYPE_LABEL[t.target_type]}: <span className="font-mono text-gray-600">{t.target_value}</span></span>
              <button
                onClick={() => removeMutation.mutate(t.id)}
                disabled={removeMutation.isPending}
                className="text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <select className={cn(inputCls, 'w-36')} value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)}>
            {TARGET_TYPES.map((t) => <option key={t} value={t}>{TARGET_TYPE_LABEL[t]}</option>)}
          </select>
          <input
            className={cn(inputCls, 'flex-1')}
            placeholder={targetType === 'business_unit' ? 'e.g. ERP, CRM, HR' : targetType === 'user' ? 'User ID' : `${TARGET_TYPE_LABEL[targetType]} ID`}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
          <button
            onClick={() => addMutation.mutate()}
            disabled={!targetValue.trim() || addMutation.isPending}
            className="h-10 px-4 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50 shrink-0"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// Rich release notes — the same hand-rolled markdown-lite subset (headers,
// bullets, **bold**) desktop-app's renderer.js implements, so the admin
// preview and what employees actually see never drift into two different
// interpretations of the same text.
function ReleaseNotesInline({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}
function ReleaseNotes({ raw }: { raw: string | null | undefined }) {
  const lines = (raw || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;
  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={key++} className="space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-primary-600 font-bold mt-0.5">•</span><ReleaseNotesInline text={b} />
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };
  for (const line of lines) {
    const header = /^#{1,3}\s*(.+)$/.exec(line);
    if (header) {
      flush();
      blocks.push(<h3 key={key++} className="text-xs font-black text-gray-500 uppercase tracking-wide mt-2 first:mt-0"><ReleaseNotesInline text={header[1]} /></h3>);
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    bullets.push(bullet ? bullet[1] : line);
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

// ── Publish Release form modal ──────────────────────────────────────────────
function PublishReleaseModal({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const toast = useToastContext();
  const [version, setVersion] = useState('');
  const [minimumVersion, setMinimumVersion] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [windowsUrl, setWindowsUrl] = useState('');
  const [macUrl, setMacUrl] = useState('');
  const [linuxUrl, setLinuxUrl] = useState('');
  const [channel, setChannel] = useState<ReleaseChannel>('stable');
  const [rolloutPercentage, setRolloutPercentage] = useState<RolloutPercentage>(100);

  const publishMutation = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.DESKTOP.RELEASES, {
        method: 'POST',
        body: JSON.stringify({
          version: version.trim(),
          minimum_version: minimumVersion.trim(),
          force_update: forceUpdate,
          release_notes: releaseNotes.trim() || null,
          windows_url: windowsUrl.trim() || null,
          mac_url: macUrl.trim() || null,
          linux_url: linuxUrl.trim() || null,
          channel,
          rollout_percentage: rolloutPercentage,
        }),
      }),
    onSuccess: () => {
      toast.success(`Version ${version} published`);
      onPublished();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.data?.message || err?.message || 'Failed to publish release');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">Publish Desktop Release</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Registers a release that's already been built and uploaded (electron-builder's
          publish step). This doesn't build or upload anything — it approves an existing
          artifact for rollout to every desktop app.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Version *</label>
              <input className={cn(inputCls, 'mt-1')} placeholder="1.2.0" value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Minimum Supported Version *</label>
              <input className={cn(inputCls, 'mt-1')} placeholder="1.0.0" value={minimumVersion} onChange={(e) => setMinimumVersion(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Release Channel</label>
              <select className={cn(inputCls, 'mt-1')} value={channel} onChange={(e) => setChannel(e.target.value as ReleaseChannel)}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Staged Rollout</label>
              <select className={cn(inputCls, 'mt-1')} value={rolloutPercentage} onChange={(e) => setRolloutPercentage(Number(e.target.value) as RolloutPercentage)}>
                {ROLLOUT_STEPS.map((p) => <option key={p} value={p}>{p}%{p === 100 ? ' (everyone)' : ''}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={forceUpdate} onChange={(e) => setForceUpdate(e.target.checked)} />
            Mandatory — block app usage for everyone until they update to this version (bypasses staged rollout)
          </label>
          <div>
            <label className={labelCls}>Release Notes — supports ## headers, - bullets, **bold**</label>
            <textarea
              className={cn(inputCls, 'mt-1 h-28 py-2 font-mono text-xs')}
              placeholder={'## New Features\n- Added **dark mode**\n## Bug Fixes\n- Fixed crash on startup'}
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Windows Installer URL</label>
            <input className={cn(inputCls, 'mt-1')} placeholder="https://releases.tekxai.services/desktop-app/TEKxAI-Agent-Setup-1.2.0.exe" value={windowsUrl} onChange={(e) => setWindowsUrl(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>macOS Installer URL</label>
            <input className={cn(inputCls, 'mt-1')} placeholder="https://releases.tekxai.services/desktop-app/TEKxAI-Agent-1.2.0.dmg" value={macUrl} onChange={(e) => setMacUrl(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Linux Installer URL</label>
            <input className={cn(inputCls, 'mt-1')} placeholder="https://releases.tekxai.services/desktop-app/TEKxAI-Agent-1.2.0.AppImage" value={linuxUrl} onChange={(e) => setLinuxUrl(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => publishMutation.mutate()}
            disabled={!version.trim() || !minimumVersion.trim() || publishMutation.isPending}
            className="flex-1 h-11 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50"
          >
            {publishMutation.isPending ? 'Publishing…' : 'Publish Release'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Disable Release modal (requires a reason) ───────────────────────────────
function DisableReleaseModal({ release, onClose, onDone }: { release: DesktopRelease; onClose: () => void; onDone: () => void }) {
  const toast = useToastContext();
  const [reason, setReason] = useState('');
  const disableMutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.DESKTOP.RELEASE_DISABLE(release.id), { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }),
    onSuccess: () => { toast.success(`Version ${release.version} disabled`); onDone(); onClose(); },
    onError: (err: any) => toast.error(err?.data?.message || err?.message || 'Failed to disable release'),
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-2 text-red-600"><Ban size={18} /><h2 className="text-lg font-black">Emergency Disable</h2></div>
        <p className="text-sm text-gray-600 mb-4">
          Pulls version <span className="font-bold">{release.version}</span> from rollout and force-updates
          anyone already running it away from it. This is for an actively unsafe release — not routine.
        </p>
        <label className={labelCls}>Reason *</label>
        <textarea autoFocus className={cn(inputCls, 'mt-1 h-20 py-2')} placeholder="e.g. Critical crash on startup for some users" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => disableMutation.mutate()}
            disabled={!reason.trim() || disableMutation.isPending}
            className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {disableMutation.isPending ? 'Disabling…' : 'Disable Release'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DesktopManagementPage() {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [showPublish, setShowPublish] = useState(false);
  const [disableTarget, setDisableTarget] = useState<DesktopRelease | null>(null);
  // Id only, not the release object itself — the modal adds/removes targets
  // one at a time and needs to reflect each change live as ['desktop-releases']
  // refetches, not a stale snapshot taken at the moment it was opened.
  const [manageTargetsForId, setManageTargetsForId] = useState<string | null>(null);

  const { data: releases = [], isLoading: releasesLoading } = useQuery<DesktopRelease[]>({
    queryKey: ['desktop-releases'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.DESKTOP.RELEASES);
      return r?.payload?.records || [];
    },
  });
  // "Latest" for the summary cards means the stable channel's current
  // active release specifically — releases[0] alone isn't reliable once
  // other channels/rolled-back/disabled rows exist in the same list.
  const latest = releases.find((r) => r.channel === 'stable' && r.status === 'ACTIVE');

  const { data: installData, isLoading: installLoading } = useQuery<{ records: DesktopInstallation[]; latest_version: string | null }>({
    queryKey: ['desktop-installations'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.DESKTOP.INSTALLATIONS);
      return r?.payload || { records: [], latest_version: null };
    },
    // Employees' desktop apps only ping telemetry every 30 minutes — no
    // point polling this faster than that.
    refetchInterval: 5 * 60 * 1000,
  });
  const installations = installData?.records || [];
  const outdated = installations.filter((i) => i.is_outdated);

  const { data: analytics } = useQuery<DesktopAnalytics>({
    queryKey: ['desktop-analytics'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.DESKTOP.ANALYTICS);
      return r?.payload;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: crashData, isLoading: crashLoading } = useQuery<{ records: DesktopCrashReport[] }>({
    queryKey: ['desktop-crash-reports'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.DESKTOP.CRASH_REPORTS);
      return r?.payload || { records: [] };
    },
    refetchInterval: 5 * 60 * 1000,
  });
  const crashReports = crashData?.records || [];

  const manageTargetsRelease = releases.find((r) => r.id === manageTargetsForId) || null;

  const forceUpdateMutation = useMutation({
    mutationFn: (userId: string) => apiRequest<any>(API_ENDPOINTS.DESKTOP.FORCE_UPDATE(userId), { method: 'POST' }),
    onSuccess: () => {
      toast.success('Force update requested — takes effect on that employee\'s next telemetry check');
      qc.invalidateQueries({ queryKey: ['desktop-installations'] });
    },
    onError: (err: any) => toast.error(err?.data?.message || err?.message || 'Failed to request force update'),
  });

  const rolloutMutation = useMutation({
    mutationFn: ({ id, percentage }: { id: string; percentage: RolloutPercentage }) =>
      apiRequest<any>(API_ENDPOINTS.DESKTOP.RELEASE_ROLLOUT(id), { method: 'PATCH', body: JSON.stringify({ rollout_percentage: percentage }) }),
    onSuccess: () => {
      toast.success('Rollout percentage updated');
      qc.invalidateQueries({ queryKey: ['desktop-releases'] });
    },
    onError: (err: any) => toast.error(err?.data?.message || err?.message || 'Failed to update rollout'),
  });

  const rollbackMutation = useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.DESKTOP.RELEASE_ROLLBACK(id), { method: 'POST' }),
    onSuccess: (res: any) => {
      toast.success(`Rolled back — ${res?.payload?.new_latest_version || 'the previous release'} is latest again`);
      qc.invalidateQueries({ queryKey: ['desktop-releases'] });
    },
    onError: (err: any) => toast.error(err?.data?.message || err?.message || 'Failed to roll back'),
  });

  const crashStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CrashStatus }) =>
      apiRequest<any>(API_ENDPOINTS.DESKTOP.CRASH_REPORT_STATUS(id), { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success('Crash report updated');
      qc.invalidateQueries({ queryKey: ['desktop-crash-reports'] });
    },
    onError: (err: any) => toast.error(err?.data?.message || err?.message || 'Failed to update crash report'),
  });

  const totalDist = analytics ? Object.values(analytics.version_distribution).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Monitor size={24} className="text-primary-600" /> Desktop Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage TekXAI Desktop Agent releases and monitor employee update status</p>
        </div>
        <button
          onClick={() => setShowPublish(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700"
        >
          <Rocket size={16} /> Publish Release
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Latest Version</p>
          <p className="text-xl font-black text-gray-900 mt-1">{latest?.version || '—'}</p>
          {latest && latest.rollout_percentage < 100 && (
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{latest.rollout_percentage}% rollout</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Release Date</p>
          <p className="text-sm font-bold text-gray-900 mt-1">{latest ? fmtDate(latest.created_at) : '—'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Minimum Supported Version</p>
          <p className="text-xl font-black text-gray-900 mt-1">{latest?.minimum_version || '—'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Outdated Employees</p>
          <p className={cn('text-xl font-black mt-1', outdated.length > 0 ? 'text-orange-600' : 'text-gray-900')}>{outdated.length}</p>
        </div>
      </div>

      {latest?.force_update && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3">
          <AlertTriangle size={16} /> Version {latest.version} is marked mandatory — every desktop app below it is currently blocked until updated.
        </div>
      )}

      {/* Release notes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-black text-gray-700 mb-3">What's New — {latest?.version || 'No release published yet'}</h2>
        {latest?.release_notes ? (
          <ReleaseNotes raw={latest.release_notes} />
        ) : (
          <p className="text-sm text-gray-400">{releasesLoading ? 'Loading…' : 'No release notes yet.'}</p>
        )}
      </div>

      {/* Update Analytics */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary-600" /> Update Analytics <span className="text-gray-400 font-normal text-xs">(last {analytics?.since_days ?? 30} days)</span></h2>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400 font-semibold uppercase">Pending</p>
            <p className="text-lg font-black text-orange-600">{analytics?.pending_updates ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400 font-semibold uppercase">Successful</p>
            <p className="text-lg font-black text-emerald-600">{analytics?.successful_updates ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-1"><XCircle size={11} /> Failed</p>
            <p className="text-lg font-black text-red-600">{analytics?.failed_updates ?? '—'}</p>
          </div>
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Version Distribution</p>
        <div className="space-y-1.5">
          {analytics && Object.keys(analytics.version_distribution).length > 0 ? (
            Object.entries(analytics.version_distribution)
              .sort((a, b) => b[1] - a[1])
              .map(([v, count]) => (
                <div key={v} className="flex items-center gap-2 text-xs">
                  <span className="w-20 font-mono text-gray-700 shrink-0">{v}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${totalDist ? (count / totalDist) * 100 : 0}%` }} />
                  </div>
                  <span className="w-8 text-right text-gray-500 shrink-0">{count}</span>
                </div>
              ))
          ) : (
            <p className="text-xs text-gray-400">No installations reporting yet.</p>
          )}
        </div>
      </div>

      {/* Outdated Employees */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-black text-gray-700 mb-4">Outdated Employees</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee Name', 'Current Desktop Version', 'Last Seen', 'Operating System', 'Device', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {installLoading ? (
                <tr><td colSpan={6} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              ) : outdated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                    <p className="text-gray-400 text-sm">Every reporting employee is on the latest version.</p>
                  </td>
                </tr>
              ) : outdated.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-semibold text-gray-900">{i.user.first_name} {i.user.last_name}</td>
                  <td className="py-3 px-2 text-orange-600 font-semibold">{i.current_version || '—'}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs flex items-center gap-1"><Clock size={12} />{fmtDate(i.last_seen_at)}</td>
                  <td className="py-3 px-2 text-gray-600">{i.os || '—'}</td>
                  <td className="py-3 px-2 text-gray-600">{i.device || '—'}</td>
                  <td className="py-3 px-2">
                    {i.force_update_requested_at ? (
                      <span className="text-xs font-semibold text-amber-600">Force update requested</span>
                    ) : (
                      <button
                        onClick={() => forceUpdateMutation.mutate(i.user_id)}
                        disabled={forceUpdateMutation.isPending}
                        className="px-3 h-7 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 disabled:opacity-50"
                      >
                        Force Update
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop Diagnostics — every reporting install, not just outdated ones */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-black text-gray-700 mb-4">Desktop Diagnostics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee', 'Version', 'OS / Arch', 'Update Status', 'Last Sync', 'Disk Free', 'Memory Free'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {installLoading ? (
                <tr><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              ) : installations.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No desktop installs have reported in yet.</td></tr>
              ) : installations.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-semibold text-gray-900">{i.user.first_name} {i.user.last_name}</td>
                  <td className="py-3 px-2 font-mono text-xs text-gray-700">{i.current_version || '—'}</td>
                  <td className="py-3 px-2 text-gray-600">{i.os || '—'}{i.arch ? ` / ${i.arch}` : ''}</td>
                  <td className="py-3 px-2">
                    {i.is_outdated ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700">Outdated</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Up to date</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs flex items-center gap-1"><Clock size={12} />{fmtDate(i.last_seen_at)}</td>
                  <td className="py-3 px-2 text-gray-600 text-xs">{fmtGb(i.disk_free_gb)}{i.disk_total_gb ? ` / ${fmtGb(i.disk_total_gb)}` : ''}</td>
                  <td className="py-3 px-2 text-gray-600 text-xs">{fmtGb(i.memory_free_gb)}{i.memory_total_gb ? ` / ${fmtGb(i.memory_total_gb)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Crash Reports — self-hosted scaffold, see docs/CRASH_REPORTING.md */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><Bug size={16} className="text-red-600" /> Crash Reports</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee', 'Version', 'OS', 'Last Action', 'Reported', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {crashLoading ? (
                <tr><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              ) : crashReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                    <p className="text-gray-400 text-sm">No crashes reported.</p>
                  </td>
                </tr>
              ) : crashReports.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="py-3 px-2 font-semibold text-gray-900">{c.user ? `${c.user.first_name} ${c.user.last_name}` : '—'}</td>
                  <td className="py-3 px-2 font-mono text-xs text-gray-700">{c.version}</td>
                  <td className="py-3 px-2 text-gray-600">{c.os || '—'}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs max-w-[160px] truncate" title={c.stack_trace}>{c.last_action || '—'}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs">{fmtDate(c.created_at)}</td>
                  <td className="py-3 px-2"><CrashStatusBadge status={c.status} /></td>
                  <td className="py-3 px-2">
                    <select
                      value={c.status}
                      onChange={(e) => crashStatusMutation.mutate({ id: c.id, status: e.target.value as CrashStatus })}
                      disabled={crashStatusMutation.isPending}
                      className="text-xs border border-gray-200 rounded-lg px-1.5 h-7 bg-white"
                    >
                      {(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'] as CrashStatus[]).map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-black text-gray-700 mb-4">Release History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Version', 'Channel', 'Rollout', 'Targets', 'Status', 'Mandatory', 'Published', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {releases.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400 text-sm">No releases published yet.</td></tr>
              ) : releases.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-semibold text-gray-900">
                    {r.version}
                    {r.status === 'DISABLED' && r.disabled_reason && (
                      <div className="text-[10px] text-red-500 font-normal mt-0.5 max-w-[160px]" title={r.disabled_reason}>{r.disabled_reason}</div>
                    )}
                  </td>
                  <td className="py-3 px-2"><span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', CHANNEL_BADGE[r.channel])}>{r.channel}</span></td>
                  <td className="py-3 px-2">
                    {r.status === 'ACTIVE' ? (
                      <select
                        value={r.rollout_percentage}
                        onChange={(e) => rolloutMutation.mutate({ id: r.id, percentage: Number(e.target.value) as RolloutPercentage })}
                        disabled={rolloutMutation.isPending}
                        className="text-xs border border-gray-200 rounded-lg px-1.5 h-6 bg-white"
                      >
                        {ROLLOUT_STEPS.map((p) => <option key={p} value={p}>{p}%</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400">{r.rollout_percentage}%</span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <button
                      onClick={() => setManageTargetsForId(r.id)}
                      className={cn(
                        'flex items-center gap-1 px-2 h-6 rounded-lg text-[10px] font-bold',
                        r.targets.length > 0 ? 'bg-primary-50 text-primary-700 hover:bg-primary-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                      title="Manage deployment-ring targets"
                    >
                      <Target size={11} /> {r.targets.length > 0 ? `${r.targets.length} target${r.targets.length > 1 ? 's' : ''}` : 'Everyone'}
                    </button>
                  </td>
                  <td className="py-3 px-2"><StatusBadge status={r.status} /></td>
                  <td className="py-3 px-2">{r.force_update ? <span className="text-red-600 font-semibold text-xs">Mandatory</span> : <span className="text-gray-400 text-xs">Optional</span>}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs">{fmtDate(r.created_at)}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => rollbackMutation.mutate(r.id)}
                        disabled={r.status !== 'ACTIVE' || rollbackMutation.isPending}
                        title={r.status === 'ACTIVE' ? 'Roll back — the previous active release becomes latest again' : 'Only an Active release can be rolled back'}
                        className={cn(
                          'flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-semibold',
                          r.status === 'ACTIVE' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        )}
                      >
                        <RotateCcw size={12} /> Rollback
                      </button>
                      <button
                        onClick={() => setDisableTarget(r)}
                        disabled={r.status !== 'ACTIVE'}
                        title={r.status === 'ACTIVE' ? 'Emergency disable' : 'Already inactive'}
                        className={cn(
                          'flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-semibold',
                          r.status === 'ACTIVE' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        )}
                      >
                        <Ban size={12} /> Disable
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPublish && (
        <PublishReleaseModal
          onClose={() => setShowPublish(false)}
          onPublished={() => qc.invalidateQueries({ queryKey: ['desktop-releases'] })}
        />
      )}
      {disableTarget && (
        <DisableReleaseModal
          release={disableTarget}
          onClose={() => setDisableTarget(null)}
          onDone={() => qc.invalidateQueries({ queryKey: ['desktop-releases'] })}
        />
      )}
      {manageTargetsRelease && (
        <ManageTargetsModal release={manageTargetsRelease} onClose={() => setManageTargetsForId(null)} />
      )}
    </div>
  );
}
