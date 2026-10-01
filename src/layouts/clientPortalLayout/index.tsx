import React, { memo, Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  MessagesSquare,
  FileText,
  ArrowLeft,
  BookOpen,
  Landmark,
  MoreHorizontal,
  X,
  Home,
  Bell,
  User,
  Target,
  Table2,
  CalendarDays,
  Video,
  FileBarChart,
  Star,
  FolderCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { usePortalTopbarStore } from '@/stores/portalTopbarStore';
import { useMyPermissions } from '@/services/permissionsService';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { RoutePageSkeleton } from '@/components/skeletons';
import { getSocket } from '@/lib/socket';
import PortalSearch from './PortalSearch';
import ProfileWorkspaceMenu from '@/layouts/features/ProfileWorkspaceMenu';
import NotificationDropdown from '@/layouts/features/NotificationDropdown';
import { useNotifications } from '@/services/notificationService';
import ActionModal from '@/components/ui/ActionModal';

/** ERP Projects-module tools moved into the client portal (internals only). */
type PortalOpsNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** null = any internal with workspace access (membership-scoped pages). */
  permission: string | null;
};

const PORTAL_OPS_NAV: PortalOpsNavItem[] = [
  { to: '/portal/ops/goals', label: 'Goals / OKRs', icon: Target, permission: 'erp.projects.view' },
  { to: '/portal/ops/wiki', label: 'Wiki', icon: BookOpen, permission: 'erp.projects.view' },
  { to: '/portal/crm', label: 'Client CRM', icon: Landmark, permission: 'crm.clients.view' },
  { to: '/portal/ops/projects', label: 'Projects', icon: FolderCheck, permission: null },
  { to: '/portal/ops/project-tracking', label: 'Project Tracking', icon: Table2, permission: null },
  { to: '/portal/ops/project-timeline', label: 'Timeline', icon: CalendarDays, permission: null },
  { to: '/portal/ops/meetings', label: 'Meetings', icon: Video, permission: 'erp.meetings.view' },
  { to: '/portal/ops/projects-report', label: 'Projects Report', icon: FileBarChart, permission: 'erp.reports.view' },
  { to: '/portal/ops/starred', label: 'Starred', icon: Star, permission: null },
];

const CHATS_PAGE_SIZE = 10;
const CHATS_PAGE_INCREMENT = 5;

type SpaceProject = { id: string; title: string; status: string; client: { id: string; name: string } | null };
type Milestone = { id: string; title: string; status: string; progress_percent: number | null };
type MobileSheet = 'projects' | 'more' | null;

const PROJECT_STATUS_DOT: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-emerald-500',
  PENDING: 'bg-amber-500',
  ON_HOLD: 'bg-gray-400',
  CANCELLED: 'bg-red-400',
};

const MILESTONE_STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  BLOCKED: 'bg-red-50 text-red-600',
};

