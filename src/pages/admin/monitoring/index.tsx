import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Monitor, Activity, Camera, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useFetchUsersQuery } from '@/services/userService';
import { useGetScreenshots, useGetProductivity, type Screenshot, type ProductivitySession } from '@/services/monitoringService';
import { StatSkeleton } from '@/components/skeletons';

const TABS = ['Productivity Overview', 'Screenshot History'];

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Productivity Overview');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: users = [] } = useFetchUsersQuery({});

  const prodParams: Record<string, string> = {};
  if (selectedUser) prodParams.user_id = selectedUser;
  if (dateFrom) prodParams.from = dateFrom;
  if (dateTo) prodParams.to = dateTo;

  const { data: productivity = [], isLoading: pLoading } = useGetProductivity(
    Object.keys(prodParams).length ? prodParams : undefined
  );

  const ssParams: Record<string, string> = {};
  if (selectedUser) ssParams.user_id = selectedUser;
  if (dateFrom) ssParams.from = dateFrom;
  if (dateTo) ssParams.to = dateTo;

  const { data: ssData, isLoading: ssLoading } = useGetScreenshots(
    Object.keys(ssParams).length ? ssParams : undefined
  );
  const screenshots: Screenshot[] = (ssData as any)?.records || [];

  const userOptions = [
    { value: '', label: 'All Employees' },
    ...(users as any[]).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
  ];

  const prodCols: Column<any>[] = [
    {
      header: 'Employee',
      key: 'user_id',
      render: (r) => (
        <span className="font-black text-gray-900">
          {r.user ? `${r.user.first_name} ${r.user.last_name}` : r.user_id.slice(0, 8)}
        </span>
      ),
    },
    {
      header: 'Date',
      key: 'date',
      render: (r) => new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    },
    {
      header: 'Active Time',
      key: 'active_seconds',
      render: (r) => <span className="font-bold text-green-600">{fmtDuration(r.active_seconds)}</span>,
    },
    {
      header: 'Idle Time',
      key: 'idle_seconds',
      render: (r) => <span className="font-bold text-gray-400">{fmtDuration(r.idle_seconds)}</span>,
    },
    {
      header: 'Mouse Events',
      key: 'mouse_events',
      render: (r) => <span className="font-medium">{r.mouse_events.toLocaleString()}</span>,
    },
    {
      header: 'KB Events',
      key: 'keyboard_events',
      render: (r) => <span className="font-medium">{r.keyboard_events.toLocaleString()}</span>,
    },
    {
      header: 'Score',
      key: 'productivity_score',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', r.productivity_score >= 70 ? 'bg-green-500' : r.productivity_score >= 40 ? 'bg-yellow-500' : 'bg-red-500')}
              style={{ width: `${r.productivity_score}%` }}
            />
          </div>
          <span className="font-black text-sm">{Math.round(r.productivity_score)}%</span>
        </div>
      ),
    },
  ];

  const ssCols: Column<Screenshot>[] = [
    {
      header: 'Employee',
      key: 'user_id',
      render: (r) => (
        <span className="font-black text-gray-900">
          {r.user ? `${r.user.first_name} ${r.user.last_name}` : r.user_id.slice(0, 8)}
        </span>
      ),
    },
    {
      header: 'Captured At',
      key: 'captured_at',
      render: (r) =>
        new Date(r.captured_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
    },
    { header: 'Monitor', key: 'monitor_index', render: (r) => `Monitor ${r.monitor_index + 1}` },
    {
      header: 'Preview',
      key: 'file_url',
      render: (r) =>
        r.file_url ? (
          <a href={r.file_url} target="_blank" rel="noopener noreferrer" title="Click to open full screenshot">
            <img
              src={r.file_url}
              alt="Screenshot"
              className="h-12 w-20 object-cover rounded-lg border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </a>
        ) : (
          <span className="text-xs text-gray-400 font-medium font-mono">{r.file_key.split('/').pop()}</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Employee Monitoring</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Track productivity sessions and screenshot history from the desktop agent.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-52">
          <Select
            options={userOptions}
            value={selectedUser}
            onChange={(v) => setSelectedUser(v as string)}
            className="h-10 !rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">FROM</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-100 outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">TO</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-100 outline-none" />
        </div>
      </div>

      <Tabs options={TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'Productivity Overview' && (
        <Card className="border-none shadow-sm">
          <Table
            columns={prodCols}
            data={productivity as any[]}
            isLoading={pLoading}
            emptyMessage="No productivity data. Desktop agent must be running."
          />
        </Card>
      )}

      {activeTab === 'Screenshot History' && (
        <Card className="border-none shadow-sm">
          <p className="text-sm font-medium text-gray-400 mb-4">
            Total screenshots: <strong className="text-gray-700">{(ssData as any)?.total || 0}</strong>
            <span className="ml-2 text-xs">(Screenshots captured by desktop agent)</span>
          </p>
          <Table
            columns={ssCols}
            data={screenshots}
            isLoading={ssLoading}
            emptyMessage="No screenshots yet. Desktop agent must be running to capture screenshots."
          />
        </Card>
      )}
    </div>
  );
};

export default MonitoringPage;
