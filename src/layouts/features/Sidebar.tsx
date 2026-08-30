import React, { useMemo, useState, useEffect, memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Users2, Settings, FolderCheck, Clock, Star, Monitor, X,
  BarChart3, Shield, ClipboardCheck, Ticket, Receipt, Banknote, Webhook, Mail,
  MessageSquare, FileText, Package, CalendarDays, Table2, Layers, Video, Gauge,
  Building2, TrendingUp, UserPlus, ShieldCheck, Briefcase, Heart, AlarmClock,
  UserSearch, PlusCircle, Tag, Network, Landmark, ChevronDown, ChevronRight,
  Bell as BellIcon, UserMinus, ListChecks,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { useMyPermissions } from '@/services/permissionsService';
import { USER_ROLES } from '@/constants/roles';

import { cn } from '@/utils/cn';
import tekxaiLogo from '@/assets/icons/tekxai-logo.svg';

const SW = 1.5;

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  section?: string;
  badge?: number;
}

const MODULE_ORDER = [
  'Dashboard', 'Workforce', 'Recruitment', 'Attendance', 'Performance',
  'Payroll', 'Finance', 'Assets', 'Procurement', 'Contracts', 'Policies',
  'Ticketing', 'Monitoring', 'My Workspace', 'Administration', 'Projects',
] as const;
type ModuleName = typeof MODULE_ORDER[number];
type Tier = 'all' | 'erpOps' | 'admin' | 'executive' | 'superadmin';

const ERP_OPS_ROUTE_PERMISSIONS: Record<string, string> = {
  '/admin/employee-directory': 'hr.employees.view',
  '/admin/add-employee': 'erp.users.create',
  '/admin/business-units': 'erp.business_units.view',
  '/admin/departments': 'erp.departments.view',
  '/admin/divisions': 'erp.departments.view',
  '/admin/designations': 'erp.designations.view',
  '/admin/grades': 'erp.grades.view',
  '/admin/org-chart': 'erp.departments.view',
  '/admin/job-descriptions': 'hr.job_descriptions.view',
  '/admin/hr-reports': 'hr.reports.view',
  '/admin/job-requisitions': 'hr.job_requisitions.view',
  '/admin/onboarding': 'hr.onboarding.view',
  '/admin/offboarding': 'hr.offboarding.view',
  '/admin/attendance': 'erp.attendance.view',
  '/admin/overtime': 'erp.overtime.view',
  '/admin/employee-timesheets': 'erp.timesheet.view',
  '/admin/performance': 'erp.performance.view',
  '/admin/performance-scoring': 'erp.performance.view',
  '/admin/increments': 'hr.increments.view',
  '/admin/assets': 'erp.assets.view',
  '/admin/requisitions': 'erp.requisitions.view',
  '/admin/contracts': 'hr.contracts.view',
  '/admin/documents': 'erp.hr_documents.view',
  '/admin/document-templates': 'erp.hr_documents.view',
  '/admin/policies': 'hr.policies.view',
  '/admin/monitoring': 'erp.monitoring.view',
};
interface ModuleLink extends Omit<SidebarLink, 'section'> {
  module: ModuleName;
  tier: Tier;
}
interface ModuleGroup {
  module: ModuleName;
  icon: React.ReactNode;
  items: SidebarLink[];
}

