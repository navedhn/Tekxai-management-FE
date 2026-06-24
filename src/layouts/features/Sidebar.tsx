import React, { useMemo, memo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Settings,
  FolderCheck,
  Clock,
  Star,
  Monitor,
  LogOut,
  X,
  BarChart3,
  UserPlus,
  ShieldCheck,
  Shield,
  ClipboardCheck,
  Ticket,
  Package,
  TrendingUp,
  FileText,
  Building2,
  Heart,
  Wrench,
  Calculator,
  Users2,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { clearAuthTokens } from '@/utils/tokenMemory';
import { forceCheckoutApi } from '@/utils/attendanceAutoCheckout';
import { useNavigate as useNav } from 'react-router-dom';
import { USER_ROLES, ADMIN_ROLES } from '@/constants/roles';
import { cn } from '@/utils/cn';
import tekxaiLogo from '@/assets/icons/tekxai-logo.svg';

import dashboardIconBlack from '@/assets/icons/dashboard-black-icon.svg';
import dashboardIconWhite from '@/assets/icons/dashboard-icon-white.svg';
import projectIconBlack   from '@/assets/icons/project-icon-black.svg';
import projectIconWhite   from '@/assets/icons/project-icon-white.svg';
import timesheetBlack     from '@/assets/icons/timesheet-black.svg';
import timesheetWhite     from '@/assets/icons/timesheet-white.svg';
import timesheetEmployeeBlack from '@/assets/icons/timesheet-emplooye-black.svg';
import timesheetEmployeeWhite from '@/assets/icons/timesheet-emplooye-white.svg';
import settingsBlack      from '@/assets/icons/settings-black.svg';
import settingsWhite      from '@/assets/icons/settings-white.svg';
import teamManagementBlack from '@/assets/icons/teammanagment-black.svg';
import teamManagementWhite from '@/assets/icons/teammanagement-white.svg';
import savedBlack         from '@/assets/icons/saved-black.svg';
import savedWhite         from '@/assets/icons/saved-white.svg';

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ReactNode;
  inactive?: string;
  active?: string;
  end?: boolean;
  section?: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const SvgIcon: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <img src={src} alt={alt} className="w-5 h-5 object-contain" />
);

