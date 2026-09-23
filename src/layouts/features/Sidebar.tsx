import React, { useMemo, useState, useEffect, memo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users2, Settings, FolderCheck, Clock, Star, Monitor, X,
  BarChart3, Shield, ClipboardCheck, Ticket, Receipt, Banknote, Webhook, Mail,
  MessageSquare, FileText, Package, CalendarDays, Table2, Layers, Video, Gauge,
  Building2, TrendingUp, UserPlus, ShieldCheck, Briefcase, Heart, AlarmClock,
  UserSearch, PlusCircle, Tag, Network, Landmark, ChevronDown, ChevronRight,
  Bell as BellIcon, UserMinus, ListChecks, PanelLeftClose, PanelLeftOpen, FileBarChart,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { useMyPermissions } from '@/services/permissionsService';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useResponsive } from '@/hooks/useResponsive';

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
  '/admin/performance-reviews': 'hr.performance_reviews.view',
  '/admin/job-requisitions': 'hr.job_requisitions.view',
  '/admin/onboarding': 'hr.onboarding.view',
  '/admin/offboarding': 'hr.offboarding.view',
  '/admin/attendance': 'erp.attendance.view',
  '/admin/overtime': 'erp.overtime.view',
  '/admin/employee-timesheets': 'erp.timesheet.view',
  '/admin/performance': 'erp.performance.view',
  '/admin/performance-scoring': 'erp.performance.view',
  '/admin/manager-review': 'erp.performance.view',
  '/admin/increments': 'hr.increments.view',
  '/admin/assets': 'erp.assets.view',
  '/admin/requisitions': 'erp.requisitions.view',
  '/admin/contracts': 'hr.contracts.view',
  '/admin/documents': 'erp.hr_documents.view',
  '/admin/document-templates': 'erp.hr_documents.view',
  '/admin/nda': 'erp.hr_documents.manage',
  '/admin/client-nda': 'crm.client_documents.manage',
  '/admin/policies': 'hr.policies.view',
  '/admin/monitoring': 'erp.monitoring.view',
  '/admin/team': 'erp.teams.view',
  '/admin/compliance-violations': 'erp.compliance_violations.manage',
  '/admin/payroll': 'erp.payroll.view',
  '/admin/finance/expenses': 'erp.expenses.view',
  '/admin/tickets': 'erp.tickets.view',
  '/admin/ticket-categories': 'erp.ticket-categories.view',
  '/admin/ticket-types': 'erp.ticket-types.view',
  '/admin/approvals': 'erp.requisitions.approve',
  '/admin/webhooks': 'erp.webhooks.manage',
  '/admin/report-builder': 'erp.reports.view',
  '/admin/projects': 'erp.projects.view',
  '/admin/project-tracking': 'erp.projects.view',
  '/admin/project-timeline': 'erp.projects.view',
  '/admin/meetings': 'erp.meetings.view',
  '/admin/projects-report': 'erp.reports.view',
  '/admin/starred': 'erp.projects.view',
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

const NavItem: React.FC<{ link: SidebarLink; collapsed?: boolean; onNavigate?: () => void }> = ({
  link,
  collapsed,
  onNavigate,
}) => (
  <NavLink
    to={link.to}
    end={link.end}
    title={collapsed ? link.label : undefined}
    onClick={onNavigate}
    className={({ isActive }) =>
      cn(
        'relative flex items-center rounded-xl transition-all duration-200 group text-[13px] font-medium',
        collapsed ? 'justify-center w-10 h-10 mx-auto px-0' : 'gap-3 px-3.5 py-2.5',
        isActive
          ? 'bg-[color-mix(in_srgb,var(--color-sidebar-active)_42%,transparent)] text-white'
          : 'text-(--color-sidebar-text)/90 hover:bg-(--color-sidebar-hover) hover:text-white',
      )
    }
  >
    {({ isActive }) => (
      <>
        <span
          className={cn(
            'shrink-0 w-5 h-5 flex items-center justify-center transition-colors',
            isActive ? 'text-white' : 'text-(--color-sidebar-icon)/80 group-hover:text-white',
          )}
        >
          {link.icon}
        </span>
        {!collapsed && <span className="truncate flex-1">{link.label}</span>}
        {!!link.badge && !collapsed && (
          <span
            className={cn(
              'shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center',
              isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white',
            )}
          >
            {link.badge > 99 ? '99+' : link.badge}
          </span>
        )}
        {!!link.badge && collapsed && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-(--color-sidebar-bg)" />
        )}
      </>
    )}
  </NavLink>
);

const NavSectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <p className="px-3.5 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
    {label}
  </p>
);

type EmployeeNavSection = { label: string; links: SidebarLink[] };

const Sidebar: React.FC<SidebarProps> = ({ onClose, isOpen }) => {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: myPerms } = useMyPermissions();
  const chatUnreadCount = useChatUnreadCount();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);
  const { width } = useResponsive();
  const isRail = collapsed && width >= 1024;

  useEffect(() => {
    setCollapsed(useSidebarStore.getState().collapsed);
  }, [setCollapsed]);

  const isAdminWorkspace =
    !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.workspace.access');

  const employeeSections: EmployeeNavSection[] | null = useMemo(() => {
    const onEmployeeRoutes = location.pathname.startsWith('/employee');
    const onChatAsEmployee = location.pathname.startsWith('/chat') && !isAdminWorkspace;
    if (!onEmployeeRoutes && !onChatAsEmployee) return null;

    const isSuperAdmin = !!myPerms?.is_super_admin;
    const canSeeEmployeeProjects = isSuperAdmin || !!myPerms?.permissions?.includes('erp.employee_projects.view');
    const canSeeStarredQueries = isSuperAdmin || !!myPerms?.permissions?.includes('erp.starred_queries.view');
    const canSeeMyDocuments = isSuperAdmin || !!myPerms?.permissions?.includes('erp.my_documents.view');
    // A separate "Policies" link only for someone who can view Policies but
    // was NOT also granted My Documents — that page already has a Company
    // Policies section covering the same data, so showing both would be a
    // duplicate route to the same content for anyone with both permissions.
    const canSeePoliciesStandalone = !canSeeMyDocuments && (isSuperAdmin
      || !!myPerms?.permissions?.includes('hr.policies.view')
      || !!myPerms?.permissions?.includes('hr.policies.manage'));

    const work: SidebarLink[] = [
      { to: '/employee', label: 'Home', icon: <Home size={18} strokeWidth={SW} />, end: true },
      ...(canSeeEmployeeProjects
        ? [{ to: '/employee/projects', label: 'Projects', icon: <FolderCheck size={18} strokeWidth={SW} /> }]
        : []),
      ...(canSeeStarredQueries
        ? [{ to: '/employee/starred', label: 'Starred Queries', icon: <Star size={18} strokeWidth={SW} /> }]
        : []),
      { to: '/employee/timesheet', label: 'Timesheet', icon: <Clock size={18} strokeWidth={SW} /> },
      { to: '/employee/daily-report', label: 'Daily Report', icon: <ClipboardCheck size={18} strokeWidth={SW} /> },
      { to: '/employee/requisitions', label: 'Requisitions', icon: <Package size={18} strokeWidth={SW} /> },
    ];

    const support: SidebarLink[] = [
      { to: '/employee/tickets', label: 'Support Tickets', icon: <Ticket size={18} strokeWidth={SW} /> },
      { to: '/chat', label: 'Messages', icon: <MessageSquare size={18} strokeWidth={SW} />, badge: chatUnreadCount },
      ...(canSeeMyDocuments
        ? [{ to: '/employee/documents', label: 'My Documents', icon: <FileText size={18} strokeWidth={SW} /> }]
        : []),
      ...(canSeePoliciesStandalone
        ? [{ to: '/employee/policies', label: 'Policies', icon: <ShieldCheck size={18} strokeWidth={SW} /> }]
        : []),
      ...(isSuperAdmin
        ? [{ to: '/employee/onboarding', label: 'My Onboarding', icon: <ListChecks size={18} strokeWidth={SW} /> }]
        : []),
    ];

    const account: SidebarLink[] = [
      { to: '/employee/download-app', label: 'Desktop App', icon: <Monitor size={18} strokeWidth={SW} /> },
      { to: '/employee/settings', label: 'Settings', icon: <Settings size={18} strokeWidth={SW} /> },
    ];

    return [
      { label: 'Work', links: work },
      { label: 'Support', links: support },
      { label: 'Account', links: account },
    ];
  }, [role, myPerms, chatUnreadCount, location.pathname, isAdminWorkspace]);

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
      { module: 'Workforce', tier: 'erpOps', to: '/admin/team', label: 'Teams', icon: <Users2 size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/designations', label: 'Designations', icon: <Tag size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/grades', label: 'Grades', icon: <TrendingUp size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/org-chart', label: 'Org Chart', icon: <Network size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/job-descriptions', label: 'Job Descriptions', icon: <Briefcase size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/hr-reports', label: 'HR Reports', icon: <BarChart3 size={18} strokeWidth={SW} /> },
      { module: 'Workforce', tier: 'erpOps', to: '/admin/performance-reviews', label: 'Performance Reviews', icon: <ClipboardCheck size={18} strokeWidth={SW} /> },

      { module: 'Recruitment', tier: 'erpOps', to: '/admin/job-requisitions', label: 'Job Requisitions', icon: <ClipboardCheck size={18} strokeWidth={SW} /> },
      { module: 'Recruitment', tier: 'erpOps', to: '/admin/onboarding', label: 'Hiring & Onboarding', icon: <UserPlus size={18} strokeWidth={SW} /> },
      { module: 'Recruitment', tier: 'erpOps', to: '/admin/offboarding', label: 'Offboarding', icon: <UserMinus size={18} strokeWidth={SW} /> },

      { module: 'Attendance', tier: 'erpOps', to: '/admin/attendance', label: 'Attendance', icon: <Clock size={18} strokeWidth={SW} /> },
      { module: 'Attendance', tier: 'erpOps', to: '/admin/overtime', label: 'Overtime', icon: <AlarmClock size={18} strokeWidth={SW} /> },
      { module: 'Attendance', tier: 'erpOps', to: '/admin/employee-timesheets', label: 'Employee Timesheets', icon: <Clock size={18} strokeWidth={SW} /> },
      { module: 'Attendance', tier: 'erpOps', to: '/admin/manager-review', label: 'Manager Review', icon: <ClipboardCheck size={18} strokeWidth={SW} /> },
      { module: 'Attendance', tier: 'erpOps', to: '/admin/compliance-violations', label: 'Compliance Violations', icon: <AlarmClock size={18} strokeWidth={SW} /> },

      { module: 'Performance', tier: 'erpOps', to: '/admin/performance', label: 'Performance', icon: <TrendingUp size={18} strokeWidth={SW} /> },
      { module: 'Performance', tier: 'erpOps', to: '/admin/performance-scoring', label: 'Performance Scoring', icon: <TrendingUp size={18} strokeWidth={SW} /> },

      { module: 'Payroll', tier: 'erpOps', to: '/admin/increments', label: 'Increments', icon: <TrendingUp size={18} strokeWidth={SW} /> },
      { module: 'Payroll', tier: 'erpOps', to: '/admin/payroll', label: 'Payroll', icon: <Banknote size={18} strokeWidth={SW} /> },

      { module: 'Finance', tier: 'erpOps', to: '/admin/finance/expenses', label: 'Expense Claims', icon: <Receipt size={18} strokeWidth={SW} /> },
      { module: 'Finance', tier: 'superadmin', to: '/admin/finance/financial-reports', label: 'Financial Reports', icon: <BarChart3 size={18} strokeWidth={SW} /> },

      { module: 'Assets', tier: 'erpOps', to: '/admin/assets', label: 'Assets', icon: <Package size={18} strokeWidth={SW} /> },

      { module: 'Procurement', tier: 'erpOps', to: '/admin/requisitions', label: 'Requisitions', icon: <Package size={18} strokeWidth={SW} /> },

      { module: 'Contracts', tier: 'erpOps', to: '/admin/contracts', label: 'Contracts', icon: <FileText size={18} strokeWidth={SW} /> },
      { module: 'Contracts', tier: 'erpOps', to: '/admin/documents', label: 'HR Documents', icon: <FileText size={18} strokeWidth={SW} /> },
      { module: 'Contracts', tier: 'erpOps', to: '/admin/document-templates', label: 'Document Templates', icon: <Layers size={18} strokeWidth={SW} /> },
      { module: 'Contracts', tier: 'erpOps', to: '/admin/nda', label: 'Employee NDA', icon: <FileText size={18} strokeWidth={SW} /> },
      { module: 'Contracts', tier: 'erpOps', to: '/admin/client-nda', label: 'Client NDA', icon: <FileText size={18} strokeWidth={SW} /> },

      { module: 'Policies', tier: 'erpOps', to: '/admin/policies', label: 'Policies', icon: <ShieldCheck size={18} strokeWidth={SW} /> },

      { module: 'Ticketing', tier: 'erpOps', to: '/admin/tickets', label: 'Support Tickets', icon: <Ticket size={18} strokeWidth={SW} /> },
      { module: 'Ticketing', tier: 'erpOps', to: '/admin/ticket-categories', label: 'Ticket Categories', icon: <Layers size={18} strokeWidth={SW} /> },
      { module: 'Ticketing', tier: 'erpOps', to: '/admin/ticket-types', label: 'Ticket Types', icon: <Settings size={18} strokeWidth={SW} /> },
      { module: 'Ticketing', tier: 'erpOps', to: '/admin/approvals', label: 'Approvals', icon: <ClipboardCheck size={18} strokeWidth={SW} /> },

      { module: 'Monitoring', tier: 'erpOps', to: '/admin/monitoring', label: 'Monitoring', icon: <Monitor size={18} strokeWidth={SW} /> },
      { module: 'Monitoring', tier: 'admin', to: '/admin/download-app', label: 'Desktop App', icon: <Monitor size={18} strokeWidth={SW} /> },

      { module: 'My Workspace', tier: 'all', to: '/admin/timesheet', label: 'Timesheet', icon: <Clock size={18} strokeWidth={SW} /> },
      { module: 'My Workspace', tier: 'all', to: '/admin/my-salaries', label: 'My Salaries', icon: <Heart size={18} strokeWidth={SW} /> },
      { module: 'My Workspace', tier: 'all', to: '/chat', label: 'Messages', icon: <MessageSquare size={18} strokeWidth={SW} />, badge: chatUnreadCount },
      { module: 'My Workspace', tier: 'all', to: '/admin/settings', label: 'Settings', icon: <Settings size={18} strokeWidth={SW} /> },

      { module: 'Administration', tier: 'superadmin', to: '/admin/permissions', label: 'Access Control', icon: <Shield size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'superadmin', to: '/admin/desktop-management', label: 'Desktop Management', icon: <Monitor size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'all', to: '/admin/notifications', label: 'Notifications', icon: <BellIcon size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'erpOps', to: '/admin/webhooks', label: 'Webhooks', icon: <Webhook size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'erpOps', to: '/admin/report-builder', label: 'Report Builder', icon: <BarChart3 size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'superadmin', to: '/admin/reports-analytics', label: 'Reports', icon: <BarChart3 size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'superadmin', to: '/admin/email-logs', label: 'Email Logs', icon: <Mail size={18} strokeWidth={SW} /> },
      { module: 'Administration', tier: 'superadmin', to: '/admin/system-settings', label: 'System Settings', icon: <Settings size={18} strokeWidth={SW} /> },

      { module: 'Projects', tier: 'admin', to: '/admin/projects', label: 'Projects', icon: <FolderCheck size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/project-tracking', label: 'Project Tracking', icon: <Table2 size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/project-timeline', label: 'Timeline', icon: <CalendarDays size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/meetings', label: 'Meetings', icon: <Video size={18} strokeWidth={SW} /> },
      { module: 'Projects', tier: 'admin', to: '/admin/projects-report', label: 'Projects Report', icon: <FileBarChart size={18} strokeWidth={SW} /> },
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

  const handleNavigate = () => onClose?.();

  const handleGroupClick = (group: ModuleGroup, isOpenGroup: boolean) => {
    if (isRail) {
      if (group.items.length === 1) {
        navigate(group.items[0].to);
        onClose?.();
        return;
      }
      setCollapsed(false);
      setOpenModule(group.module);
      return;
    }
    setOpenModule(isOpenGroup ? null : group.module);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-110 h-screen flex flex-col overflow-hidden',
        'w-[280px] lg:w-sidebar',
        'bg-(--color-sidebar-bg) border-r border-white/[0.08]',
        'shadow-[8px_0_32px_-14px_rgba(0,0,0,0.55)]',
        'transition-[width,transform] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]',
        isOpen !== undefined && !isOpen ? '-translate-x-full lg:translate-x-0' : '',
      )}
    >
      {/* Soft blue depth on the same shade family */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--color-sidebar-active) 28%, var(--color-sidebar-bg)) 0%,
              var(--color-sidebar-bg) 48%,
              color-mix(in srgb, #020b1a 28%, var(--color-sidebar-bg)) 100%
            )
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-[-30%] h-64 w-[160%] opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at center, color-mix(in srgb, var(--color-sidebar-active) 45%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-[-40%] h-72 w-72 opacity-40"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-sidebar-active) 40%, transparent) 0%, transparent 70%)',
        }}
      />

      <div
        className={cn(
          'relative shrink-0 h-topbar',
          'bg-gradient-to-b from-white/[0.06] to-transparent',
          'flex items-center justify-center',
          isRail ? 'px-2' : 'px-4',
        )}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-all lg:hidden z-10"
            aria-label="Close sidebar"
          >
            <X size={18} strokeWidth={SW} />
          </button>
        )}

        <div className={cn('flex items-center justify-center', isRail ? 'gap-0' : 'gap-2.5')}>
          <img
            src={tekxaiLogo}
            alt="Tekxai"
            className={cn('brightness-0 invert object-contain', isRail ? 'h-5 w-5' : 'h-7 w-auto max-w-[130px]')}
          />
        </div>
      </div>

      <nav
        className={cn(
          'relative flex-1 overflow-y-auto overflow-x-hidden py-2 flex flex-col gap-0.5',
          'scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent',
          isRail ? 'px-1.5' : 'px-3',
        )}
      >
        {employeeSections
          ? employeeSections.map((section) => (
              <div key={section.label} className="flex flex-col gap-0.5">
                {!isRail && <NavSectionLabel label={section.label} />}
                {isRail && section.label !== 'Work' && (
                  <div className="mx-auto my-1.5 h-px w-6 bg-white/10" aria-hidden />
                )}
                {section.links.map((link) => (
                  <NavItem key={link.to + link.label} link={link} collapsed={isRail} onNavigate={handleNavigate} />
                ))}
              </div>
            ))
          : moduleGroups.map((group) => {
              if (group.items.length === 1) {
                const item = group.items[0];
                return (
                  <NavItem
                    key={group.module}
                    link={{ ...item, icon: group.icon, label: group.module }}
                    collapsed={isRail}
                    onNavigate={handleNavigate}
                  />
                );
              }

              const isOpenGroup = openModule === group.module;
              const isGroupActive = group.items.some((item) => isItemActive(item, location.pathname));

              return (
                <div key={group.module}>
                  <button
                    type="button"
                    title={isRail ? group.module : undefined}
                    onClick={() => handleGroupClick(group, isOpenGroup)}
                    className={cn(
                      'relative w-full flex items-center rounded-xl transition-all duration-200 group text-[13px] font-medium',
                      isRail ? 'justify-center w-10 h-10 mx-auto px-0' : 'gap-3 px-3.5 py-2.5',
                      isGroupActive && !isOpenGroup
                        ? 'bg-[color-mix(in_srgb,var(--color-sidebar-active)_42%,transparent)] text-white'
                        : 'text-(--color-sidebar-text)/90 hover:bg-(--color-sidebar-hover) hover:text-white',
                    )}
                  >
                    <span
                      className={cn(
                        'shrink-0 w-5 h-5 flex items-center justify-center transition-colors',
                        isGroupActive && !isOpenGroup
                          ? 'text-white'
                          : 'text-(--color-sidebar-icon)/80 group-hover:text-white',
                      )}
                    >
                      {group.icon}
                    </span>
                    {!isRail && (
                      <>
                        <span className="truncate flex-1 text-left">{group.module}</span>
                        <span className="shrink-0 text-white/50">
                          {isOpenGroup ? <ChevronDown size={15} strokeWidth={SW} /> : <ChevronRight size={15} strokeWidth={SW} />}
                        </span>
                      </>
                    )}
                  </button>
                  {!isRail && isOpenGroup && (
                    <div className="mt-0.5 ml-3.5 pl-3 border-l border-white/10 flex flex-col gap-0.5">
                      {group.items.map((item) => (
                        <NavItem key={item.to + item.label} link={item} onNavigate={handleNavigate} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
      </nav>

      <div
        className={cn(
          'relative shrink-0 border-t border-white/[0.08]',
          'bg-[color-mix(in_srgb,var(--color-sidebar-active)_12%,transparent)]',
          isRail ? 'p-2' : 'p-3',
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'hidden lg:flex items-center rounded-xl transition-all duration-200',
            'text-(--color-sidebar-text)/90 hover:bg-(--color-sidebar-hover) hover:text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
            isRail ? 'justify-center w-10 h-10 mx-auto' : 'w-full gap-3 px-3.5 py-2.5 text-[13px] font-medium',
          )}
        >
          {isRail ? (
            <PanelLeftOpen size={18} strokeWidth={SW} className="text-(--color-sidebar-icon)/80" />
          ) : (
            <>
              <PanelLeftClose size={18} strokeWidth={SW} className="text-(--color-sidebar-icon)/80" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default memo(Sidebar);
