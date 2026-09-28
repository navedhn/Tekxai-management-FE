import React, { memo, useState, useRef, useEffect } from 'react';
import { Menu, Bell, HelpCircle, Moon, Sun } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '@/services/notificationService';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPageTitle } from './pageTitles';
import { useColorMode } from '@/hooks/useColorMode';
import { useTopbarExtraStore } from '@/stores/topbarExtraStore';
import { cn } from '@/utils/cn';
import ProfileWorkspaceMenu from './ProfileWorkspaceMenu';

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
    const navigate = useNavigate();
    const location = useLocation();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const { data: notifData } = useNotifications(10);
    const unreadCount = notifData?.unread_count ?? 0;
    const notifBtnRef = useRef<HTMLButtonElement>(null);
    const { isDark, toggleColorMode } = useColorMode();
    const topbarExtra = useTopbarExtraStore((s) => s.extra);
    const hideTopbarTitle = useTopbarExtraStore((s) => s.hideTitle);

    const { title: routeTitle } = getPageTitle(location.pathname, routePrefix);
    const title = titleOverride ?? routeTitle;

    useEffect(() => {
        setIsNotifOpen(false);
    }, [location.pathname]);

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

                <ProfileWorkspaceMenu
                    profileTo={`${routePrefix}/profile`}
                    className="pl-2.5 sm:pl-3 ml-0.5 border-l border-(--color-border)"
                />
            </div>
        </div>
        <ChatMessagePopup />
        </>
    );
});

export default AdminTopbar;
