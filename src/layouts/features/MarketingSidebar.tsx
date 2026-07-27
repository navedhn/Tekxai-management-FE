import React, { memo, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Archive, LogOut, X, Briefcase, Linkedin, Mail, Wallet, Target, FileBarChart, DollarSign, BarChart2 } from 'lucide-react';
import { texailogo } from '@/assets/icons';
import { useLogoutMutation } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { clearAuthTokens } from '@/utils/tokenMemory';
import { useMarketingTeam } from '@/contexts/MarketingTeamContext';

export type MarketingSidebarProps = { isOpen: boolean; onClose: () => void };

const MarketingSidebar: React.FC<MarketingSidebarProps> = memo(({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { userLogout } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const { teamId, setTeamId } = useMarketingTeam();
  const location = useLocation();

  const links = [
    { to: '/marketing', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/marketing/won-deals', label: 'Won Deals - Intern BDs', icon: Trophy, team: 'intern' as const },
    { to: '/marketing/won-deals', label: 'Won Deals - Sales Team', icon: Trophy, team: 'sales' as const },
    { to: '/marketing/upwork',      label: 'Upwork Bids',     icon: Briefcase },
    { to: '/marketing/linkedin',    label: 'LinkedIn Leads',  icon: Linkedin },
    { to: '/marketing/email-leads', label: 'Email Leads',     icon: Mail },
    { to: '/marketing/deposits',    label: 'Deposits',        icon: Wallet },
    { to: '/marketing/targets',     label: 'Targets',         icon: Target },
    { to: '/marketing/my-report',   label: 'My Report',       icon: FileBarChart },
    { to: '/marketing/my-salaries',   label: 'My Salaries',    icon: DollarSign },
    { to: '/marketing/hr-dashboard',  label: 'HR Dashboard',   icon: BarChart2 },
    { to: '/marketing/salary-history', label: 'Salary History', icon: Archive },
  ];

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      clearAuthTokens();
      userLogout();
      navigate('/login');
    }
  }, [navigate, logoutMutation, userLogout]);

  return (
    <aside
      className={
        `fixed inset-y-0 left-0 w-sidebar bg-(--color-sidebar-bg) flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] lg:translate-x-0 z-110 border-r border-white/10 ` +
        (isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
      }
    >
      <div className="p-[18.5px] flex items-center justify-center relative border-b border-white/10">
        <img src={texailogo} className="w-[100px] h-[50px] object-contain brightness-0 invert" alt="TekXAI" />
        <button
          onClick={onClose}
          className="lg:hidden absolute right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {links.map(link => {
          const isWonDealsLink = 'team' in link && link.team;
          const isActive = isWonDealsLink
            ? location.pathname === '/marketing/won-deals' && teamId === link.team
            : link.end
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to);

          return (
            <NavLink
              key={`${link.to}-${link.label}`}
              to={link.to}
              end={link.end}
              onClick={() => {
                if (isWonDealsLink && link.team) setTeamId(link.team);
                onClose();
              }}
              className={() =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group ` +
                (isActive
                  ? 'bg-(--color-sidebar-active) text-white shadow-md shadow-blue-950/40'
                  : 'text-(--color-sidebar-text) hover:bg-(--color-sidebar-hover) hover:text-white')
              }
            >
              <link.icon size={18} strokeWidth={1.5} className={`shrink-0 ${isActive ? 'text-white' : 'text-(--color-sidebar-icon) group-hover:text-slate-200'}`} />
              <span className="truncate">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          type="button"
          onClick={logout}
          disabled={logoutMutation.isPending}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium text-(--color-sidebar-text) hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-60"
        >
          <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
          <span className="truncate">
            {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
          </span>
        </button>
      </div>
    </aside>
  );
});

export default MarketingSidebar;
