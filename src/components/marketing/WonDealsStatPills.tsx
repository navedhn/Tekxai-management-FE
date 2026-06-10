import React from 'react';
import { cn } from '@/utils/cn';
import { formatUsd } from '@/services/marketingService';

interface WonDealsStatPillsProps {
  totalDeals: number;
  totalRevenue: number;
  avgDealSize: number;
  upworkCount: number;
  linkedInCount: number;
  className?: string;
}

const Pill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="inline-flex flex-col gap-0.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white min-w-[120px]">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
    <span className="text-sm font-black text-gray-900 tabular-nums">{value}</span>
  </div>
);

const WonDealsStatPills: React.FC<WonDealsStatPillsProps> = ({
  totalDeals,
  totalRevenue,
  avgDealSize,
  upworkCount,
  linkedInCount,
  className,
}) => (
  <div className={cn('flex flex-wrap gap-2 sm:gap-3', className)}>
    <Pill label="Total Deals" value={String(totalDeals)} />
    <Pill label="Total Revenue" value={formatUsd(totalRevenue)} />
    <Pill label="Avg Deal Size" value={formatUsd(avgDealSize)} />
    <Pill label="From Upwork" value={`${upworkCount} deals`} />
    <Pill label="From LinkedIn" value={`${linkedInCount} deals`} />
  </div>
);

export default WonDealsStatPills;
