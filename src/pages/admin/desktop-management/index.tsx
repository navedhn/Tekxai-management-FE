import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Rocket, RotateCcw, X, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';

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
  publisher?: { first_name: string; last_name: string };
}

interface DesktopInstallation {
  id: string;
  user_id: string;
  current_version: string | null;
  os: string | null;
  platform: string | null;
  device: string | null;
  last_seen_at: string | null;
  last_update_check_at: string | null;
  last_successful_update_at: string | null;
  force_update_requested_at: string | null;
  is_outdated: boolean;
  user: { id: string; first_name: string; last_name: string; email: string };
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';
const labelCls = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';

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
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={forceUpdate} onChange={(e) => setForceUpdate(e.target.checked)} />
            Mandatory — block app usage for everyone until they update to this version
          </label>
          <div>
            <label className={labelCls}>Release Notes (one bullet per line)</label>
            <textarea
              className={cn(inputCls, 'mt-1 h-24 py-2')}
              placeholder={'Chat improvements\nAttendance fixes\nSecurity enhancements'}
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

// ── Main page ────────────────────────────────────────────────────────────────
export default function DesktopManagementPage() {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [showPublish, setShowPublish] = useState(false);

  const { data: releases = [], isLoading: releasesLoading } = useQuery<DesktopRelease[]>({
    queryKey: ['desktop-releases'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.DESKTOP.RELEASES);
      return r?.payload?.records || [];
    },
  });
  const latest = releases[0];

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

  const forceUpdateMutation = useMutation({
    mutationFn: (userId: string) => apiRequest<any>(API_ENDPOINTS.DESKTOP.FORCE_UPDATE(userId), { method: 'POST' }),
    onSuccess: () => {
      toast.success('Force update requested — takes effect on that employee\'s next telemetry check');
      qc.invalidateQueries({ queryKey: ['desktop-installations'] });
    },
    onError: (err: any) => toast.error(err?.data?.message || err?.message || 'Failed to request force update'),
  });

  const releaseNotesLines = (latest?.release_notes || '').split('\n').map((l) => l.trim()).filter(Boolean);

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
        {releaseNotesLines.length > 0 ? (
          <ul className="space-y-1.5">
            {releaseNotesLines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-primary-600 font-bold mt-0.5">•</span>{line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">{releasesLoading ? 'Loading…' : 'No release notes yet.'}</p>
        )}
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

      {/* Release history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-black text-gray-700 mb-4">Release History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Version', 'Min. Version', 'Mandatory', 'Published', 'Published By', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {releases.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No releases published yet.</td></tr>
              ) : releases.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-semibold text-gray-900">{r.version}</td>
                  <td className="py-3 px-2 text-gray-600">{r.minimum_version}</td>
                  <td className="py-3 px-2">{r.force_update ? <span className="text-red-600 font-semibold text-xs">Mandatory</span> : <span className="text-gray-400 text-xs">Optional</span>}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs">{fmtDate(r.created_at)}</td>
                  <td className="py-3 px-2 text-gray-600 text-xs">{r.publisher ? `${r.publisher.first_name} ${r.publisher.last_name}` : '—'}</td>
                  <td className="py-3 px-2">
                    <button
                      disabled
                      title="Rollback is planned for a future release — not yet implemented"
                      className="flex items-center gap-1.5 px-3 h-7 bg-gray-100 text-gray-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                    >
                      <RotateCcw size={12} /> Rollback
                    </button>
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
    </div>
  );
}
