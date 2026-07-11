import React, { memo, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, LogOut, X, ArrowRight, Receipt,
} from 'lucide-react';
import { useLogoutMutation } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { clearAuthTokens } from '@/utils/tokenMemory';
import { forceCheckoutApi } from '@/utils/attendanceAutoCheckout';
import { useMarketingTeam } from '@/contexts/MarketingTeamContext';
import tekxaiLogo from '@/assets/icons/tekxai-logo.svg';
import { USER_ROLES } from '@/constants/roles';

export type CRMSidebarProps = { isOpen: boolean; onClose: () => void };

const CRMSidebar: React.FC<CRMSidebarProps> = memo(({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { userLogout, user } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const { teamId, setTeamId } = useMarketingTeam();
  const location = useLocation();

  const role = user?.role ?? (user as any)?.role_name ?? '';
  const isAdmin    = role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN;
  const canSwitchWorkspace = isAdmin;
  // Admin/SuperAdmin see everything; MARKETING employees get scoped view
  const canSeeFinance = isAdmin; // Invoices, Client Accounts

  const logout = useCallback(async () => {
    await forceCheckoutApi('LOGOUT');
    try { await logoutMutation.mutateAsync(); } catch {}
    clearAuthTokens();
    userLogout();
    navigate('/login');
  }, [navigate, logoutMutation, userLogout]);

  type NavEntry = {
    to: string;
    label: string;
    icon: React.ElementType;
    end?: boolean;
    team?: 'intern' | 'sales';
    section?: string;
    adminOnly?: boolean;
    financeOnly?: boolean;
  };

  // CRM Split Phase 4 (final cleanup): ERP CRM is now strictly Post-Sales — this
  // sidebar shows only Dashboard, Client Accounts, Invoices, and ERP Handoffs.
  // Everything else (Pipeline/Leads/Deals, Deposits, Targets, My Report,
  // My Salaries, Team Hierarchy, HR Overview, Salary History, and Contracts —
  // which opens the unrelated Employee Contracts module, not a real client-
  // contracts feature) has been removed from this workspace's navigation.
  // Backend/routes for all of it remain untouched for reuse by the future
  // standalone Sales CRM app. See Tekxai-Operations-OS/08-Master-Gap-Analysis.md §5.
  const links: NavEntry[] = [
    { section: 'Overview',    to: '/crm',            label: 'CRM Dashboard',        icon: LayoutDashboard, end: true },
    // Finance / admin — only visible to Admin/Super Admin
    { section: 'Accounts',    to: '/crm/clients',    label: 'Client Accounts',      icon: Building2,  financeOnly: true },
    {                         to: '/crm/invoices',   label: 'Invoices',             icon: Receipt,    financeOnly: true },
    { section: 'ERP Handoff', to: '/crm/handoffs',   label: 'ERP Handoffs',         icon: ArrowRight },
  ];

  const visibleLinks = links.filter(link => {
    if (link.financeOnly && !canSeeFinance) return false;
    if (link.adminOnly   && !isAdmin)       return false;
    return true;
  });

  let lastSection = '';

  return (
    <aside
      className={
        `fixed inset-y-0 left-0 w-[280px] bg-white flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] lg:translate-x-0 z-[110] border-r border-gray-100 ` +
        (isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
      }
    >
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src={tekxaiLogo} alt="TekXAI" className="h-8" />
          <span className="text-xs font-black uppercase tracking-widest text-[#005CDA] bg-blue-50 px-2 py-1 rounded-lg">
            CRM
          </span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg">
          <X size={18} />
        </button>
      </div>

      {canSwitchWorkspace && (
        <div className="px-3 pt-3 flex gap-2">
          <button onClick={() => navigate('/admin')} className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">ERP</button>
          <button className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-[#005CDA] text-white">CRM</button>
          <button onClick={() => navigate('/hr')} className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">HR</button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {visibleLinks.map((link) => {
          const showSection = link.section && link.section !== lastSection;
          if (link.section) lastSection = link.section;

          const isWonDeals = 'team' in link && link.team;
          const isActive = isWonDeals
            ? location.pathname === '/crm/won-deals' && teamId === link.team
            : link.end
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to);

          return (
            <React.Fragment key={`${link.to}-${link.label}`}>
              {showSection && (
                <div className="pt-3 pb-1 px-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{link.section}</span>
                </div>
              )}
              <NavLink
                to={link.to}
                end={link.end}
                onClick={() => {
                  if (isWonDeals && link.team) setTeamId(link.team);
                  onClose();
                }}
                className={() =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ` +
                  (isActive
                    ? 'bg-[#005CDA] text-white shadow-md shadow-blue-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
                }
              >
                <link.icon size={18} strokeWidth={1.5} className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="truncate">{link.label}</span>
              </NavLink>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={logout}
          disabled={logoutMutation.isPending}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-60"
        >
          <LogOut size={18} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </aside>
  );
});

export default CRMSidebar;