const NavItem: React.FC<{ link: SidebarLink }> = ({ link }) => (
  <NavLink
    to={link.to}
    end={link.end}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 group text-[13px] font-bold',
        isActive
          ? 'bg-[#005CDA] text-white shadow-lg shadow-blue-200'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      )
    }
  >
    {({ isActive }) => (
      <>
        <span className="shrink-0 w-5 h-5 flex items-center justify-center">
          {link.inactive && link.active ? (
            <SvgIcon src={isActive ? link.active : link.inactive} alt={link.label} />
          ) : (
            <span className={cn('transition-colors', isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700')}>
              {link.icon}
            </span>
          )}
        </span>
        <span className="truncate">{link.label}</span>
      </>
    )}
  </NavLink>
);

const Sidebar: React.FC<SidebarProps> = ({ onClose, isOpen }) => {
  const { role, userLogout } = useAuth();
  const navigate = useNavigate();

  const links: SidebarLink[] = useMemo(() => {
    const isAdmin = ADMIN_ROLES.includes(role as any);

    if (!isAdmin) {
      return [
        { to: '/employee',              label: 'Home',             icon: <Home size={20} />,      inactive: dashboardIconBlack, active: dashboardIconWhite, end: true },
        { to: '/employee/projects',     label: 'Projects',         icon: <FolderCheck size={20} />,inactive: projectIconBlack, active: projectIconWhite },
        { to: '/employee/starred',      label: 'Starred Queries',  icon: <Star size={20} /> },
        { to: '/employee/timesheet',    label: 'Timesheet',        icon: <Clock size={20} />,     inactive: timesheetEmployeeBlack, active: timesheetEmployeeWhite },
        { to: '/employee/tickets',      label: 'Support Tickets',  icon: <Ticket size={20} /> },
        { to: '/employee/documents',    label: 'My Documents',     icon: <FileText size={20} /> },
        { to: '/employee/daily-report', label: 'Daily Report',     icon: <FileText size={20} /> },
        { to: '/chat',                  label: 'Messages',         icon: <MessageSquare size={20} /> },
        { to: '/employee/settings',     label: 'Settings',         icon: <Settings size={20} />,  inactive: settingsBlack, active: settingsWhite },
      ];
    }

    const isSuperAdmin = role === 'SUPER_ADMIN';

    // ERP workspace sidebar (Admin/HR/DivManager)
    return [
      { section: 'Overview',    to: '/admin',             label: 'ERP Dashboard',     icon: <Home size={20} />,      inactive: dashboardIconBlack, active: dashboardIconWhite, end: true },
      { section: 'Delivery',    to: '/admin/projects',    label: 'Projects',          icon: <FolderCheck size={20} />,inactive: projectIconBlack, active: projectIconWhite },
      { to: '/admin/team',      label: 'Teams',           icon: <Users2 size={20} />, inactive: teamManagementBlack, active: teamManagementWhite },
      { to: '/admin/timesheet', label: 'Timesheet',       icon: <Clock size={20} />,  inactive: timesheetBlack, active: timesheetWhite },
      { to: '/admin/operations',label: 'Operations',      icon: <Wrench size={20} /> },
      { to: '/admin/monitoring',label: 'Monitoring',      icon: <Monitor size={20} /> },
      { to: '/admin/reports',   label: 'Reports',         icon: <BarChart3 size={20} /> },
      { section: 'Shared', to: '/admin/starred',  label: 'Starred',           icon: <Star size={20} />,   inactive: savedBlack, active: savedWhite },
      { to: '/chat',            label: 'Messages',          icon: <MessageSquare size={20} /> },
      { to: '/admin/settings',  label: 'Settings',        icon: <Settings size={20} />,inactive: settingsBlack, active: settingsWhite },
      // Admin/HR — approvals
      { section: 'Admin', to: '/admin/approvals', label: 'Approvals', icon: <ClipboardCheck size={20} /> },
      { to: '/admin/expenses', label: 'Expenses', icon: <Receipt size={20} /> },
      // Super Admin only — permissions management + financial reporting + system settings
      ...(isSuperAdmin ? [
        { to: '/admin/permissions', label: 'Access Control', icon: <Shield size={20} /> },
        { to: '/admin/financial-reports', label: 'Financial Reports', icon: <BarChart3 size={20} /> },
        { to: '/admin/system-settings', label: 'System Settings', icon: <Settings size={20} /> },
      ] : []),
    ];
  }, [role]);

  const isAdmin = ADMIN_ROLES.includes(role as any);

  const handleLogout = async () => {
    // Auto-checkout any open attendance session before logging out
    await forceCheckoutApi('LOGOUT');
    clearAuthTokens();
    userLogout();
    navigate('/login');
  };

  let lastSection = '';

  return (
    <div className={cn(
      'fixed left-0 top-0 z-40 w-[280px] h-screen flex flex-col bg-white border-r border-gray-100',
      isOpen !== undefined && !isOpen ? '-translate-x-full lg:translate-x-0' : '',
      'transition-transform duration-300'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src={tekxaiLogo} alt="Tekxai" className="h-8" />
          {isAdmin && (
            <span className="text-xs font-black uppercase tracking-widest text-[#005CDA] bg-blue-50 px-2 py-1 rounded-lg">
              ERP
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Workspace Switcher for admins */}
      {isAdmin && (
        <div className="px-3 pt-3 flex gap-2">
          <button className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-[#005CDA] text-white">ERP</button>
          <button onClick={() => navigate('/crm')} className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">CRM</button>
          <button onClick={() => navigate('/hr')} className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">HR</button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
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
              <NavItem link={link} />
            </React.Fragment>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default memo(Sidebar);
