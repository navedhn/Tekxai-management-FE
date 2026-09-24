import React, { memo, Suspense, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, FolderKanban, LogOut, Users, ChevronDown, ChevronRight, Plus, Circle, Boxes, MessageCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { RoutePageSkeleton } from '@/components/skeletons';

const NAV_ITEMS = [
  { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/portal/projects', label: 'Projects', icon: FolderKanban, end: false },
];

type SpaceProject = { id: string; title: string; status: string };

// The second sidebar panel is shared by the "Spaces" and "Chats" rail
// buttons — same project list either way, just linking into a different
// tab of that project (its overview vs. its client Communication tab),
// since "Chats" here means the portal's own client-communication threads,
// never the separate internal /chat module.
const ProjectsPanel: React.FC<{ isSuperAdmin: boolean; mode: 'spaces' | 'chats' }> = ({ isSuperAdmin, mode }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const { data: projects = [] } = useQuery<SpaceProject[]>({
    queryKey: ['portal', 'projects', 'spaces'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    select: (r: any) => r?.payload?.records || [],
  });

  const label = mode === 'chats' ? 'Chats' : 'Spaces';

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
          {projects.length === 0 && (
            <span className="px-3 py-1.5 text-xs text-(--color-text-secondary)">No projects yet.</span>
          )}
          {projects.map((p) => (
            <NavLink
              key={p.id}
              to={mode === 'chats' ? `/portal/projects/${p.id}/communication` : `/portal/projects/${p.id}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 h-8 rounded-lg text-[13px] font-semibold truncate transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-(--color-text-secondary) hover:bg-(--color-state-hover)'
                )
              }
              title={p.title}
            >
              {mode === 'chats' ? (
                <MessageCircle size={13} className="shrink-0 opacity-60" />
              ) : (
                <Circle size={7} className="shrink-0 fill-current opacity-60" />
              )}
              <span className="truncate">{p.title}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
};

const ClientPortalLayout: React.FC = memo(() => {
  const { user, role } = useAuth();
  const { userLogout } = useAuthStore();
  const navigate = useNavigate();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [panel, setPanel] = useState<'spaces' | 'chats' | null>('spaces');

  const handleLogout = () => {
    userLogout();
    navigate('/login');
  };

  const navItems = isSuperAdmin
    ? [...NAV_ITEMS, { to: '/portal/invites', label: 'People', icon: Users, end: false }]
    : NAV_ITEMS;

  const togglePanel = (mode: 'spaces' | 'chats') => setPanel((p) => (p === mode ? null : mode));

  const railActiveCls = 'bg-emerald-500 text-white shadow-sm shadow-emerald-900/40';
  const railInactiveCls = 'text-emerald-200/70 hover:bg-white/10 hover:text-white';

  return (
    <div className="min-h-screen flex bg-(--color-app-bg)">
      {/* Icon rail — ClickUp-style: icon stacked over a short label, narrow, dark */}
      <aside className="hidden lg:flex flex-col items-center w-[68px] shrink-0 bg-emerald-950 py-4 gap-1.5">
        <div className="h-9 w-9 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-black text-base mb-3">
          T
        </div>
        <nav className="flex flex-col items-center gap-1 w-full px-1.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('flex flex-col items-center justify-center gap-1 w-full py-2 rounded-xl text-[10px] font-bold transition-colors', isActive ? railActiveCls : railInactiveCls)
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => togglePanel('chats')}
            title="Client communication threads, by project"
            className={cn('flex flex-col items-center justify-center gap-1 w-full py-2 rounded-xl text-[10px] font-bold transition-colors', panel === 'chats' ? railActiveCls : railInactiveCls)}
          >
            <MessageCircle size={18} />
            Chats
          </button>
          <button
            onClick={() => togglePanel('spaces')}
            title="Every project"
            className={cn('flex flex-col items-center justify-center gap-1 w-full py-2 rounded-xl text-[10px] font-bold transition-colors', panel === 'spaces' ? railActiveCls : railInactiveCls)}
          >
            <Boxes size={18} />
            Spaces
          </button>
        </nav>

        <button
          onClick={handleLogout}
          className={cn('mt-auto flex flex-col items-center justify-center gap-1 w-full py-2 rounded-xl text-[10px] font-bold', railInactiveCls)}
        >
          <LogOut size={18} />
          Log out
        </button>
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
        <header className="h-16 shrink-0 border-b border-(--color-border) bg-(--color-surface) flex items-center justify-between px-4 lg:px-8">
          <span className="lg:hidden text-base font-black text-(--color-text-primary)">Client Portal</span>
          <div className="ml-auto flex items-center gap-3">
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
