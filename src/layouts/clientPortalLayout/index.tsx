import React, { memo, Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  Boxes,
  MessageCircle,
  FileText,
  ArrowLeft,
  BookOpen,
  MoreHorizontal,
  X,
  Home,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { usePortalTopbarStore } from '@/stores/portalTopbarStore';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { RoutePageSkeleton } from '@/components/skeletons';
import { getSocket } from '@/lib/socket';
import PortalSearch from './PortalSearch';
import ProfileWorkspaceMenu from '@/layouts/features/ProfileWorkspaceMenu';

const CHATS_PAGE_SIZE = 10;
const CHATS_PAGE_INCREMENT = 5;

type SpaceProject = { id: string; title: string; status: string; client: { id: string; name: string } | null };
type Milestone = { id: string; title: string; status: string; progress_percent: number | null };
type MobileSheet = 'chats' | 'spaces' | 'more' | null;

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

const MilestonesList: React.FC<{ projectId: string }> = ({ projectId }) => {
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
        <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-(--color-text-secondary)">
          <span className="truncate flex-1">{m.title}</span>
          <span className={cn('shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', MILESTONE_STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-500')}>
            {(m.status || '').replace(/_/g, ' ')}
          </span>
        </div>
      ))}
    </div>
  );
};

const ProjectsPanel: React.FC<{
  isSuperAdmin: boolean;
  mode: 'spaces' | 'chats';
  onNavigate?: () => void;
}> = ({ isSuperAdmin, mode, onNavigate }) => {
  const navigate = useNavigate();
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

  const label = mode === 'chats' ? 'Chats' : 'Spaces';

  useEffect(() => {
    if (mode !== 'chats') return;
    const socket = getSocket();
    if (!socket) return;
    const refreshUnread = () => queryClient.invalidateQueries({ queryKey: ['portal', 'unread-counts'] });
    socket.on('project:message:new', refreshUnread);
    return () => socket.off('project:message:new', refreshUnread);
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
      <div className="flex items-center justify-between px-3 mb-1">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-(--color-text-secondary) hover:text-(--color-text-primary)"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {label}
        </button>
        {isSuperAdmin && mode === 'spaces' && (
          <button
            onClick={() => navigate('/admin/projects')}
            title="Create a new project"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary)"
          >
            <Plus size={16} />
          </button>
        )}
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
                  <MessageCircle size={15} className={cn('shrink-0', hasUnread ? 'text-primary-600 opacity-100' : 'opacity-60')} />
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
                {isOpen && <MilestonesList projectId={p.id} />}
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
    <div className="relative mt-auto flex flex-col max-h-[88dvh] rounded-t-2xl bg-(--color-surface) shadow-2xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between px-4 h-14 border-b border-(--color-border) shrink-0">
        <span className="text-base font-black text-(--color-text-primary) tracking-tight">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="h-9 w-9 flex items-center justify-center rounded-full text-(--color-text-secondary) hover:bg-(--color-state-hover)"
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
  const { user, role } = useAuth();
  const topbarTitle = usePortalTopbarStore((s) => s.title);
  const { userLogout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [desktopPanel, setDesktopPanel] = useState<'spaces' | 'chats' | null>(null);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);

  // Project communication is full-bleed; on mobile ClickUp hides the tab bar
  // while you're deep in a chat thread so the composer can sit at the bottom.
  const isCommunicationFullBleed = /^\/portal\/projects\/[^/]+\/?$/.test(location.pathname)
    || /^\/portal\/projects\/[^/]+\/communication\/?$/.test(location.pathname);
  const hideMobileTabBar = isCommunicationFullBleed;

  const handleLogout = () => {
    userLogout();
    navigate('/login');
  };

  const moreItems = [
    { to: '/portal/docs', label: 'Docs', icon: FileText },
    { to: '/portal/wiki', label: 'Wiki', icon: BookOpen },
    ...(isSuperAdmin ? [{ to: '/portal/invites', label: 'People', icon: Users }] : []),
  ];

  const desktopNavItems = isSuperAdmin
    ? [
        { to: '/portal', label: 'Home', icon: LayoutDashboard, end: true },
        { to: '/portal/projects', label: 'Projects', icon: FolderKanban, end: false },
        { to: '/portal/docs', label: 'Docs', icon: FileText, end: false },
        { to: '/portal/wiki', label: 'Wiki', icon: BookOpen, end: false },
        { to: '/portal/invites', label: 'People', icon: Users, end: false },
      ]
    : [
        { to: '/portal', label: 'Home', icon: LayoutDashboard, end: true },
        { to: '/portal/projects', label: 'Projects', icon: FolderKanban, end: false },
        { to: '/portal/docs', label: 'Docs', icon: FileText, end: false },
        { to: '/portal/wiki', label: 'Wiki', icon: BookOpen, end: false },
      ];

  const toggleDesktopPanel = (mode: 'spaces' | 'chats') =>
    setDesktopPanel((p) => (p === mode ? null : mode));

  const closeMobileSheet = () => setMobileSheet(null);

  useEffect(() => {
    closeMobileSheet();
  }, [location.pathname]);

  const RailButton: React.FC<{ icon: LucideIcon; label: string; active: boolean; onClick?: () => void; title?: string }> = ({ icon: Icon, label, active, onClick, title }) => (
    <button
      onClick={onClick}
      title={title}
      className="flex flex-col items-center gap-1 w-full py-1 group"
    >
      <span
        className={cn(
          'flex items-center justify-center h-9 w-9 rounded-xl transition-colors',
          active ? 'bg-emerald-500 text-white' : 'text-emerald-300/80 group-hover:bg-white/10 group-hover:text-white'
        )}
      >
        <Icon size={18} />
      </span>
      <span className={cn('text-[10px] font-semibold transition-colors', active ? 'text-white' : 'text-emerald-300/70 group-hover:text-emerald-100')}>
        {label}
      </span>
    </button>
  );

  const isHome = location.pathname === '/portal' || location.pathname === '/portal/';
  const isProjects = location.pathname.startsWith('/portal/projects') && !isCommunicationFullBleed;

  return (
    <div className="min-h-dvh flex bg-(--color-app-bg)">
      {/* Desktop icon rail — ClickUp-style */}
      <aside className="hidden lg:flex flex-col items-center w-[72px] shrink-0 bg-emerald-950 pt-5 pb-4">
        <div className="h-9 w-9 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-black text-base">
          T
        </div>

        <div className="w-full h-px bg-white/10 my-4" />

        <nav className="flex flex-col items-center gap-2.5 w-full px-2">
          {desktopNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="w-full" onClick={() => setDesktopPanel(null)}>
              {({ isActive }) => <RailButton icon={Icon} label={label} active={isActive} />}
            </NavLink>
          ))}
          <RailButton
            icon={MessageCircle}
            label="Chats"
            active={desktopPanel === 'chats'}
            onClick={() => toggleDesktopPanel('chats')}
            title="Client communication threads, by project"
          />
          <RailButton
            icon={Boxes}
            label="Spaces"
            active={desktopPanel === 'spaces'}
            onClick={() => toggleDesktopPanel('spaces')}
            title="Every project"
          />
        </nav>

        <div className="mt-auto w-full px-2">
          <RailButton icon={LogOut} label="Log out" active={false} onClick={handleLogout} />
        </div>
      </aside>

      {desktopPanel && (
        <aside className="hidden lg:flex flex-col w-52 shrink-0 border-r border-(--color-border) bg-(--color-surface) py-4 px-3 min-h-0">
          <div className="px-1 mb-4">
            <span className="text-base font-black text-(--color-text-primary) tracking-tight">Client Portal</span>
          </div>
          <ProjectsPanel isSuperAdmin={isSuperAdmin} mode={desktopPanel} />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Compact ClickUp-style mobile header; taller desktop header unchanged */}
        <header
          className={cn(
            'shrink-0 border-b border-(--color-border) bg-(--color-surface) flex items-center justify-between gap-2 min-w-0',
            'h-12 px-3 lg:h-16 lg:px-8 lg:gap-4',
            'pt-[env(safe-area-inset-top)]'
          )}
        >
          {topbarTitle ? (
            <div className="flex items-center gap-2 min-w-0 flex-1 lg:max-w-[30%] lg:flex-none lg:gap-3">
              <button
                onClick={() => navigate(-1)}
                className="shrink-0 h-9 w-9 lg:h-auto lg:w-auto flex items-center justify-center rounded-full text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-primary-600"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="text-[15px] lg:text-base font-black text-(--color-text-primary) truncate">{topbarTitle}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0 lg:hidden">
              <div className="h-8 w-8 rounded-lg bg-emerald-950 text-white flex items-center justify-center font-black text-sm shrink-0">
                T
              </div>
              <span className="text-[15px] font-black text-(--color-text-primary) truncate">Home</span>
            </div>
          )}
          {!topbarTitle && (
            <span className="hidden lg:inline text-base font-black text-(--color-text-primary)">Client Portal</span>
          )}
          <div className="flex-1 min-w-0 flex justify-end lg:justify-center">
            <PortalSearch />
          </div>
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {user?.user_type === 'INTERNAL' ? (
              <ProfileWorkspaceMenu />
            ) : (
              <>
                <span className="hidden sm:inline text-sm font-semibold text-(--color-text-primary)">
                  {user?.first_name} {user?.last_name}
                </span>
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-8 w-8 lg:h-9 lg:w-9 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
                    {user?.first_name?.[0]?.toUpperCase() ?? 'C'}
                  </div>
                )}
              </>
            )}
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

        {/* ClickUp-style mobile bottom tabs: Home · Chats · Spaces · More */}
        {!hideMobileTabBar && (
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
            <button
              type="button"
              onClick={() => setMobileSheet((s) => (s === 'chats' ? null : 'chats'))}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-bold',
                mobileSheet === 'chats' ? 'text-emerald-600' : 'text-(--color-text-secondary)'
              )}
            >
              <MessageCircle size={20} strokeWidth={mobileSheet === 'chats' ? 2.4 : 2} />
              Chats
            </button>
            <button
              type="button"
              onClick={() => setMobileSheet((s) => (s === 'spaces' ? null : 'spaces'))}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-bold',
                mobileSheet === 'spaces' || isProjects ? 'text-emerald-600' : 'text-(--color-text-secondary)'
              )}
            >
              <Boxes size={20} strokeWidth={mobileSheet === 'spaces' || isProjects ? 2.4 : 2} />
              Spaces
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
        )}
      </div>

      {mobileSheet === 'chats' && (
        <MobileSheetShell title="Chats" onClose={closeMobileSheet}>
          <ProjectsPanel isSuperAdmin={isSuperAdmin} mode="chats" onNavigate={closeMobileSheet} />
        </MobileSheetShell>
      )}
      {mobileSheet === 'spaces' && (
        <MobileSheetShell title="Spaces" onClose={closeMobileSheet}>
          <ProjectsPanel isSuperAdmin={isSuperAdmin} mode="spaces" onNavigate={closeMobileSheet} />
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
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 min-h-12 rounded-xl text-[15px] font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </MobileSheetShell>
      )}
    </div>
  );
});

export default ClientPortalLayout;
