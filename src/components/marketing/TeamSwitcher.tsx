import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useMarketingTeam } from '@/contexts/MarketingTeamContext';
import { cn } from '@/utils/cn';

const TeamSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { teamId, setTeamId, teams, teamLabel } = useMarketingTeam();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
        <span className="truncate max-w-[180px] sm:max-w-none">{teamLabel}</span>
        <ChevronDown size={14} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          {teams.map(team => (
            <button
              key={team.id}
              type="button"
              onClick={() => {
                setTeamId(team.id);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors',
                teamId === team.id ? 'bg-[#E4F0FF] text-[#005CDA]' : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {team.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamSwitcher;
