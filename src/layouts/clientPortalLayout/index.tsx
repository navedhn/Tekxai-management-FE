import React, { memo, Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, FolderKanban, LogOut, Users, ChevronDown, ChevronRight, Plus, Boxes, MessageCircle, FileText, ArrowLeft } from 'lucide-react';
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

const NAV_ITEMS = [
  { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/portal/projects', label: 'Projects', icon: FolderKanban, end: false },
  { to: '/portal/docs', label: 'Docs', icon: FileText, end: false },
];

const CHATS_PAGE_SIZE = 10;
const CHATS_PAGE_INCREMENT = 5;

type SpaceProject = { id: string; title: string; status: string; client: { id: string; name: string } | null };
type Milestone = { id: string; title: string; status: string; progress_percent: number | null };

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

// Milestones only ever fetched once a Space is actually expanded — this
// is a per-project list nested inside a sidebar panel, not a page, so it
// should never fire dozens of requests just for the project list to render.
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

// The second sidebar panel is shared by the "Spaces" and "Chats" rail
// buttons — same project list either way, just linking into a different
// tab of that project (its overview vs. its client Communication tab),
// since "Chats" here means the portal's own client-communication threads,
// never the separate internal /chat module. In "spaces" mode each row
// also expands to show that project's milestones (its task groups).
const ProjectsPanel: React.FC<{ isSuperAdmin: boolean; mode: 'spaces' | 'chats' }> = ({ isSuperAdmin, mode }) => {
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

  // Only the Chats rail needs this — polled lightly so a message that
  // arrives while the sidebar is open still shows up as unread without
  // requiring a manual refresh.
  const { data: unreadCounts = {} } = useQuery<Record<string, { count: number; last_message_at: string | null }>>({
    queryKey: ['portal', 'unread-counts'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.UNREAD_COUNTS),
    select: (r: any) => r?.payload || {},
    enabled: mode === 'chats',
    refetchInterval: mode === 'chats' ? 15000 : false,
  });

  const label = mode === 'chats' ? 'Chats' : 'Spaces';

  // The poll remains a safety net for a reconnect, while this listener makes
  // a newly received message light up its conversation immediately.
  useEffect(() => {
    if (mode !== 'chats') return;
    const socket = getSocket();
    if (!socket) return;
    const refreshUnread = () => queryClient.invalidateQueries({ queryKey: ['portal', 'unread-counts'] });
    socket.on('project:message:new', refreshUnread);
    return () => socket.off('project:message:new', refreshUnread);
  }, [mode, queryClient]);

  // Put conversations needing attention first, as ClickUp does, then within
  // each group (unread / read) sort by most recent activity, latest first,
  // same as any normal chat app — a project with no messages yet sinks to
  // the bottom of its group rather than sitting wherever the project list
  // itself happens to order it.
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
            className="h-5 w-5 flex items-center justify-center rounded-md text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary)"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {expanded && (
        <nav className="flex flex-col gap-0.5 overflow-y-auto px-1">
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
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-2 px-3 h-9 rounded-lg text-[13px] truncate transition-colors',
                      hasUnread ? 'bg-primary-50 font-black text-primary-800 ring-1 ring-inset ring-primary-100' : 'font-semibold text-(--color-text-secondary)',
                      isActive ? 'bg-emerald-50 text-emerald-700 ring-0' : 'hover:bg-(--color-state-hover)'
                    )
                  }
                  title={displayName}
                >
                  <MessageCircle size={13} className={cn('shrink-0', hasUnread ? 'text-primary-600 opacity-100' : 'opacity-60')} />
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
                    className="h-8 w-5 shrink-0 flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary)"
                    title={isOpen ? 'Hide milestones' : 'Show milestones'}
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <NavLink
                    to={`/portal/projects/${p.id}`}
                    className={({ isActive }) =>
                      cn(
                        'flex-1 min-w-0 flex items-center gap-2 pl-1 pr-2 h-8 rounded-lg text-[13px] font-semibold truncate transition-colors',
                        isActive ? 'bg-emerald-50 text-emerald-700' : 'text-(--color-text-secondary) hover:bg-(--color-state-hover)'
                      )
                    }
                    title={displayName}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', PROJECT_STATUS_DOT[p.status] || 'bg-gray-400')} />
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
          className="mx-1 mt-0.5 px-3 h-8 rounded-lg text-[12px] font-bold text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-(--color-text-primary) text-left shrink-0"
        >
          View more ({sortedProjects.length - visibleProjects.length} more)
        </button>
      )}
    </div>
  );
};

