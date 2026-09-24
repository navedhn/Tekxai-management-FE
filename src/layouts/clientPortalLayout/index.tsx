import React, { memo, Suspense, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, FolderKanban, LogOut, Users, ChevronDown, ChevronRight, Plus, Circle } from 'lucide-react';
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

const SpacesList: React.FC<{ isSuperAdmin: boolean }> = ({ isSuperAdmin }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const { data: projects = [] } = useQuery<SpaceProject[]>({
    queryKey: ['portal', 'projects', 'spaces'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    select: (r: any) => r?.payload?.records || [],
  });

  return (
    <div className="mt-6 flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-3 mb-1">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-(--color-text-secondary) hover:text-(--color-text-primary)"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          Spaces
        </button>
        {isSuperAdmin && (
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
              to={`/portal/projects/${p.id}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 h-8 rounded-lg text-[13px] font-semibold truncate transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-(--color-text-secondary) hover:bg-(--color-state-hover)'
                )
              }
              title={p.title}
            >
              <Circle size={7} className="shrink-0 fill-current opacity-60" />
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

  const handleLogout = () => {
    userLogout();
    navigate('/login');
  };

  const navItems = isSuperAdmin
    ? [...NAV_ITEMS, { to: '/portal/invites', label: 'People', icon: Users, end: false }]
    : NAV_ITEMS;

  return (
    <div className="min-h-screen flex bg-(--color-app-bg)">
      <aside className="hidden lg:flex flex-col w-48 shrink-0 border-r border-(--color-border) bg-(--color-surface) py-4 px-3 min-h-0">
        <div className="px-2 mb-5">
          <span className="text-base font-black text-(--color-text-primary) tracking-tight">Client Portal</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-[13px] font-semibold transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-(--color-text-secondary) hover:bg-(--color-state-hover)'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <SpacesList isSuperAdmin={isSuperAdmin} />

        <div className="pt-4 border-t border-(--color-border)">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-[13px] font-semibold text-(--color-text-secondary) hover:bg-(--color-state-hover) w-full"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

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
                  isActive ? 'text-primary-600' : 'text-(--color-text-secondary)'
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
