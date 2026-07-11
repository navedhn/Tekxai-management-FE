import React, { memo, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, Target,
  FileBarChart, DollarSign, BarChart2, Archive, Building2, Calculator,
  Users, LogOut, X, FileText, ArrowRight, Receipt,
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
  const isMarketer = role === USER_ROLES.MARKETING;
  // Admin/SuperAdmin see everything; MARKETING employees get scoped view
  const canSeeFinance = isAdmin; // Invoices, Client Accounts, Contracts, Estimator, Deposits

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

  // Sales CRM nav (Pipeline/All Leads, Upwork Bids, LinkedIn Leads, Email Leads,
  // Won Deals) intentionally removed from this sidebar — those pages will move to
  // a standalone Sales CRM app sharing this backend/DB. See
  // Tekxai-Operations-OS/08-Master-Gap-Analysis.md §5. Backend/routes untouched.
  const links: NavEntry[] = [
    { section: 'Overview',    to: '/crm',            label: 'CRM Dashboard',        icon: LayoutDashboard, end: true },
    // Finance / admin — only visible to Admin/Super Admin
    {                         to: '/crm/deposits',   label: 'Deposits',             icon: Wallet,     financeOnly: true },
    { section: 'Accounts',    to: '/crm/clients',    label: 'Client Accounts',      icon: Building2,  financeOnly: true },
    {                         to: '/crm/invoices',   label: 'Invoices',             icon: Receipt,    financeOnly: true },
    {                         to: '/crm/contracts',  label: 'Contracts',            icon: FileText,   financeOnly: true },
    {                         to: '/crm/estimator',  label: 'Estimator',            icon: Calculator, financeOnly: true },
    { section: 'ERP Handoff', to: '/crm/handoffs',   label: 'ERP Handoffs',         icon: ArrowRight },
    { section: 'My Work',     to: '/crm/targets',    label: 'Targets',              icon: Target },
    {                         to: '/crm/my-report',  label: 'My Report',            icon: FileBarChart },
    {                         to: '/crm/my-salaries',label: 'My Salaries',          icon: DollarSign },
  ];

  if (isAdmin) {
    links.push({ section: 'Admin', to: '/crm/team',          label: 'Team Hierarchy', icon: Users,     adminOnly: true });
    links.push({                   to: '/crm/hr-dashboard',   label: 'HR Overview',    icon: BarChart2, adminOnly: true });
    links.push({                   to: '/crm/salary-history', label: 'Salary History', icon: Archive,   adminOnly: true });
  }

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