const ClientPortalLayout: React.FC = memo(() => {
  const { user, role } = useAuth();
  const topbarTitle = usePortalTopbarStore((s) => s.title);
  const { userLogout } = useAuthStore();
  const navigate = useNavigate();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [panel, setPanel] = useState<'spaces' | 'chats' | null>(null);

  const handleLogout = () => {
    userLogout();
    navigate('/login');
  };

  const navItems = isSuperAdmin
    ? [...NAV_ITEMS, { to: '/portal/invites', label: 'People', icon: Users, end: false }]
    : NAV_ITEMS;

  const togglePanel = (mode: 'spaces' | 'chats') => setPanel((p) => (p === mode ? null : mode));

  // Icon sits in its own small chip that lights up on active/hover; the
  // label underneath stays plain text and only changes color — mirrors
  // ClickUp's rail, where the highlight never stretches the full row.
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

  return (
    <div className="min-h-screen flex bg-(--color-app-bg)">
      {/* Icon rail — ClickUp-style: icon stacked over a short label, narrow, dark */}
      <aside className="hidden lg:flex flex-col items-center w-[72px] shrink-0 bg-emerald-950 pt-5 pb-4">
        <div className="h-9 w-9 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-black text-base">
          T
        </div>

        <div className="w-full h-px bg-white/10 my-4" />

        <nav className="flex flex-col items-center gap-2.5 w-full px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="w-full" onClick={() => setPanel(null)}>
              {({ isActive }) => <RailButton icon={Icon} label={label} active={isActive} />}
            </NavLink>
          ))}
          <RailButton
            icon={MessageCircle}
            label="Chats"
            active={panel === 'chats'}
            onClick={() => togglePanel('chats')}
            title="Client communication threads, by project"
          />
          <RailButton
            icon={Boxes}
            label="Spaces"
            active={panel === 'spaces'}
            onClick={() => togglePanel('spaces')}
            title="Every project"
          />
        </nav>

        <div className="mt-auto w-full px-2">
          <RailButton icon={LogOut} label="Log out" active={false} onClick={handleLogout} />
        </div>
      </aside>

      {/* Spaces/Chats panel — the project list, ClickUp's second sidebar column */}
      {panel && (
        <aside className="hidden lg:flex flex-col w-52 shrink-0 border-r border-(--color-border) bg-(--color-surface) py-4 px-3 min-h-0">
          <div className="px-1 mb-4">
            <span className="text-base font-black text-(--color-text-primary) tracking-tight">Client Portal</span>
          </div>
          <ProjectsPanel isSuperAdmin={isSuperAdmin} mode={panel} />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-(--color-border) bg-(--color-surface) flex items-center justify-between px-4 lg:px-8 gap-4 min-w-0">
          {topbarTitle ? (
            <div className="flex items-center gap-3 min-w-0 md:max-w-[30%]">
              <button
                onClick={() => navigate('/portal/projects')}
                className="shrink-0 text-(--color-text-secondary) hover:text-primary-600"
                title="Back to Projects"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="text-base font-black text-(--color-text-primary) truncate">{topbarTitle}</span>
            </div>
          ) : (
            <span className="lg:hidden text-base font-black text-(--color-text-primary)">Client Portal</span>
          )}
          <div className="flex-1 min-w-0 flex justify-end md:justify-center">
            <PortalSearch />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-semibold text-(--color-text-primary)">
              {user?.first_name} {user?.last_name}
            </span>
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
                {user?.first_name?.[0]?.toUpperCase() ?? 'C'}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
            <Suspense fallback={<RoutePageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        <nav className="lg:hidden flex items-center justify-around border-t border-(--color-border) bg-(--color-surface) h-14 shrink-0">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                  isActive ? 'text-emerald-600' : 'text-(--color-text-secondary)'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
});

export default ClientPortalLayout;
