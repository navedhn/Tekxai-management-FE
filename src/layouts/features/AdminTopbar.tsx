import React, { memo, useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, LogOut, HelpCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '@/services/notificationService';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getPageTitle } from './pageTitles';

import ActionModal from '@/components/ui/ActionModal';

export type AdminTopbarProps = { onMenu: () => void; routePrefix?: string };

const AdminTopbar: React.FC<AdminTopbarProps> = memo(({ onMenu, routePrefix = '/admin' }) => {
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

    const { title } = getPageTitle(location.pathname, routePrefix);

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

    return (
        <div className="fixed top-0 left-0 lg:left-sidebar gap-3 right-0 h-[5.5rem] bg-white backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 md:px-5 z-[100] transition-all duration-300">

            <div className="flex items-center gap-4 shrink-0">
                <button className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors" onClick={onMenu}>
                    <Menu size={20} className="text-gray-600" />
                </button>
                <div className="flex items-baseline gap-2 min-w-0">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-poppins font-semibold text-gray-900 tracking-tight truncate">
                        {title}
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-5 relative shrink-0 ml-auto">
                {/* Help */}
                <button
                    onClick={() => navigate(`${routePrefix}/tickets`)}
                    title="Raise a support ticket"
                    className="hidden sm:flex p-2.5 bg-gray-50 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-2xl border border-gray-100 transition-all"
                >
                    <HelpCircle size={20} />
                </button>

                {/* Notifications */}
                <button
                    ref={notifBtnRef}
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="relative p-2.5 bg-gray-50 text-gray-500 group hover:text-primary-500 hover:bg-primary-50 rounded-2xl border border-gray-100 transition-all"
                >
                    <Bell
                        size={20}
                        className="transform rotate-[340deg] group-hover:rotate-0 transition-transform duration-500 ease-in-out"
                    />

                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black border-2 border-white group-hover:animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                </button>

                <NotificationDropdown
                    isOpen={isNotifOpen}
                    onClose={() => setIsNotifOpen(false)}
                    triggerRef={notifBtnRef}
                />

                {/* Profile with Dropdown */}
                <div ref={profileRef} className="relative flex items-center gap-2.5 pl-3 md:pl-4 border-l border-gray-100 ml-1 md:ml-2">
                    <button
                        onClick={() => setIsProfileOpen(prev => !prev)}
                        className="flex items-center gap-2.5"
                    >
                        <span className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-primary-500 to-blue-400 p-[2px] shadow-lg shadow-primary-100 hover:scale-105 transition-transform active:scale-95">
                            <span className="h-full w-full rounded-full bg-white p-[2px] flex">
                                <img
                                    src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || 'U') + '+' + (user?.last_name || ''))}&background=005CDA&color=fff&size=128`}
                                    alt="Profile"
                                    className="h-full w-full rounded-full object-cover"
                                />
                            </span>
                        </span>
                        <span className="hidden md:flex flex-col items-start leading-tight">
                            <span className="text-sm font-bold text-gray-900">
                                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'User'}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                                {user?.rolesId === '7170d59d-1f19-4bda-b302-245c48dd18f8' ? 'Admin' : 'Employee'}
                            </span>
                        </span>
                        <ChevronDown size={16} className="hidden md:block text-gray-400" />
                    </button>

                    <AnimatePresence>
                        {isProfileOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.92, y: -8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                className="absolute top-[calc(100%+12px)] right-0 w-52 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden z-50"
                            >
                                {/* User Info */}
                                <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
                                    <img
                                        src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || 'U') + '+' + (user?.last_name || ''))}&background=005CDA&color=fff&size=128`}
                                        className="w-10 h-10 rounded-xl object-cover shadow-sm"
                                    />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-black text-gray-900 text-[14px] truncate">
                                            {user?.first_name} {user?.last_name}
                                        </span>
                                        <span className="text-gray-400 text-xs font-medium capitalize">
                                            {user?.rolesId === '7170d59d-1f19-4bda-b302-245c48dd18f8' ? 'Admin' : 'Employee'}
                                        </span>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="py-2">
                                    <Link
                                        to={`${routePrefix}/profile`}
                                        onClick={() => setIsProfileOpen(false)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-primary-500 transition-colors text-left"
                                    >
                                        <User size={16} className="text-gray-400" />
                                        My Profile
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            setIsLogoutModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-red-500 hover:bg-red-50 transition-colors text-left"
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
    );
});

export default AdminTopbar;
