import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export const PIE_COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#94A3B8'];

export interface DonutSlice {
  label: string;
  value: number;
}

// Mirrors the "Open Tickets by Category" donut on pages/admin/dashboard —
// center total overlay + side legend with matching dot colors.
export const DonutBreakdown: React.FC<{ data: DonutSlice[]; total: number; totalLabel?: string }> = ({
  data,
  total,
  totalLabel = 'Total',
}) => {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">No data for this period.</p>;
  }
  return (
    <div className="flex items-center gap-4">
      <div className="h-40 w-40 shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={45} outerRadius={70} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #F1F5F9', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xl font-black text-gray-900">{total}</p>
          <p className="text-[10px] text-gray-400 font-semibold">{totalLabel}</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {data.map((c, i) => (
          <div key={c.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="flex-1 truncate text-gray-600 font-medium">{c.label}</span>
            <span className="font-black text-gray-900 tabular-nums">{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutBreakdown;
