import React from 'react';
import { cn } from '@/utils/cn';

type Accent = 'blue' | 'green' | 'orange';

const accentStyles: Record<Accent, { border: string; value: string }> = {
  blue: { border: 'border-l-[#005CDA]', value: 'text-[#005CDA]' },
  green: { border: 'border-l-[#067647]', value: 'text-[#067647]' },
  orange: { border: 'border-l-[#FFAE4C]', value: 'text-[#C4320A]' },
};

interface PayrollMetricCardProps {
  title: string;
  accent?: Accent;
  children: React.ReactNode;
  className?: string;
}

const PayrollMetricCard: React.FC<PayrollMetricCardProps> = ({
  title,
  accent = 'blue',
  children,
  className,
}) => (
  <div
    className={cn(
      'bg-white rounded-xl border border-gray-100 border-l-4 p-4 sm:p-5 shadow-sm min-w-0',
      accentStyles[accent].border,
      className
    )}
  >
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
    {children}
  </div>
);

export const PayrollMetricValue: React.FC<{ value: string; subtext?: string; accent?: Accent }> = ({
  value,
  subtext,
  accent = 'blue',
}) => (
  <div>
    <p className={cn('text-xl sm:text-2xl font-black tabular-nums', accentStyles[accent].value)}>{value}</p>
    {subtext && <p className="text-xs text-gray-500 mt-1 font-medium">{subtext}</p>}
  </div>
);

export const PayrollStatusList: React.FC<{
  items: { label: string; count: number; color: string }[];
}> = ({ items }) => (
  <ul className="space-y-2">
    {items.map(item => (
      <li key={item.label} className="flex items-center justify-between text-sm">
        <span className="text-gray-600 font-medium">{item.label}</span>
        <span className={cn('font-bold tabular-nums', item.color)}>{item.count}</span>
      </li>
    ))}
  </ul>
);

export default PayrollMetricCard;
