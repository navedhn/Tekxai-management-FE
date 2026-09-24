import React, { memo, Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, LogOut, Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { RoutePageSkeleton } from '@/components/skeletons';

const NAV_ITEMS = [
  { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/portal/projects', label: 'Projects', icon: FolderKanban, end: false },
];

const ClientPortalLayout: React.FC = memo(() => {
  const { user, role } = useAuth();
  const { userLogout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    userLogout();
    navigate('/login');
  };

  const navItems = role === 'SUPER_ADMIN'
    ? [...NAV_ITEMS, { to: '/portal/invites', label: 'People', icon: Users, end: false }]
    : NAV_ITEMS;

  return (
    <div className="min-h-screen flex bg-(--color-app-bg)">
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-(--color-border) bg-(--color-surface) py-6 px-4">
        <div className="px-2 mb-8">
          <span className="text-lg font-black text-(--color-text-primary) tracking-tight">Client Portal</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-(--color-text-secondary) hover:bg-(--color-state-hover)'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-(--color-border)">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-semibold text-(--color-text-secondary) hover:bg-(--color-state-hover) w-full"
          >
            <LogOut size={18} />
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