const MODULE_ICONS: Record<ModuleName, React.ReactNode> = {
  'Dashboard':      <Home size={18} strokeWidth={SW} />,
  'Workforce':      <Users2 size={18} strokeWidth={SW} />,
  'Recruitment':    <UserPlus size={18} strokeWidth={SW} />,
  'Attendance':     <Clock size={18} strokeWidth={SW} />,
  'Performance':    <TrendingUp size={18} strokeWidth={SW} />,
  'Payroll':        <Banknote size={18} strokeWidth={SW} />,
  'Finance':        <Receipt size={18} strokeWidth={SW} />,
  'Assets':         <Package size={18} strokeWidth={SW} />,
  'Procurement':    <ClipboardCheck size={18} strokeWidth={SW} />,
  'Contracts':      <FileText size={18} strokeWidth={SW} />,
  'Policies':       <ShieldCheck size={18} strokeWidth={SW} />,
  'Ticketing':      <Ticket size={18} strokeWidth={SW} />,
  'Monitoring':     <Monitor size={18} strokeWidth={SW} />,
  'My Workspace':   <Heart size={18} strokeWidth={SW} />,
  'Administration': <Shield size={18} strokeWidth={SW} />,
  'Projects':       <FolderCheck size={18} strokeWidth={SW} />,
};

