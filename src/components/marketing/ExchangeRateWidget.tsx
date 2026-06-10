import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EXCHANGE_RATE_USD_TO_PKR } from '@/services/marketingService';
import Badge from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

const ExchangeRateWidget: React.FC<{ className?: string }> = ({ className }) => {
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [spinning, setSpinning] = useState(false);

  const refresh = () => {
    setSpinning(true);
    setUpdatedAt(new Date());
    setTimeout(() => setSpinning(false), 600);
  };

  useEffect(() => {
    const timer = setInterval(() => setUpdatedAt(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white px-4 py-3 min-w-[240px]', className)}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-bold text-gray-500">Exchange Rate</span>
        <Badge className="bg-[#E7F9ED] text-[#067647] border border-[#ABEFC6] text-[10px] px-2 py-0.5">
          LIVE
        </Badge>
      </div>
      <p className="text-sm font-black text-gray-900">
        1 USD = PKR {EXCHANGE_RATE_USD_TO_PKR.toFixed(2)}
      </p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-gray-400 font-medium">
          Updated {updatedAt.toLocaleString()}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-[#005CDA] transition-colors"
          aria-label="Refresh exchange rate"
        >
          <RefreshCw size={14} className={cn(spinning && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
};

export default ExchangeRateWidget;
