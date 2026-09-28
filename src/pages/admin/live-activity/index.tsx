import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { PageSkeleton } from '@/components/skeletons';

type LivePerson = {
  entry_id: string;
  live_status: 'CLOCKED_IN' | 'ON_BREAK' | 'IDLE';
  duration_sec: number;
  check_in: string;
  user: { id: string; first_name: string; last_name: string; avatar?: string | null };
  project: { id: string; title: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  CLOCKED_IN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ON_BREAK: 'bg-amber-50 text-amber-700 border-amber-200',
  IDLE: 'bg-orange-50 text-orange-700 border-orange-200',
};

function formatDur(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

const LiveActivityPage: React.FC = () => {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['live-activity'],
    queryFn: () => apiRequest<any>('/api/v1/live-activity'),
    refetchInterval: 15_000,
  });

  const payload = data?.payload;
  const records: LivePerson[] = payload?.records || [];
  const summary = payload?.summary || { clocked_in: 0, on_break: 0, idle: 0, total: 0 };

  if (isLoading && !payload) return <PageSkeleton />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Live team activity</h1>
          <p className="text-sm text-gray-500 mt-1">Who is clocked in, on break, or idle right now. Auto-refreshes every 15s.</p>
        </div>
        <div className="text-xs text-gray-400">Updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ['Total active', summary.total],
          ['Clocked in', summary.clocked_in],
          ['On break', summary.on_break],
          ['Idle', summary.idle],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-2xl font-semibold mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {records.map((r) => (
          <div key={r.entry_id} className={`rounded-xl border p-4 ${STATUS_STYLE[r.live_status] || 'bg-white'}`}>
            <div className="font-medium">{r.user.first_name} {r.user.last_name}</div>
            <div className="text-xs mt-1 opacity-80">{r.live_status.replace('_', ' ')} · {formatDur(r.duration_sec)}</div>
            <div className="text-xs mt-2 opacity-70">{r.project?.title || 'No project attributed'}</div>
            <div className="text-[11px] mt-1 opacity-60">Since {new Date(r.check_in).toLocaleTimeString()}</div>
          </div>
        ))}
        {!records.length && (
          <div className="col-span-full text-center text-sm text-gray-500 py-16">Nobody is clocked in right now.</div>
        )}
      </div>
    </div>
  );
};

export default LiveActivityPage;
