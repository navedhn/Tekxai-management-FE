import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Camera, Clock, Save, HardDrive, Timer } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useToastContext } from '@/components/toast/ToastProvider';

const INTERVAL_OPTIONS = [
  { value: '1',  label: 'Every 1 minute' },
  { value: '2',  label: 'Every 2 minutes' },
  { value: '5',  label: 'Every 5 minutes' },
  { value: '10', label: 'Every 10 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '20', label: 'Every 20 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];

const IDLE_TIMEOUT_OPTIONS = [
  { value: '5',  label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes (default)' },
  { value: '20', label: '20 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
];

export default function SystemSettings() {
  const qc = useQueryClient();
  const toast = useToastContext();
  const [form, setForm] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.SETTINGS.SYSTEM).then((r: any) => r?.payload || {}),
    retry: 1,
    staleTime: 30000,
  });

  React.useEffect(() => {
    if (data && Object.keys(data).length > 0) setForm(data as any);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: any) => apiRequest<any>(API_ENDPOINTS.SETTINGS.SYSTEM, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    onSuccess: () => {
      toast.success('Settings saved');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (e: any) => toast.error(e?.message || e?.response?.data?.message || 'Failed to save settings'),
  });

  const set = (key: string, val: string) => {
    setForm(p => ({ ...p, [key]: val }));
    setDirty(true);
  };

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Settings size={22} /> System Settings
        </h1>
        <p className="text-sm text-gray-400 mt-1">Global configuration for all users and agents.</p>
      </div>

      {/* Screenshot Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Camera size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Screenshot Monitoring</h2>
            <p className="text-xs text-gray-400">Controls how often the desktop agent captures screenshots after check-in</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block flex items-center gap-1.5">
              <Clock size={12} /> Screenshot Interval
            </label>
            <select
              value={form.screenshot_interval_minutes || '10'}
              onChange={e => set('screenshot_interval_minutes', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            >
              {INTERVAL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Desktop agent will capture a screenshot at this interval while the employee is checked in.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block flex items-center gap-1.5">
              <HardDrive size={12} /> Storage Backend
            </label>
            <select
              value={form.storage_backend || 's3'}
              onChange={e => set('storage_backend', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            >
              <option value="s3">Amazon S3 / Cloudflare R2</option>
              <option value="local">Local Server Disk</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Where uploaded files and screenshots are stored. S3 requires AWS credentials in .env.</p>
          </div>
        </div>
      </div>

      {/* Idle Auto-Checkout Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Timer size={18} className="text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Idle Auto-Checkout</h2>
            <p className="text-xs text-gray-400">Automatically check out employees after a period of inactivity in the browser</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block flex items-center gap-1.5">
              <Clock size={12} /> Idle Timeout Duration
            </label>
            <select
              value={form.idle_timeout_minutes || '15'}
              onChange={e => set('idle_timeout_minutes', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            >
              {IDLE_TIMEOUT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              If an employee has no mouse, keyboard, or scroll activity in the app for this duration, they will be automatically checked out.
            </p>
          </div>
          <div className="flex items-start pt-6">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
              <strong>Browser-only detection.</strong> This tracks inactivity within the Tekxai web app tab. For device-wide idle detection (e.g. user switches to another app), the desktop agent is required.
            </div>
          </div>
        </div>
      </div>

      {/* S3 credentials notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>S3 Configuration</strong> — AWS credentials and bucket name are set via server environment variables
        (<code className="font-mono text-xs bg-amber-100 px-1 rounded">AWS_ACCESS_KEY_ID</code>,&nbsp;
        <code className="font-mono text-xs bg-amber-100 px-1 rounded">AWS_SECRET_ACCESS_KEY</code>,&nbsp;
        <code className="font-mono text-xs bg-amber-100 px-1 rounded">S3_BUCKET</code>,&nbsp;
        <code className="font-mono text-xs bg-amber-100 px-1 rounded">S3_REGION</code>).
        Contact your server administrator to update these.
      </div>

      <div className="flex justify-end">
        <button
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Save size={15} />
          {save.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
