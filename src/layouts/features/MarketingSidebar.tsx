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
        `fixed inset-y-0 left-0 w-sidebar bg-white flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] lg:translate-x-0 z-110 border-r border-gray-100 ` +
        (isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
      }
    >
      <div className="p-[18.5px] flex items-center justify-center relative border-b border-gray-100">
        <img src={texailogo} className="w-[100px] h-[50px] object-contain" alt="TekXAI" />
        <button
          onClick={onClose}
          className="lg:hidden absolute right-4 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 mt-2">
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
                `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 group ` +
                (isActive
                  ? 'bg-gradient-to-b from-[#005CDA] to-[#001F4A] text-white shadow-lg shadow-primary-100'
                  : 'text-[#252525] hover:bg-blue-50')
              }
            >
              <link.icon size={20} className="shrink-0" />
              <span className="text-sm tracking-tight leading-snug">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 pb-6 pt-4 mt-auto border-t border-gray-100">
        <button
          type="button"
          onClick={logout}
          disabled={logoutMutation.isPending}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-bold text-[#252525] hover:bg-red-50 hover:text-red-600 transition-all duration-300 group disabled:opacity-60"
        >
          <LogOut size={20} className="shrink-0 group-hover:text-red-600" />
          <span className="text-sm tracking-tight">
            {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
          </span>
        </button>
      </div>
    </aside>
  );
});

export default MarketingSidebar;
