import React, { useMemo, memo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Users2, Settings, FolderCheck, Clock, Star, Monitor, LogOut, X,
  BarChart3, Shield, ClipboardCheck, Ticket, Receipt, Banknote, Webhook, Mail,
  MessageSquare, FileText, Package, CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/services/permissionsService';
import { clearAuthTokens } from '@/utils/tokenMemory';
import { forceCheckoutApi } from '@/utils/attendanceAutoCheckout';
import { ADMIN_ROLES } from '@/constants/roles';
import { cn } from '@/utils/cn';
import tekxaiLogo from '@/assets/icons/tekxai-logo.svg';

const SW = 1.5; // consistent stroke weight for all sidebar icons

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  section?: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const NavItem: React.FC<{ link: SidebarLink }> = ({ link }) => (
  <NavLink
    to={link.to}
    end={link.end}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 group text-[13px] font-medium',
        isActive
          ? 'bg-[#005CDA] text-white shadow-md shadow-blue-200'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      )
    }
  >
    {({ isActive }) => (
      <>
        <span className={cn('shrink-0 w-5 h-5 flex items-center justify-center transition-colors', isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')}>
          {link.icon}
        </span>
        <span className="truncate">{link.label}</span>
      </>
    )}
  </NavLink>
);

const Sidebar: React.FC<SidebarProps> = ({ onClose, isOpen }) => {
  const { role, userLogout } = useAuth();
  const navigate = useNavigate();
  const { data: myPerms } = useMyPermissions();

  const links: SidebarLink[] = useMemo(() => {
    const isAdmin = ADMIN_ROLES.includes(role as any);
    const hasErpAccess = isAdmin || myPerms?.permissions?.includes('erp.workspace.access');

    if (!hasErpAccess) {
      return [
        { to: '/employee',             label: 'Home',            icon: <Home size={18} strokeWidth={SW} />,          end: true },
        { to: '/employee/projects',    label: 'Projects',        icon: <FolderCheck size={18} strokeWidth={SW} /> },
        { to: '/employee/starred',     label: 'Starred Queries', icon: <Star size={18} strokeWidth={SW} /> },
        { to: '/employee/timesheet',   label: 'Timesheet',       icon: <Clock size={18} strokeWidth={SW} /> },
        { to: '/employee/tickets',     label: 'Support Tickets', icon: <Ticket size={18} strokeWidth={SW} /> },
        { to: '/employee/documents',   label: 'My Documents',    icon: <FileText size={18} strokeWidth={SW} /> },
        { to: '/employee/requisitions',label: 'Requisitions',    icon: <Package size={18} strokeWidth={SW} /> },
        { to: '/employee/daily-report',label: 'Daily Report',    icon: <ClipboardCheck size={18} strokeWidth={SW} /> },
        { to: '/chat',                 label: 'Messages',        icon: <MessageSquare size={18} strokeWidth={SW} /> },
        { to: '/employee/download-app',label: 'Desktop App',     icon: <Monitor size={18} strokeWidth={SW} /> },
        { to: '/employee/settings',    label: 'Settings',        icon: <Settings size={18} strokeWidth={SW} /> },
      ];
    }

    const isSuperAdmin = role === 'SUPER_ADMIN';

    return [
      { section: 'Overview', to: '/admin',              label: 'ERP Dashboard',   icon: <Home size={18} strokeWidth={SW} />,           end: true },
      { section: 'Delivery', to: '/admin/projects',     label: 'Projects',        icon: <FolderCheck size={18} strokeWidth={SW} /> },
      {                       to: '/admin/project-timeline', label: 'Timeline',    icon: <CalendarDays size={18} strokeWidth={SW} /> },
      {                       to: '/admin/team',         label: 'Teams',           icon: <Users2 size={18} strokeWidth={SW} /> },
      {                       to: '/admin/timesheet',    label: 'Timesheet',       icon: <Clock size={18} strokeWidth={SW} /> },
{                       to: '/admin/monitoring',   label: 'Monitoring',      icon: <Monitor size={18} strokeWidth={SW} /> },
      {                       to: '/admin/reports',      label: 'Reports',         icon: <BarChart3 size={18} strokeWidth={SW} /> },
      {                       to: '/admin/project-report', label: 'Project Report', icon: <BarChart3 size={18} strokeWidth={SW} /> },
      { section: 'Shared',   to: '/admin/starred',      label: 'Starred',         icon: <Star size={18} strokeWidth={SW} /> },
      {                       to: '/chat',               label: 'Messages',        icon: <MessageSquare size={18} strokeWidth={SW} /> },
      {                       to: '/admin/settings',     label: 'Settings',        icon: <Settings size={18} strokeWidth={SW} /> },
      { section: 'Admin',    to: '/admin/approvals',    label: 'Approvals',       icon: <ClipboardCheck size={18} strokeWidth={SW} /> },
      {                       to: '/admin/tickets',      label: 'Support Tickets', icon: <Ticket size={18} strokeWidth={SW} /> },
      {                       to: '/admin/expenses',     label: 'Expenses',        icon: <Receipt size={18} strokeWidth={SW} /> },
      {                       to: '/admin/payroll',      label: 'Payroll',         icon: <Banknote size={18} strokeWidth={SW} /> },
      {                       to: '/admin/webhooks',     label: 'Webhooks',        icon: <Webhook size={18} strokeWidth={SW} /> },
      {                       to: '/admin/report-builder', label: 'Report Builder',icon: <BarChart3 size={18} strokeWidth={SW} /> },
      ...(isSuperAdmin ? [
        { to: '/admin/permissions',       label: 'Access Control',    icon: <Shield size={18} strokeWidth={SW} /> },
        { to: '/admin/financial-reports', label: 'Financial Reports', icon: <BarChart3 size={18} strokeWidth={SW} /> },
        { to: '/admin/email-logs',        label: 'Email Logs',        icon: <Mail size={18} strokeWidth={SW} /> },
        { to: '/admin/system-settings',   label: 'System Settings',   icon: <Settings size={18} strokeWidth={SW} /> },
      ] : []),
    ];
  }, [role, myPerms]);

  const isAdmin = ADMIN_ROLES.includes(role as any) || myPerms?.permissions?.includes('erp.workspace.access');

  const handleLogout = async () => {
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
            <span className="text-xs font-bold uppercase tracking-widest text-[#005CDA] bg-blue-50 px-2 py-1 rounded-lg">
              ERP
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all lg:hidden">
            <X size={18} strokeWidth={SW} />
          </button>
        )}
      </div>

      {/* Workspace Switcher */}
      {isAdmin && (
        <div className="px-3 pt-3 flex gap-2">
          <button className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-[#005CDA] text-white">ERP</button>
          <button onClick={() => navigate('/crm')} className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">CRM</button>
          <button onClick={() => navigate('/hr')} className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">HR</button>
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
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{link.section}</span>
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
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <LogOut size={18} strokeWidth={SW} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default memo(Sidebar);
