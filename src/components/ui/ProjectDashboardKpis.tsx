import React from 'react';
import { AlertTriangle, Ban, CheckCircle2, Clock, ShieldAlert, Hourglass, Activity } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ProjectDashboardStats } from '@/services/projectDashboardService';

interface KpiCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  active: boolean;
  onClick: () => void;
  colorClassName: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, value, label, active, onClick, colorClassName }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col gap-2 p-4 rounded-2xl border transition-all text-left min-w-[130px]',
      active ? 'border-primary-400 bg-primary-50/50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'
    )}
  >
    <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', colorClassName)}>{icon}</div>
    <span className="text-2xl font-black text-gray-900 tabular-nums">{value}</span>
    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</span>
  </button>
);

interface ProjectDashboardKpisProps {
  stats?: ProjectDashboardStats;
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

const ProjectDashboardKpis: React.FC<ProjectDashboardKpisProps> = ({ stats, activeFilter, onFilterChange }) => {
  if (!stats) return null;

  const toggle = (key: string) => onFilterChange(activeFilter === key ? null : key);

  return (
    <div className="flex flex-wrap gap-3">
      <KpiCard
        icon={<Activity size={18} className="text-primary-600" />}
        value={stats.total}
        label="Total Projects"
        active={activeFilter === null}
        onClick={() => onFilterChange(null)}
        colorClassName="bg-primary-50"
      />
      <KpiCard
        icon={<Clock size={18} className="text-[#C4320A]" />}
        value={stats.overdue}
        label="Overdue"
        active={activeFilter === 'overdue'}
        onClick={() => toggle('overdue')}
        colorClassName="bg-[#FFF6ED]"
      />
      <KpiCard
        icon={<Ban size={18} className="text-[#B42318]" />}
        value={stats.blocked}
        label="Blocked"
        active={activeFilter === 'blocked'}
        onClick={() => toggle('blocked')}
        colorClassName="bg-[#FEF3F2]"
      />
      <KpiCard
        icon={<Hourglass size={18} className="text-[#0F766E]" />}
        value={stats.waiting_on_client}
        label="Waiting Client"
        active={activeFilter === 'waiting_on_client'}
        onClick={() => toggle('waiting_on_client')}
        colorClassName="bg-[#F0FDF9]"
      />
      <KpiCard
        icon={<ShieldAlert size={18} className="text-[#B54708]" />}
        value={stats.needs_qa}
        label="Needs QA"
        active={activeFilter === 'needs_qa'}
        onClick={() => toggle('needs_qa')}
        colorClassName="bg-[#FFFAEB]"
      />
      <KpiCard
        icon={<AlertTriangle size={18} className="text-[#C01048]" />}
        value={stats.access_incomplete}
        label="Access Incomplete"
        active={activeFilter === 'access_incomplete'}
        onClick={() => toggle('access_incomplete')}
        colorClassName="bg-[#FFF1F3]"
      />
      <KpiCard
        icon={<CheckCircle2 size={18} className="text-[#027A48]" />}
        value={stats.delivered}
        label="Delivered"
        active={activeFilter === 'delivered'}
        onClick={() => toggle('delivered')}
        colorClassName="bg-[#ECFDF3]"
      />
    </div>
  );
};

export default ProjectDashboardKpis;
