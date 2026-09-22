import React, { memo, useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, LogOut, HelpCircle, ChevronDown, ArrowLeftRight, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '@/services/notificationService';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getPageTitle } from './pageTitles';
import { useMyPermissions } from '@/services/permissionsService';
import { useColorMode } from '@/hooks/useColorMode';
import { useTopbarExtraStore } from '@/stores/topbarExtraStore';
import { cn } from '@/utils/cn';

import ActionModal from '@/components/ui/ActionModal';
import ChatMessagePopup from '@/components/chatPopup/ChatMessagePopup';

export type AdminTopbarProps = { onMenu: () => void; routePrefix?: string; fullWidth?: boolean; title?: string };

const iconBtnClass = cn(
  'relative p-2.5 rounded-xl border transition-all duration-200',
  'bg-(--color-elevated) text-(--color-text-secondary)',
  'border-(--color-border)',
  'hover:text-primary-500 hover:border-primary-200 hover:bg-primary-50/70',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200',
);

const AdminTopbar: React.FC<AdminTopbarProps> = memo(({ onMenu, routePrefix = '/admin', fullWidth = false, title: titleOverride }) => {
    const { user, userLogout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { data: notifData } = useNotifications(10);
    const unreadCount = notifData?.unread_count ?? 0;
    const notifBtnRef = useRef<HTMLButtonElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const { isDark, toggleColorMode } = useColorMode();
    const topbarExtra = useTopbarExtraStore((s) => s.extra);
    const hideTopbarTitle = useTopbarExtraStore((s) => s.hideTitle);

    const { data: myPerms } = useMyPermissions();
    const canAccessCrm = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('crm.workspace.access');
    const crmAppUrl = import.meta.env.VITE_CRM_APP_URL as string | undefined;

    const { title: routeTitle } = getPageTitle(location.pathname, routePrefix);
    const title = titleOverride ?? routeTitle;

    useEffect(() => {
        setIsProfileOpen(false);
        setIsNotifOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsProfileOpen(false);
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

    const displayName = user?.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : 'User';
    const roleLabel = user?.role_name ? user.role_name.replace(/_/g, ' ') : 'Employee';
    const avatarSrc =
        user?.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || 'U') + '+' + (user?.last_name || ''))}&background=005CDA&color=fff&size=128`;

    return (
        <>
        <div
            className={cn(
                'fixed top-0 left-0 right-0 h-topbar z-[100]',
                fullWidth ? '' : 'lg:left-sidebar',
                'bg-(--color-header-bg)/90 backdrop-blur-md',
                'border-b border-(--color-border)',
                'flex items-center justify-between gap-3 px-5 md:px-6',
                'transition-all duration-300',
            )}
        >
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-0">
                {!fullWidth && (
                    <button
                        type="button"
                        className="lg:hidden p-2 hover:bg-(--color-state-hover) rounded-xl transition-colors"
                        onClick={onMenu}
                        aria-label="Open menu"
                    >
                        <Menu size={20} className="text-(--color-text-secondary)" />
                    </button>
                )}
                {!hideTopbarTitle && (
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-lg sm:text-xl md:text-[1.35rem] font-poppins font-semibold text-(--color-text-primary) tracking-tight truncate leading-tight">
                            {title}
                        </h1>
                    </div>
                )}
                {topbarExtra && (
                    <div className="hidden sm:flex items-center gap-2 ml-2 min-w-0">
                        {topbarExtra}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 relative shrink-0 ml-auto">
                <button
                    type="button"
                    onClick={toggleColorMode}
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    className={iconBtnClass}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <button
                    type="button"
                    onClick={() => navigate(`${routePrefix}/tickets`)}
                    title="Raise a support ticket"
                    className={cn(iconBtnClass, 'hidden sm:flex')}
                >
                    <HelpCircle size={18} />
                </button>

                <button
                    ref={notifBtnRef}
                    type="button"
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    aria-label="Notifications"
                    aria-expanded={isNotifOpen}
                    className={iconBtnClass}
                >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black border-2 border-(--color-header-bg)">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                <NotificationDropdown
                    isOpen={isNotifOpen}
                    onClose={() => setIsNotifOpen(false)}
                    triggerRef={notifBtnRef}
                />

                <div
                    ref={profileRef}
                    className="relative flex items-center pl-2.5 sm:pl-3 ml-0.5 border-l border-(--color-border)"
                >
                    <button
                        type="button"
                        onClick={() => setIsProfileOpen((prev) => !prev)}
                        className={cn(
                            'flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors',
                            'hover:bg-(--color-state-hover)',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200',
                        )}
                        aria-expanded={isProfileOpen}
                        aria-haspopup="menu"
                    >
                        <span
                            className="h-9 w-9 shrink-0 rounded-full p-[2px] shadow-sm"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            <span className="h-full w-full rounded-full bg-(--color-header-bg) p-[1.5px] flex">
                                <img
                                    src={avatarSrc}
                                    alt="Profile"
                                    className="h-full w-full rounded-full object-cover"
                                />
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
                                isProfileOpen && 'rotate-180',
                            )}
                        />
                    </button>

                    <AnimatePresence>
                        {isProfileOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                className="absolute top-[calc(100%+10px)] right-0 w-56 bg-(--color-card-bg) rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-(--color-card-border) overflow-hidden z-50"
                                role="menu"
                            >
                                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-(--color-border)">
                                    <img
                                        src={avatarSrc}
                                        alt=""
                                        className="w-10 h-10 rounded-xl object-cover shadow-sm"
                                    />
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
                                    {canAccessCrm && crmAppUrl && (
                                        <>
                                            <div className="px-4 pt-1.5 pb-1 text-[10px] font-bold text-(--color-text-secondary) tracking-widest uppercase flex items-center gap-2">
                                                <ArrowLeftRight size={12} />
                                                Switch Workspace
                                            </div>
                                            <a
                                                href={crmAppUrl}
                                                onClick={() => setIsProfileOpen(false)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover) hover:text-primary-500 transition-colors text-left"
                                                role="menuitem"
                                            >
                                                <ArrowLeftRight size={16} className="text-(--color-text-secondary)" />
                                                CRM Workspace
                                            </a>
                                            <div className="mx-4 my-1 border-t border-(--color-border)" />
                                        </>
                                    )}
                                    <Link
                                        to={`${routePrefix}/profile`}
                                        onClick={() => setIsProfileOpen(false)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover) hover:text-primary-500 transition-colors text-left"
                                        role="menuitem"
                                    >
                                        <User size={16} className="text-(--color-text-secondary)" />
                                        My Profile
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsProfileOpen(false);
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
        </div>
        <ChatMessagePopup />
        </>
    );
});

export default AdminTopbar;
