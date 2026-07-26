import React from 'react';
import { cn } from '@/utils/cn';

const SOURCE_META: Record<string, { label: string; color: string }> = {
  role_direct: { label: 'Direct', color: 'bg-blue-50 text-blue-600' },
  role_inherited: { label: 'Inherited', color: 'bg-indigo-50 text-indigo-600' },
  override_grant: { label: 'Added', color: 'bg-green-50 text-green-600' },
  override_deny: { label: 'Removed', color: 'bg-red-50 text-red-600' },
  default_deny: { label: 'Not granted', color: 'bg-gray-50 text-gray-400' },
};

interface PermissionSummaryProps {
  total: number;
  granted: number;
  bySource?: Record<string, number>;
}

// Effective-permission preview — a quick "what does this role/user actually
// end up with" readout, breaking granted permissions down by where they
// came from (role vs inheritance vs override) rather than just a bare count.
const PermissionSummary: React.FC<PermissionSummaryProps> = ({ total, granted, bySource }) => (
  <div className="flex items-center gap-3 flex-wrap">
    <span className="text-sm font-black text-gray-900">{granted}<span className="text-gray-400 font-semibold">/{total}</span></span>
    <span className="text-xs text-gray-400">permissions granted</span>
    {bySource && (
      <div className="flex items-center gap-1.5 flex-wrap">
        {Object.entries(bySource).filter(([k, v]) => k !== 'default_deny' && v > 0).map(([source, count]) => {
          const meta = SOURCE_META[source] || { label: source, color: 'bg-gray-50 text-gray-500' };
          return (
            <span key={source} className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', meta.color)}>
              {meta.label}: {count}
            </span>
          );
        })}
      </div>
    )}
  </div>
);

export default PermissionSummary;
