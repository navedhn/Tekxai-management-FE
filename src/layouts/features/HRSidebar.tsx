import React, { memo, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Users, Building2, Clock, Package, TrendingUp, FileText,
  UserPlus, ShieldCheck, Briefcase, Heart, LogOut, X, Star,
  BarChart3, AlarmClock, UserSearch, PlusCircle,
} from 'lucide-react';
import tekxaiLogo from '@/assets/icons/tekxai-logo.svg';
import { useLogoutMutation } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { clearAuthTokens } from '@/utils/tokenMemory';
import { forceCheckoutApi } from '@/utils/attendanceAutoCheckout';
import { USER_ROLES } from '@/constants/roles';

export type HRSidebarProps = { isOpen: boolean; onClose: () => void };

const HRSidebar: React.FC<HRSidebarProps> = memo(({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { userLogout, user } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const isAdmin = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;
  const canSwitchWorkspace = isAdmin || user?.role === USER_ROLES.HR;

  const logout = useCallback(async () => {
    await forceCheckoutApi('LOGOUT');
    try { await logoutMutation.mutateAsync(); } catch {}
    clearAuthTokens();
    userLogout();
    navigate('/login');
  }, [navigate, logoutMutation, userLogout]);

  type NavEntry = { to: string; label: string; icon: React.ElementType; end?: boolean; section?: string };

  const links: NavEntry[] = [
    { section: 'Overview', to: '/hr', label: 'HR Dashboard', icon: Home, end: true },
    { section: 'People', to: '/hr/employee-directory', label: 'Employee Directory', icon: UserSearch },
    { to: '/hr/add-employee', label: 'Add Employee', icon: PlusCircle },
    { to: '/hr/departments', label: 'Departments', icon: Building2 },
    { section: 'Time & Attendance', to: '/hr/attendance', label: 'Attendance', icon: Clock },
    { to: '/hr/timesheet', label: 'Timesheets', icon: Clock },
    { to: '/hr/overtime', label: 'Overtime', icon: AlarmClock },
    { section: 'Payroll & Growth', to: '/hr/increments', label: 'Increments', icon: TrendingUp },
    { section: 'Performance', to: '/hr/performance', label: 'Performance', icon: TrendingUp },
    { to: '/hr/performance-scoring', label: 'Performance Scoring', icon: TrendingUp },
    { section: 'Reports', to: '/hr/reports', label: 'HR Reports', icon: BarChart3 },
    { section: 'Assets & Ops', to: '/hr/assets', label: 'Assets', icon: Package },
    { to: '/hr/requisitions', label: 'Requisitions', icon: Package },
    { section: 'Employment', to: '/hr/contracts', label: 'Contracts', icon: FileText },
    { to: '/hr/onboarding', label: 'Hiring & Onboarding', icon: UserPlus },
    { to: '/hr/policies', label: 'Policies', icon: ShieldCheck },
    { to: '/hr/job-descriptions', label: 'Job Descriptions', icon: Briefcase },
    { section: 'My HR', to: '/hr/my-salaries', label: 'My Salaries', icon: Heart },
  ];

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
          <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
            HR
          </span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg">
          <X size={18} />
        </button>
      </div>

      {canSwitchWorkspace && (
        <div className="px-3 pt-3 flex gap-2">
          <button onClick={() => navigate('/admin')} className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">ERP</button>
          <button onClick={() => navigate('/crm')} className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">CRM</button>
          <button className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-emerald-600 text-white">HR</button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {links.map((link) => {
          const showSection = link.section && link.section !== lastSection;
          if (link.section) lastSection = link.section;
          return (
            <React.Fragment key={link.to + link.label}>
              {showSection && (
                <div className="pt-3 pb-1 px-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{link.section}</span>
                </div>
              )}
              <NavLink
                to={link.to}
                end={link.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150 ` +
                  (isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
                }
              >
                <link.icon size={18} className="shrink-0" />
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
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-60"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
});

export default HRSidebar;
