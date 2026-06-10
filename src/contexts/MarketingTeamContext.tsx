import React, { createContext, useContext, useMemo, useState } from 'react';
import { MarketingTeamId } from '@/types/marketing';
import { getTeamLabel, MARKETING_TEAMS } from '@/services/marketingService';

interface MarketingTeamContextValue {
  teamId: MarketingTeamId;
  teamLabel: string;
  setTeamId: (id: MarketingTeamId) => void;
  teams: typeof MARKETING_TEAMS;
  period: string;
  setPeriod: (period: string) => void;
}

const MarketingTeamContext = createContext<MarketingTeamContextValue | null>(null);

export const MarketingTeamProvider: React.FC<{ children: React.ReactNode; defaultTeam?: MarketingTeamId }> = ({
  children,
  defaultTeam = 'sales',
}) => {
  const [teamId, setTeamId] = useState<MarketingTeamId>(defaultTeam);
  const [period, setPeriod] = useState('June 2026');

  const value = useMemo(
    () => ({
      teamId,
      teamLabel: getTeamLabel(teamId),
      setTeamId,
      teams: MARKETING_TEAMS,
      period,
      setPeriod,
    }),
    [teamId, period]
  );

  return <MarketingTeamContext.Provider value={value}>{children}</MarketingTeamContext.Provider>;
};

export const useMarketingTeam = () => {
  const ctx = useContext(MarketingTeamContext);
  if (!ctx) throw new Error('useMarketingTeam must be used within MarketingTeamProvider');
  return ctx;
};
