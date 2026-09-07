import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface KpiCardDef {
  icon: LucideIcon;
  color: string;
  label: string;
  value: React.ReactNode;
  subtext?: string;
}

const LG_COLS: Record<number, string> = {
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

export const KpiRow: React.FC<{ cards: KpiCardDef[]; columns?: 4 | 5 | 6 }> = ({ cards, columns = 5 }) => (
  <div className={cn('grid grid-cols-2 gap-4', LG_COLS[columns])}>
    {cards.map((c) => (
      <div key={c.label} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm min-w-0">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', c.color)}>
          <c.icon size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide truncate">{c.label}</p>
          <p className="text-xl font-black text-gray-900 leading-tight tabular-nums">{c.value}</p>
          {c.subtext && <p className="text-[11px] text-gray-400 font-medium truncate">{c.subtext}</p>}
        </div>
      </div>
    ))}
  </div>
);

export default KpiRow;