function isItemActive(item: SidebarLink, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + '/');
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
          ? 'bg-(--color-sidebar-active) text-white shadow-md shadow-blue-950/40'
          : 'text-(--color-sidebar-text) hover:bg-(--color-sidebar-hover) hover:text-white',
      )
    }
  >
    {({ isActive }) => (
      <>
        <span className={cn('shrink-0 w-5 h-5 flex items-center justify-center transition-colors', isActive ? 'text-white' : 'text-(--color-sidebar-icon) group-hover:text-slate-200')}>
          {link.icon}
        </span>
        <span className="truncate flex-1">{link.label}</span>
        {!!link.badge && (
          <span className={cn(
            'shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center',
            isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white',
          )}>
            {link.badge > 99 ? '99+' : link.badge}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const Sidebar: React.FC<SidebarProps> = ({ onClose, isOpen }) => {
  const { role } = useAuth();
  const location = useLocation();
  const { data: myPerms } = useMyPermissions();
  const chatUnreadCount = useChatUnreadCount();

  const employeeLinks: SidebarLink[] | null = useMemo(() => {
    if (!location.pathname.startsWith('/employee')) return null;

    const canSeeProjects = role === USER_ROLES.EMPLOYEE || !!myPerms?.permissions?.includes('erp.projects.view');

    return [
      { to: '/employee',             label: 'Home',            icon: <Home size={18} strokeWidth={SW} />,          end: true },
      ...(canSeeProjects ? [{ to: '/employee/projects', label: 'Projects', icon: <FolderCheck size={18} strokeWidth={SW} /> }] : []),
      { to: '/employee/starred',     label: 'Starred Queries', icon: <Star size={18} strokeWidth={SW} /> },
      { to: '/employee/timesheet',   label: 'Timesheet',       icon: <Clock size={18} strokeWidth={SW} /> },
      { to: '/employee/tickets',     label: 'Support Tickets', icon: <Ticket size={18} strokeWidth={SW} /> },
      { to: '/employee/documents',   label: 'My Documents',    icon: <FileText size={18} strokeWidth={SW} /> },
      { to: '/employee/onboarding',  label: 'My Onboarding',   icon: <ListChecks size={18} strokeWidth={SW} /> },
      { to: '/employee/requisitions',label: 'Requisitions',    icon: <Package size={18} strokeWidth={SW} /> },
      { to: '/employee/daily-report',label: 'Daily Report',    icon: <ClipboardCheck size={18} strokeWidth={SW} /> },
      { to: '/chat',                 label: 'Messages',        icon: <MessageSquare size={18} strokeWidth={SW} />, badge: chatUnreadCount },
      { to: '/employee/download-app',label: 'Desktop App',     icon: <Monitor size={18} strokeWidth={SW} /> },
      { to: '/employee/settings',    label: 'Settings',        icon: <Settings size={18} strokeWidth={SW} /> },
    ];
  }, [role, myPerms, chatUnreadCount, location.pathname]);

  const moduleGroups: ModuleGroup[] = useMemo(() => {
    const isAdmin = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.workspace.access');
    const isSuperAdmin = !!myPerms?.is_super_admin;
    const isExecutive = !!(myPerms?.is_super_admin || myPerms?.permissions?.includes('erp.executive-analytics.view'));

    const allItems: ModuleLink[] = [
      { module: 'Dashboard', tier: 'all', to: '/admin', label: 'Dashboard', icon: <Home size={18} strokeWidth={SW} />, end: true },
      { module: 'Dashboard', tier: 'executive', to: '/admin/executive-dashboard', label: 'Executive Dashboard', icon: <Gauge size={18} strokeWidth={SW} /> },

      { module: 'Workforce', tier: 'erpOps', to: '/admin/employee-directory', label: 'Employee Directory', icon: <UserSearch size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/add-employee', label: 'Add Employee', icon: <PlusCircle size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/business-units', label: 'Business Units', icon: <Landmark size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/departments', label: 'Departments', icon: <Building2 size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/divisions', label: 'Divisions', icon: <Layers size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'admin', to: '/admin/team', label: 'Teams', icon: <Users2 size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/designations', label: 'Designations', icon: <Tag size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/grades', label: 'Grades', icon: <TrendingUp size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/org-chart', label: 'Org Chart', icon: <Network size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/job-descriptions', label: 'Job Descriptions', icon: <Briefcase size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/hr-reports', label: 'HR Reports', icon: <BarChart3 size={18} strokeWidth={SW} /> },

      { module: 'Recruitment', tier: 'erpOps', to: '/admin/job-requisitions', label: 'Job Requisitions', icon: <ClipboardCheck size={18} strokeWidth={SW} /> },
      { module: 'Recruitment', tier: 'erpOps', to: '/admin/onboarding', label: 'Hiring & Onboarding', icon: <UserPlus size={18} strokeWidth={SW} /> },
      { module: 'Recruitment', tier: 'erpOps', to: '/admin/offboarding', label: 'Offboarding', icon: <UserMinus size={18} strokeWidth={SW} /> },

      { module: 'Attendance', tier: 'erpOps', to: '/admin/attendance', label: 'Attendance', icon: <Clock size={18} strokeWidth={SW} /> },
      { module: 'Attendance', tier: 'erpOps', to: '/admin/overtime', label: 'Overtime', icon: <AlarmClock size={18} strokeWidth={SW} /> },
      { module: 'Attendance', tier: 'erpOps', to: '/admin/employee-timesheets', label: 'Employee Timesheets', icon: <Clock size={18} strokeWidth={SW} /> },
      { module: 'Attendance', tier: 'admin', to: '/admin/manager-review', label: 'Manager Review', icon: <ClipboardCheck size={18} strokeWidth={SW} /> },
      { module: 'Attendance', tier: 'admin', to: '/admin/compliance-violations', label: 'Compliance Violations', icon: <AlarmClock size={18} strokeWidth={SW} /> },

      { module: 'Performance', tier: 'erpOps', to: '/admin/performance', label: 'Performance', icon: <TrendingUp size={18} strokeWidth={SW} /> },
      { module: 'Performance', tier: 'erpOps', to: '/admin/performance-scoring', label: 'Performance Scoring', icon: <TrendingUp size={18} strokeWidth={SW} /> },

      { module: 'Payroll', tier: 'erpOps', to: '/admin/increments', label: 'Increments', icon: <TrendingUp size={18} strokeWidth={SW} /> },
      { module: 'Payroll', tier: 'admin', to: '/admin/payroll', label: 'Payroll', icon: <Banknote size={18} strokeWidth={SW} /> },

      { module: 'Finance', tier: 'admin', to: '/admin/finance/expenses', label: 'Expense Claims', icon: <Receipt size={18} strokeWidth={SW} /> },
      { module: 'Finance', tier: 'superadmin', to: '/admin/finance/financial-reports', label: 'Financial Reports', icon: <BarChart3 size={18} strokeWidth={SW} /> },

      { module: 'Assets', tier: 'erpOps', to: '/admin/assets', label: 'Assets', icon: <Package size={18} strokeWidth={SW} /> },

      { module: 'Procurement', tier: 'erpOps', to: '/admin/requisitions', label: 'Requisitions', icon: <Package size={18} strokeWidth={SW} /> },

      { module: 'Contracts', tier: 'erpOps', to: '/admin/contracts', label: 'Contracts', icon: <FileText size={18} strokeWidth={SW} /> },
      { module: 'Contracts', tier: 'erpOps', to: '/admin/documents', label: 'HR Documents', icon: <FileText size={18} strokeWidth={SW} /> },
      { module: 'Contracts', tier: 'erpOps', to: '/admin/document-templates', label: 'Document Templates', icon: <Layers size={18} strokeWidth={SW} /> },

      { module: 'Policies', tier: 'erpOps', to: '/admin/policies', label: 'Policies', icon: <ShieldCheck size={18} strokeWidth={SW} /> },

      { module: 'Ticketing', tier: 'admin', to: '/admin/tickets', label: 'Support Tickets', icon: <Ticket size={18} strokeWidth={SW} /> },
      { module: 'Ticketing', tier: 'admin', to: '/admin/ticket-categories', label: 'Ticket Categories', icon: <Layers size={18} strokeWidth={SW} /> },
      { module: 'Ticketing', tier: 'admin', to: '/admin/ticket-types', label: 'Ticket Types', icon: <Settings size={18} strokeWidth={SW} /> },
      { module: 'Ticketing', tier: 'admin', to: '/admin/approvals', label: 'Approvals', icon: <ClipboardCheck size={18} strokeWidth={SW} /> },

      { module: 'Monitoring', tier: 'erpOps', to: '/admin/monitoring', label: 'Monitoring', icon: <Monitor size={18} strokeWidth={SW} /> },
      { module: 'Monitoring', tier: 'admin', to: '/admin/download-app', label: 'Desktop App', icon: <Monitor size={18} strokeWidth={SW} /> },

      { module: 'My Workspace', tier: 'all', to: '/admin/timesheet', label: 'Timesheet', icon: <Clock size={18} strokeWidth={SW} /> },
      { module: 'My Workspace', tier: 'all', to: '/admin/my-salaries', label: 'My Salaries', icon: <Heart size={18} strokeWidth={SW} /> },
      { module: 'My Workspace', tier: 'all', to: '/chat', label: 'Messages', icon: <MessageSquare size={18} strokeWidth={SW} />, badge: chatUnreadCount },
      { module: 'My Workspace', tier: 'all', to: '/admin/settings', label: 'Settings', icon: <Settings size={18} strokeWidth={SW} /> },

      { module: 'Administration', tier: 'superadmin', to: '/admin/permissions', label: 'Access Control', icon: <Shield size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'superadmin', to: '/admin/desktop-management', label: 'Desktop Management', icon: <Monitor size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'all', to: '/admin/notifications', label: 'Notifications', icon: <BellIcon size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'admin', to: '/admin/webhooks', label: 'Webhooks', icon: <Webhook size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'admin', to: '/admin/report-builder', label: 'Report Builder', icon: <BarChart3 size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'superadmin', to: '/admin/reports-analytics', label: 'Reports', icon: <BarChart3 size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'superadmin', to: '/admin/email-logs', label: 'Email Logs', icon: <Mail size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'superadmin', to: '/admin/system-settings', label: 'System Settings', icon: <Settings size={18} strokeWidth={SW} /> },

      { module: 'Projects', tier: 'admin', to: '/admin/projects', label: 'Projects', icon: <FolderCheck size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/project-tracking', label: 'Project Tracking', icon: <Table2 size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/project-timeline', label: 'Timeline', icon: <CalendarDays size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/meetings', label: 'Meetings', icon: <Video size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/project-report', label: 'Project Report', icon: <BarChart3 size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/starred', label: 'Starred', icon: <Star size={18} strokeWidth={SW} /> },
    ];

    const hasErpOpsAccess = (route: string) => {
      const permission = ERP_OPS_ROUTE_PERMISSIONS[route];
      if (!permission) return false;
      return !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes(permission);
    };
    const tierVisible: Record<Exclude<Tier, 'erpOps'>, boolean> = { all: true, admin: isAdmin, executive: isExecutive, superadmin: isSuperAdmin };
    const visible = allItems.filter((item) => item.tier === 'erpOps' ? hasErpOpsAccess(item.to) : tierVisible[item.tier]);

    const groups: ModuleGroup[] = [];
    for (const module of MODULE_ORDER) {
      const items: SidebarLink[] = visible
        .filter((item) => item.module === module)
        .map(({ module: _m, tier: _t, ...rest }) => rest);
      if (items.length > 0) groups.push({ module, icon: MODULE_ICONS[module], items });
    }
    return groups;
  }, [role, myPerms, chatUnreadCount]);

  const [openModule, setOpenModule] = useState<ModuleName | null>(null);
  useEffect(() => {
    const active = moduleGroups.find((g) => g.items.some((item) => isItemActive(item, location.pathname)));
    if (active) setOpenModule(active.module);
  }, [location.pathname, moduleGroups]);

  const isAdmin = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.workspace.access');
  const isHrRole = role === USER_ROLES.HR;

  return (
    <div className={cn(
      'fixed left-0 top-0 z-110 w-[280px] h-screen flex flex-col bg-(--color-sidebar-bg) border-r border-white/10',
      isOpen !== undefined && !isOpen ? '-translate-x-full lg:translate-x-0' : '',
      'transition-transform duration-300'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={tekxaiLogo} alt="Tekxai" className="h-8 brightness-0 invert" />
          {(isAdmin || isHrRole) && (
            <span className="text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-2 py-1 rounded-lg">
              {isAdmin ? 'ERP' : 'HR'}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all lg:hidden">
            <X size={18} strokeWidth={SW} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
        {employeeLinks
          ? employeeLinks.map((link) => <NavItem key={link.to + link.label} link={link} />)
          : moduleGroups.map((group) => {
              if (group.items.length === 1) {
                const item = group.items[0];
                return <NavItem key={group.module} link={{ ...item, icon: group.icon, label: group.module }} />;
              }

              const isOpenGroup = openModule === group.module;
              const isGroupActive = group.items.some((item) => isItemActive(item, location.pathname));

              return (
                <div key={group.module}>
                  <button
                    onClick={() => setOpenModule(isOpenGroup ? null : group.module)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 group text-[13px] font-medium',
                      isGroupActive && !isOpenGroup
                        ? 'bg-blue-500/15 text-blue-300'
                        : 'text-(--color-sidebar-text) hover:bg-(--color-sidebar-hover) hover:text-white',
                    )}
                  >
                    <span className={cn('shrink-0 w-5 h-5 flex items-center justify-center transition-colors', isGroupActive && !isOpenGroup ? 'text-blue-300' : 'text-(--color-sidebar-icon) group-hover:text-slate-200')}>
                      {group.icon}
                    </span>
                    <span className="truncate flex-1 text-left">{group.module}</span>
                    <span className="shrink-0 text-slate-500">
                      {isOpenGroup ? <ChevronDown size={15} strokeWidth={SW} /> : <ChevronRight size={15} strokeWidth={SW} />}
                    </span>
                  </button>
                  {isOpenGroup && (
                    <div className="mt-0.5 ml-4 pl-3 border-l border-white/10 flex flex-col gap-0.5">
                      {group.items.map((item) => <NavItem key={item.to + item.label} link={item} />)}
                    </div>
                  )}
                </div>
              );
            })}
      </nav>
    </div>
  );
};

export default memo(Sidebar);
