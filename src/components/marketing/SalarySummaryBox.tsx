import React from 'react';
import { formatPkr, formatUsd, pkrToUsd } from '@/services/marketingService';
import { cn } from '@/utils/cn';

interface SalarySummaryBoxProps {
  commissionPkr: number;
  basicSalaryPkr: number;
  allowancesPkr: number;
  deductionsPkr: number;
  className?: string;
}

const Line: React.FC<{ label: string; pkr: number; negative?: boolean }> = ({ label, pkr, negative }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-600 font-medium">{label}</span>
    <span className={cn('font-semibold tabular-nums', negative && 'text-red-600')}>
      {negative ? '- ' : ''}{formatUsd(pkrToUsd(Math.abs(pkr)))} · {negative ? '- ' : ''}{formatPkr(Math.abs(pkr))}
    </span>
  </div>
);

const SalarySummaryBox: React.FC<SalarySummaryBoxProps> = ({
  commissionPkr,
  basicSalaryPkr,
  allowancesPkr,
  deductionsPkr,
  className,
}) => {
  const grandTotal = commissionPkr + basicSalaryPkr + allowancesPkr - deductionsPkr;

  return (
    <div className={cn('rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-5 sm:p-6 space-y-3', className)}>
      <Line label="Sub-total (Commission)" pkr={commissionPkr} />
      <Line label="Basic Salary" pkr={basicSalaryPkr} />
      {allowancesPkr > 0 && <Line label="Allowances" pkr={allowancesPkr} />}
      <Line label="Deductions" pkr={deductionsPkr} negative={deductionsPkr > 0} />

      <div className="border-t border-[#ABEFC6] pt-4 mt-2 flex items-end justify-between">
        <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Grand Total</span>
        <div className="text-right">
          <p className="text-xs text-gray-500 font-medium">{formatUsd(pkrToUsd(grandTotal))} USD</p>
          <p className="text-2xl font-black text-[#067647] tabular-nums">{formatPkr(grandTotal)}</p>
        </div>
      </div>
    </div>
  );
};

export default SalarySummaryBox;