const MilestonesList: React.FC<{ projectId: string; onNavigate?: () => void }> = ({ projectId, onNavigate }) => {
  const navigate = useNavigate();
  const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
    queryKey: ['portal', 'projects', projectId, 'milestones', 'sidebar'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MILESTONES(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  if (isLoading) return <div className="pl-7 py-1.5 text-[11px] text-(--color-text-secondary)">Loading…</div>;
  if (milestones.length === 0) return <div className="pl-7 py-1.5 text-[11px] text-(--color-text-secondary)">No milestones yet.</div>;

  return (
    <div className="flex flex-col gap-0.5 pl-6 pr-1 pb-1">
      {milestones.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => {
            navigate(`/portal/projects/${projectId}/milestones`);
            onNavigate?.();
          }}
          className="flex items-center gap-1.5 px-2 min-h-11 rounded-md text-[12px] text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary) text-left w-full"
        >
          <span className="truncate flex-1">{m.title}</span>
          <span className={cn('shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', MILESTONE_STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-500')}>
            {(m.status || '').replace(/_/g, ' ')}
          </span>
        </button>
      ))}
    </div>
  );
};

const ProjectsPanel: React.FC<{
  isSuperAdmin: boolean;
  mode: 'projects' | 'chats';
  onNavigate?: () => void;
  opsNavItems?: PortalOpsNavItem[];
}> = ({ isSuperAdmin, mode, onNavigate, opsNavItems = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [openProjectIds, setOpenProjectIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(CHATS_PAGE_SIZE);
  const { data: projects = [] } = useQuery<SpaceProject[]>({
    queryKey: ['portal', 'projects', 'spaces'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    select: (r: any) => r?.payload?.records || [],
  });

  const { data: unreadCounts = {} } = useQuery<Record<string, { count: number; last_message_at: string | null }>>({
    queryKey: ['portal', 'unread-counts'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.UNREAD_COUNTS),
    select: (r: any) => r?.payload || {},
    enabled: mode === 'chats',
    refetchInterval: mode === 'chats' ? 15000 : false,
  });

  const label = mode === 'chats' ? 'Chats' : 'Projects';

  // #region agent log
  React.useEffect(() => {
    if (mode !== 'projects' || !opsNavItems.length) return;
    fetch('http://127.0.0.1:7689/ingest/5fe2d865-37c9-41e9-b868-d88ad2f9dbc6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d0293d'},body:JSON.stringify({sessionId:'d0293d',runId:'portal-ops-nav',hypothesisId:'H-nav',location:'clientPortalLayout:ProjectsPanel',message:'portal ops nav rendered',data:{opsCount:opsNavItems.length,labels:opsNavItems.map((i)=>i.label),path:location.pathname},timestamp:Date.now()})}).catch(()=>{});
  }, [mode, opsNavItems, location.pathname]);
  // #endregion

  useEffect(() => {
    if (mode !== 'chats') return;
    const socket = getSocket();
    if (!socket) return;
    const refreshUnread = () => queryClient.invalidateQueries({ queryKey: ['portal', 'unread-counts'] });
    socket.on('project:message:new', refreshUnread);
    return () => {
      socket.off('project:message:new', refreshUnread);
    };
  }, [mode, queryClient]);

  const sortedProjects = mode === 'chats'
    ? [...projects].sort((a, b) => {
        const unreadDiff = Number((unreadCounts[b.id]?.count || 0) > 0) - Number((unreadCounts[a.id]?.count || 0) > 0);
        if (unreadDiff !== 0) return unreadDiff;
        const aTime = unreadCounts[a.id]?.last_message_at ? new Date(unreadCounts[a.id]!.last_message_at!).getTime() : 0;
        const bTime = unreadCounts[b.id]?.last_message_at ? new Date(unreadCounts[b.id]!.last_message_at!).getTime() : 0;
        return bTime - aTime;
      })
    : projects;
  const visibleProjects = mode === 'chats' ? sortedProjects.slice(0, visibleCount) : sortedProjects;
  const hasMoreChats = mode === 'chats' && sortedProjects.length > visibleProjects.length;

  const toggleProject = (id: string) =>
    setOpenProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {mode === 'projects' && opsNavItems.length > 0 && (
        <nav className="flex flex-col gap-0.5 px-1 mb-3 pb-3 border-b border-(--color-border)">
          {opsNavItems.map(({ to, label: itemLabel, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onNavigate?.()}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 min-h-10 rounded-lg text-[13px] font-semibold transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary)'
                )
              }
            >
              <Icon size={16} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{itemLabel}</span>
            </NavLink>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between px-3 mb-1">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-(--color-text-secondary) hover:text-(--color-text-primary)"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {mode === 'projects' && opsNavItems.length > 0 ? 'My projects' : label}
        </button>
        <div className="flex items-center gap-0.5">
          {mode === 'projects' && (
            <button
              type="button"
              onClick={() => { navigate('/portal/projects'); onNavigate?.(); }}
              className="text-[10px] font-bold text-primary-600 hover:underline px-1"
            >
              View all
            </button>
          )}
          {isSuperAdmin && mode === 'projects' && (
            <button
              onClick={() => navigate('/admin/projects')}
              title="Create a new project"
              aria-label="Create a new project"
              className="h-11 w-11 flex items-center justify-center rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary)"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <nav className="flex flex-col gap-0.5 overflow-y-auto px-1 flex-1 min-h-0">
          {visibleProjects.length === 0 && (
            <span className="px-3 py-1.5 text-xs text-(--color-text-secondary)">No projects yet.</span>
          )}
          {visibleProjects.map((p) => {
            const displayName = p.client?.name ? `${p.client.name} - ${p.title}` : p.title;
            if (mode === 'chats') {
              const unreadCount = unreadCounts[p.id]?.count || 0;
              const hasUnread = unreadCount > 0;
              return (
                <NavLink
                  key={p.id}
                  to={`/portal/projects/${p.id}/communication`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-2.5 px-3 min-h-11 rounded-xl text-[14px] truncate transition-colors',
                      hasUnread ? 'bg-primary-50 font-black text-primary-800 ring-1 ring-inset ring-primary-100' : 'font-semibold text-(--color-text-secondary)',
                      isActive ? 'bg-emerald-50 text-emerald-700 ring-0' : 'hover:bg-(--color-state-hover)'
                    )
                  }
                  title={displayName}
                >
                  <MessagesSquare size={15} className={cn('shrink-0', hasUnread ? 'text-primary-600 opacity-100' : 'opacity-60')} />
                  <span className="truncate flex-1">{displayName}</span>
                  {hasUnread && (
                    <span className="shrink-0 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-primary-600 text-white text-[10px] font-black leading-none shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            }
            const isOpen = openProjectIds.has(p.id);
            return (
              <div key={p.id}>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => toggleProject(p.id)}
                    className="h-11 w-8 shrink-0 flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary)"
                    title={isOpen ? 'Hide milestones' : 'Show milestones'}
                  >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <NavLink
                    to={`/portal/projects/${p.id}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex-1 min-w-0 flex items-center gap-2.5 pl-1 pr-3 min-h-11 rounded-xl text-[14px] font-semibold truncate transition-colors',
                        isActive ? 'bg-emerald-50 text-emerald-700' : 'text-(--color-text-secondary) hover:bg-(--color-state-hover)'
                      )
                    }
                    title={displayName}
                  >
                    <span className={cn('h-2 w-2 rounded-full shrink-0', PROJECT_STATUS_DOT[p.status] || 'bg-gray-400')} />
                    <span className="truncate">{displayName}</span>
                  </NavLink>
                </div>
                {isOpen && <MilestonesList projectId={p.id} onNavigate={onNavigate} />}
              </div>
            );
          })}
        </nav>
      )}
      {expanded && hasMoreChats && (
        <button
          onClick={() => setVisibleCount((v) => v + CHATS_PAGE_INCREMENT)}
          className="mx-1 mt-0.5 px-3 h-10 rounded-xl text-[13px] font-bold text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary) text-left shrink-0"
        >
          View more ({sortedProjects.length - visibleProjects.length} more)
        </button>
      )}
    </div>
  );
};

const MobileSheetShell: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
    <button
      type="button"
      aria-label="Close"
      className="absolute inset-0 bg-black/40"
      onClick={onClose}
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="relative mt-auto flex flex-col max-h-[88dvh] rounded-t-2xl bg-(--color-surface) shadow-2xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-between px-4 h-14 border-b border-(--color-border) shrink-0">
        <span className="text-base font-black text-(--color-text-primary) tracking-tight">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-11 w-11 flex items-center justify-center rounded-full text-(--color-text-secondary) hover:bg-(--color-state-hover)"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto py-3 px-2">
        {children}
      </div>
    </div>
  </div>
);

const ClientPortalLayout: React.FC = memo(() => {
  const { role, user } = useAuth();
  const { data: myPerms } = useMyPermissions();
  const topbarTitle = usePortalTopbarStore((s) => s.title);
  const { userLogout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = role === 'SUPER_ADMIN' || !!myPerms?.is_super_admin;
  const isInternal = user?.user_type === 'INTERNAL';
  // Match ProtectedRoute + BE can('crm.clients.view'): super admin or granted role.
  const canViewCrm = isSuperAdmin || !!myPerms?.permissions?.includes('crm.clients.view');
  const opsNavItems = React.useMemo(() => {
    if (!isInternal) return [];
    return PORTAL_OPS_NAV.filter((item) => {
      if (!item.permission) return true;
      return isSuperAdmin || !!myPerms?.permissions?.includes(item.permission);
    });
  }, [isInternal, isSuperAdmin, myPerms?.permissions]);
  const [desktopPanel, setDesktopPanel] = useState<'projects' | null>(null);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const { data: notifData } = useNotifications(10);
  const unreadNotifs = notifData?.unread_count ?? 0;

  const { data: chatUnreadCounts = {} } = useQuery<Record<string, { count: number }>>({
    queryKey: ['portal', 'unread-counts'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.UNREAD_COUNTS),
    select: (r: any) => r?.payload || {},
    refetchInterval: 15000,
  });
  const totalChatUnread = Object.values(chatUnreadCounts).reduce((sum, row) => sum + (row?.count || 0), 0);

  // Project communication is full-bleed in the main pane; bottom tabs stay visible
  // so clients can jump Home / Chats / Projects without leaving the thread chrome.
  const isCommunicationFullBleed = /^\/portal\/projects\/[^/]+\/?$/.test(location.pathname)
    || /^\/portal\/projects\/[^/]+\/communication\/?$/.test(location.pathname);

  const routeTitle = (() => {
    const path = location.pathname;
    if (path === '/portal' || path === '/portal/') return 'Home';
    if (path.startsWith('/portal/chats')) return 'Chats';
    if (path.startsWith('/portal/notifications')) return 'Notifications';
    if (path.startsWith('/portal/profile')) return 'My Profile';
    if (path.startsWith('/portal/docs')) return 'Shared files';
    if (path.startsWith('/portal/ops/wiki')) return 'Wiki';
    if (path.startsWith('/portal/wiki')) return 'Wiki';
    if (path.startsWith('/portal/crm')) return 'Client CRM';
    if (path.startsWith('/portal/invites')) return 'Client CRM';
    if (path.startsWith('/portal/ops/goals')) return 'Goals / OKRs';
    if (path.startsWith('/portal/ops/project-tracking')) return 'Project Tracking';
    if (path.startsWith('/portal/ops/project-timeline')) return 'Timeline';
    if (path.startsWith('/portal/ops/meetings')) return 'Meetings';
    if (path.startsWith('/portal/ops/projects-report')) return 'Projects Report';
    if (path.startsWith('/portal/ops/starred')) return 'Starred';
    if (path.startsWith('/portal/ops/projects')) return 'Projects';
    if (path === '/portal/projects' || path === '/portal/projects/') return 'Projects';
    return null;
  })();
  const headerTitle = topbarTitle || routeTitle || 'Client Portal';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await userLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  const moreItems = [
    { to: '/portal/profile', label: 'My Profile', icon: User },
    { to: '/portal/notifications', label: 'Notifications', icon: Bell },
    { to: '/portal/docs', label: 'Shared files', icon: FileText },
    { to: '/portal/wiki', label: 'Wiki', icon: BookOpen },
    ...(canViewCrm ? [{ to: '/portal/crm', label: 'Client CRM', icon: Landmark }] : []),
  ];

  // Primary rail: Home, Files, Wiki, CRM — Projects browse is the
  // Chats/Projects panel toggles below (not a second "Projects" NavLink).
  const desktopNavItems = [
    { to: '/portal', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/portal/docs', label: 'Files', icon: FileText, end: false },
    { to: '/portal/wiki', label: 'Wiki', icon: BookOpen, end: false },
    ...(canViewCrm ? [{ to: '/portal/crm', label: 'CRM', icon: Landmark, end: false }] : []),
  ];

  const toggleDesktopPanel = (mode: 'projects') =>
    setDesktopPanel((p) => (p === mode ? null : mode));

  const closeMobileSheet = () => setMobileSheet(null);

  useEffect(() => {
    closeMobileSheet();
    setIsNotifOpen(false);
  }, [location.pathname]);

  const railItemClass = (active: boolean) =>
    cn(
      'relative flex items-center justify-center h-11 w-11 rounded-xl transition-colors',
      active ? 'bg-emerald-500 text-white' : 'text-emerald-300/80 hover:bg-white/10 hover:text-white'
    );

  const isHome = location.pathname === '/portal' || location.pathname === '/portal/';
  const isProjectsRoute = location.pathname.startsWith('/portal/projects') || location.pathname.startsWith('/portal/ops');
  const isChatsRoute = location.pathname === '/portal/chats' || location.pathname.startsWith('/portal/chats/');

  // Keep the Projects tools panel open while browsing moved ops pages.
  useEffect(() => {
    if (location.pathname.startsWith('/portal/ops') || location.pathname.startsWith('/portal/crm')) {
      setDesktopPanel('projects');
    }
  }, [location.pathname]);

  return (
    <div className="min-h-dvh flex bg-(--color-app-bg)">
      {/* Desktop icon rail */}
      <aside className="hidden lg:flex flex-col items-center w-[72px] shrink-0 bg-emerald-950 pt-5 pb-4">
        <div className="flex flex-col items-center gap-0.5 px-1 mb-1">
          <div className="h-10 w-10 rounded-xl bg-white text-emerald-800 flex items-center justify-center font-black text-sm tracking-tight shadow-sm">
            TX
          </div>
          <span className="text-[9px] font-black tracking-[0.12em] text-white uppercase">TekXAI</span>
        </div>

        <div className="w-full h-px bg-white/10 my-4" />

        <nav className="flex flex-col items-center gap-2.5 w-full px-2">
          {desktopNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setDesktopPanel(null)}
              className="flex flex-col items-center gap-1 w-full py-1"
              title={label}
            >
              {({ isActive }) => (
                <>
                  <span className={railItemClass(isActive)}>
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span className={cn('text-[10px] font-semibold', isActive ? 'text-white' : 'text-emerald-300/70')}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <NavLink
            to="/portal/chats"
            onClick={() => setDesktopPanel(null)}
            title="Project messaging"
            className="flex flex-col items-center gap-1 w-full py-1"
          >
            {({ isActive }) => (
              <>
                <span className={railItemClass(isActive || isChatsRoute)}>
                  <MessagesSquare size={18} strokeWidth={2} />
                  {totalChatUnread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black leading-none">
                      {totalChatUnread > 9 ? '9+' : totalChatUnread}
                    </span>
                  )}
                </span>
                <span className={cn('text-[10px] font-semibold', isActive || isChatsRoute ? 'text-white' : 'text-emerald-300/70')}>
                  Chats
                </span>
              </>
            )}
          </NavLink>
          <button
            type="button"
            onClick={() => toggleDesktopPanel('projects')}
            title="Browse projects"
            className="flex flex-col items-center gap-1 w-full py-1"
          >
            <span className={railItemClass(desktopPanel === 'projects' || isProjectsRoute)}>
              <FolderKanban size={18} strokeWidth={2} />
            </span>
            <span className={cn('text-[10px] font-semibold', desktopPanel === 'projects' || isProjectsRoute ? 'text-white' : 'text-emerald-300/70')}>
              Projects
            </span>
          </button>
        </nav>

        <div className="mt-auto w-full px-2">
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            title="Sign out"
            className="flex flex-col items-center gap-1 w-full py-1"
          >
            <span className={railItemClass(false)}>
              <LogOut size={18} strokeWidth={2} />
            </span>
            <span className="text-[10px] font-semibold text-emerald-300/70">Log out</span>
          </button>
        </div>
      </aside>

      {desktopPanel && (
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-(--color-border) bg-(--color-surface) py-4 px-3 min-h-0">
          <div className="px-1 mb-4">
            <span className="text-base font-black text-(--color-text-primary) tracking-tight">
              Projects
            </span>
          </div>
          <ProjectsPanel isSuperAdmin={isSuperAdmin} mode="projects" opsNavItems={opsNavItems} />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header
          className={cn(
            'shrink-0 border-b border-(--color-border) bg-(--color-surface) flex items-center justify-between gap-2 min-w-0',
            'h-12 px-3 lg:h-16 lg:px-8 lg:gap-4',
            'pt-[env(safe-area-inset-top)]'
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 lg:max-w-[40%] lg:flex-none lg:gap-3">
            {(topbarTitle || (!isHome && routeTitle)) && (
              <button
                type="button"
                onClick={() => navigate('/portal')}
                className="shrink-0 h-11 w-11 lg:h-9 lg:w-9 flex items-center justify-center rounded-full text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-primary-600"
                title="Back to Home"
                aria-label="Back to Home"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            {!topbarTitle && isHome && (
              <div className="flex items-center gap-2 shrink-0 lg:hidden">
                <div className="h-8 w-8 rounded-lg bg-emerald-950 text-white flex items-center justify-center font-black text-[11px] tracking-tight">
                  TX
                </div>
                <span className="text-sm font-black text-emerald-900 tracking-tight">TekXAI</span>
              </div>
            )}
            <span className="text-[15px] lg:text-base font-black text-(--color-text-primary) truncate">{headerTitle}</span>
          </div>
          <div className="flex-1 min-w-0 flex justify-end lg:justify-center">
            <PortalSearch />
          </div>
          <div className="flex items-center gap-1.5 lg:gap-3 shrink-0">
            <div className="relative">
              <button
                ref={notifBtnRef}
                type="button"
                onClick={() => setIsNotifOpen((v) => !v)}
                aria-label="Notifications"
                aria-expanded={isNotifOpen}
                className="relative h-11 w-11 flex items-center justify-center rounded-xl text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-primary-600 transition-colors"
              >
                <Bell size={18} />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black border-2 border-(--color-surface)">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
              <NotificationDropdown
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                triggerRef={notifBtnRef}
                sheetTopClassName="top-[calc(3rem+env(safe-area-inset-top))]"
              />
            </div>
            <ProfileWorkspaceMenu profileTo="/portal/profile" />
          </div>
        </header>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          <div
            className={cn(
              isCommunicationFullBleed
                ? 'py-0 lg:py-0 px-0 max-w-none w-full h-full'
                : 'p-4 pb-24 lg:p-8 lg:pb-8 max-w-[1400px] mx-auto'
            )}
          >
            <Suspense fallback={<RoutePageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around border-t border-(--color-border) bg-(--color-surface)/95 backdrop-blur-md shrink-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <NavLink
              to="/portal"
              end
              onClick={closeMobileSheet}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-bold',
                  isActive && !mobileSheet ? 'text-emerald-600' : 'text-(--color-text-secondary)'
                )
              }
            >
              <Home size={20} strokeWidth={isHome && !mobileSheet ? 2.4 : 2} />
              Home
            </NavLink>
            <NavLink
              to="/portal/chats"
              onClick={closeMobileSheet}
              className={({ isActive }) =>
                cn(
                  'relative flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-bold',
                  isActive ? 'text-emerald-600' : 'text-(--color-text-secondary)'
                )
              }
            >
              <span className="relative inline-flex">
                <MessagesSquare size={20} strokeWidth={isChatsRoute ? 2.4 : 2} />
                {totalChatUnread > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black">
                    {totalChatUnread > 9 ? '9+' : totalChatUnread}
                  </span>
                )}
              </span>
              Chats
            </NavLink>
            <button
              type="button"
              onClick={() => setMobileSheet((s) => (s === 'projects' ? null : 'projects'))}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-bold',
                mobileSheet === 'projects' || isProjectsRoute ? 'text-emerald-600' : 'text-(--color-text-secondary)'
              )}
            >
              <FolderKanban size={20} strokeWidth={mobileSheet === 'projects' || isProjectsRoute ? 2.4 : 2} />
              Projects
            </button>
            <button
              type="button"
              onClick={() => setMobileSheet((s) => (s === 'more' ? null : 'more'))}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-bold',
                mobileSheet === 'more' ? 'text-emerald-600' : 'text-(--color-text-secondary)'
              )}
            >
              <MoreHorizontal size={20} strokeWidth={mobileSheet === 'more' ? 2.4 : 2} />
              More
            </button>
          </nav>
      </div>

      {mobileSheet === 'projects' && (
        <MobileSheetShell title="Projects" onClose={closeMobileSheet}>
          <ProjectsPanel isSuperAdmin={isSuperAdmin} mode="projects" opsNavItems={opsNavItems} onNavigate={closeMobileSheet} />
        </MobileSheetShell>
      )}
      {mobileSheet === 'more' && (
        <MobileSheetShell title="More" onClose={closeMobileSheet}>
          <div className="flex flex-col gap-1 px-1">
            {moreItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={closeMobileSheet}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 min-h-12 rounded-xl text-[15px] font-semibold transition-colors',
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-(--color-text-primary) hover:bg-(--color-state-hover)'
                  )
                }
              >
                <Icon size={18} className="text-(--color-text-secondary)" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => { closeMobileSheet(); setIsLogoutModalOpen(true); }}
              className="flex items-center gap-3 px-3 min-h-12 rounded-xl text-[15px] font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </MobileSheetShell>
      )}

      <ActionModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        loading={isLoggingOut}
        title="Sign Out"
        description="Are you sure you want to sign out? You will need to log in again to access the portal."
        confirmText="Sign Out"
        icon="logout"
      />
    </div>
  );
});

export default ClientPortalLayout;
