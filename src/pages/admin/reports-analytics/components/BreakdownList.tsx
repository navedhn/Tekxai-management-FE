import React from 'react';

export interface BreakdownItem {
  label: string;
  count: number;
  color: string; // solid bg class for the bar fill, e.g. 'bg-blue-500'
}

// Mirrors the horizontal-bar breakdown pattern used in AttendanceReportsTab,
// AssetAggregateBreakdown, and TicketReportsSection.
export const BreakdownList: React.FC<{ items: BreakdownItem[]; unit?: string }> = ({ items, unit }) => {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">No data for this period.</p>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-600 w-32 truncate">{item.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <span className="text-xs font-black text-gray-900 tabular-nums w-16 text-right">
            {item.count}{unit ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export default BreakdownList;
