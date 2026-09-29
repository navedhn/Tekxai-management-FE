import React, { memo, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  Globe2,
  Home,
  LayoutDashboard,
  LogOut,
  User,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/services/permissionsService';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import ActionModal from '@/components/ui/ActionModal';

export type ProfileWorkspaceMenuProps = {
  /** Overrides the default My Profile destination (`/admin/profile` or `/employee/profile`). */
  profileTo?: string;
  className?: string;
};

/**
 * Shared profile trigger + dropdown used by admin/employee topbars and the
 * portal header (INTERNAL and CLIENT). Workspace links are permission-gated
 * and hide the workspace you're already in.
 */
const ProfileWorkspaceMenu: React.FC<ProfileWorkspaceMenuProps> = memo(({ profileTo, className }) => {
  const { user, userLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: myPerms } = useMyPermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isClient = user?.user_type === 'CLIENT';
  const canAccessCrm = !isClient && (!!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('crm.workspace.access'));
  const crmAppUrl = import.meta.env.VITE_CRM_APP_URL as string | undefined;
  const canAccessAdmin =
    !isClient && (!!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.workspace.access'));
  const canAccessEmployee =
    !isClient && (!!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.employee_workspace.access'));

  // Portal is invite-gated for ordinary INTERNAL users. SUPER_ADMIN and
  // CLIENT (or anyone with client.*) always qualify; otherwise probe once.
  const needsPortalProbe =
    !!user &&
    user.user_type === 'INTERNAL' &&
    !myPerms?.is_super_admin &&
    !myPerms?.permissions?.some((p) => p.startsWith('client.'));
  const { data: portalProbe } = useQuery({
    queryKey: ['portal-access-check', user?.id],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
    enabled: needsPortalProbe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const portalProjectCount =
    portalProbe?.payload?.total ?? portalProbe?.payload?.records?.length ?? 0;
  const canAccessPortal =
    !!myPerms?.is_super_admin ||
    user?.user_type === 'CLIENT' ||
    !!myPerms?.permissions?.some((p) => p.startsWith('client.')) ||
    (needsPortalProbe && portalProjectCount > 0);

  const onAdmin = location.pathname.startsWith('/admin');
  const onEmployee = location.pathname.startsWith('/employee');
  const onPortal = location.pathname.startsWith('/portal');
  const showAdminSwitch = canAccessAdmin && !onAdmin;
  const showEmployeeSwitch = canAccessEmployee && !onEmployee;
  const showPortalSwitch = canAccessPortal && !onPortal;
  const showCrmSwitch = canAccessCrm && !!crmAppUrl;
  const showWorkspaceSwitch =
    showAdminSwitch || showEmployeeSwitch || showPortalSwitch || showCrmSwitch;

  const resolvedProfileTo =
    profileTo ||
    (isClient
      ? '/portal/profile'
      : canAccessAdmin
        ? '/admin/profile'
        : canAccessEmployee
          ? '/employee/profile'
          : '/employee/profile');

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'User';
  const roleLabel = isClient
    ? 'Client'
    : user?.role_name
      ? user.role_name.replace(/_/g, ' ')
      : 'Employee';
  const avatarSrc =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || 'U') + '+' + (user?.last_name || ''))}&background=${isClient ? '059669' : '005CDA'}&color=fff&size=128`;

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  return (
    <>
      <div
        ref={rootRef}
        className={cn('relative flex items-center', className)}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors',
            'hover:bg-(--color-state-hover)',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200',
          )}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <span
            className="h-9 w-9 shrink-0 rounded-full p-[2px] shadow-sm"
            style={{ backgroundImage: 'var(--gradient-primary)' }}
          >
            <span className="h-full w-full rounded-full bg-(--color-header-bg) p-[1.5px] flex">
              <img src={avatarSrc} alt="Profile" className="h-full w-full rounded-full object-cover" />
            </span>
          </span>
          <span className="hidden md:flex flex-col items-start leading-tight min-w-0">
            <span className="text-sm font-bold text-(--color-text-primary) truncate max-w-[140px]">
              {displayName}
            </span>
            <span className="text-[11px] text-(--color-text-secondary) font-medium capitalize truncate max-w-[140px]">
              {roleLabel}
            </span>
          </span>
          <ChevronDown
            size={15}
            className={cn(
              'hidden md:block text-(--color-text-secondary) transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute top-[calc(100%+10px)] right-0 w-56 bg-(--color-card-bg) rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-(--color-card-border) overflow-hidden z-50"
              role="menu"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-(--color-border)">
                <img src={avatarSrc} alt="" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                <div className="flex flex-col overflow-hidden min-w-0">
                  <span className="font-bold text-(--color-text-primary) text-[13px] truncate">
                    {displayName}
                  </span>
                  <span className="text-(--color-text-secondary) text-xs font-medium capitalize truncate">
                    {roleLabel}
                  </span>
                </div>
              </div>

              <div className="py-1.5">
                {showWorkspaceSwitch && (
                  <>
                    <div className="px-4 pt-1.5 pb-1 text-[10px] font-bold text-(--color-text-secondary) tracking-widest uppercase flex items-center gap-2">
                      <ArrowLeftRight size={12} />
                      Switch Workspace
                    </div>
                    {showAdminSwitch && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover) hover:text-primary-500 transition-colors text-left"
                        role="menuitem"
                      >
                        <LayoutDashboard size={16} className="text-(--color-text-secondary)" />
                        Admin Dashboard
                      </Link>
                    )}
                    {showEmployeeSwitch && (
                      <Link
                        to="/employee"
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover) hover:text-primary-500 transition-colors text-left"
                        role="menuitem"
                      >
                        <Home size={16} className="text-(--color-text-secondary)" />
                        Employee Dashboard
                      </Link>
                    )}
                    {showPortalSwitch && (
                      <Link
                        to="/portal"
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover) hover:text-primary-500 transition-colors text-left"
                        role="menuitem"
                      >
                        <Globe2 size={16} className="text-(--color-text-secondary)" />
                        Client Portal
                      </Link>
                    )}
                    {showCrmSwitch && (
                      <a
                        href={crmAppUrl}
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover) hover:text-primary-500 transition-colors text-left"
                        role="menuitem"
                      >
                        <ArrowLeftRight size={16} className="text-(--color-text-secondary)" />
                        CRM Workspace
                      </a>
                    )}
                    <div className="mx-4 my-1 border-t border-(--color-border)" />
                  </>
                )}
                <Link
                  to={resolvedProfileTo}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover) hover:text-primary-500 transition-colors text-left"
                  role="menuitem"
                >
                  <User size={16} className="text-(--color-text-secondary)" />
                  My Profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors text-left"
                  role="menuitem"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ActionModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        loading={isLoggingOut}
        title="Sign Out"
        description="Are you sure you want to sign out of your account? You will need to login again to access your dashboard."
        confirmText="Sign Out"
        icon="logout"
      />
    </>
  );
});

ProfileWorkspaceMenu.displayName = 'ProfileWorkspaceMenu';

export default ProfileWorkspaceMenu;
