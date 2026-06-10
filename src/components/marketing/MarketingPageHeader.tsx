import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TeamSwitcher from './TeamSwitcher';
import { cn } from '@/utils/cn';

interface MarketingPageHeaderProps {
  title: string;
  subtitle?: string;
  showTeamSwitcher?: boolean;
  backTo?: string;
  backLabel?: string;
  className?: string;
  rightSlot?: React.ReactNode;
}

const MarketingPageHeader: React.FC<MarketingPageHeaderProps> = ({
  title,
  subtitle,
  showTeamSwitcher = false,
  backTo,
  backLabel = 'Back',
  className,
  rightSlot,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#005CDA] transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h1>
          {showTeamSwitcher && <TeamSwitcher />}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {rightSlot}
          <p className="text-xs text-gray-400 font-medium hidden md:block whitespace-nowrap">
            {dateStr} {timeStr}
          </p>
        </div>
      </div>

      {subtitle && <p className="text-sm text-gray-500 font-medium -mt-1">{subtitle}</p>}
    </div>
  );
};

export default MarketingPageHeader;
