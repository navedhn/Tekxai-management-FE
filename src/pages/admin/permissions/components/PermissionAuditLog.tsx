import React, { useState } from 'react';
import Table, { Column } from '@/components/ui/Table';
import { usePermissionAuditLog, PermissionAuditLogEntry } from '@/services/permissionsService';
import { ROLE_LABELS } from './RoleSelector';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 20;

function GrantChange({ entry }: { entry: PermissionAuditLogEntry }) {
  const from = entry.old_granted === null ? 'none' : entry.old_granted ? 'granted' : 'denied';
  const to = entry.new_granted === null ? 'removed' : entry.new_granted ? 'granted' : 'denied';
  const color = entry.new_granted === true ? 'text-green-600' : entry.new_granted === false ? 'text-amber-600' : 'text-red-500';
  return <span className={cn('text-xs font-semibold', color)}>{from} → {to}</span>;
}

const PermissionAuditLog: React.FC = () => {
  const [page, setPage] = useState(1);
  const [targetType, setTargetType] = useState<'' | 'ROLE' | 'USER'>('');
  const { data, isLoading } = usePermissionAuditLog({ target_type: targetType || undefined, page, limit: PAGE_SIZE });

  const columns: Column<PermissionAuditLogEntry>[] = [
    { header: 'When', key: 'created_at', render: (e) => new Date(e.created_at).toLocaleString() },
    { header: 'Target', key: 'target_ref', render: (e) => (
      <span className="font-semibold">
        {e.target_type === 'ROLE' ? (ROLE_LABELS[e.target_ref]?.label || e.target_ref) : `User ${e.target_ref.slice(0, 8)}…`}
        <span className="ml-1.5 text-[10px] font-bold text-gray-400 uppercase">{e.target_type}</span>
      </span>
    ) },
    { header: 'Permission', key: 'permission', render: (e) => <code className="text-xs text-gray-500">{e.permission}</code> },
    { header: 'Change', key: 'new_granted', render: (e) => <GrantChange entry={e} /> },
    { header: 'Scope', key: 'new_scope', render: (e) => e.new_scope || '—' },
    { header: 'Reason', key: 'reason', render: (e) => e.reason || '—' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-gray-900">Permission Audit Log</h3>
        <select
          className="h-9 px-3 border border-gray-200 rounded-xl text-xs text-gray-700"
          value={targetType}
          onChange={(e) => { setTargetType(e.target.value as '' | 'ROLE' | 'USER'); setPage(1); }}
        >
          <option value="">All Changes</option>
          <option value="ROLE">Role Changes</option>
          <option value="USER">User Overrides</option>
        </select>
      </div>
      <Table
        columns={columns}
        data={data?.rows || []}
        isLoading={isLoading}
        emptyMessage="No permission changes recorded yet."
        pagination={data && data.total > 0 ? {
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(data.total / PAGE_SIZE)),
          onPageChange: setPage,
          totalEntries: data.total,
          entriesPerPage: PAGE_SIZE,
        } : undefined}
      />
    </div>
  );
};

export default PermissionAuditLog;
