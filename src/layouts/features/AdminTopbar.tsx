import React, { memo, useMemo, useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Badge from '@/components/ui/Badge';
import NotificationDropdown from './NotificationDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';

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
    const notifBtnRef = useRef<HTMLButtonElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

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

            <div className="flex items-center gap-4">
                <button className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors" onClick={onMenu}>
                    <Menu size={20} className="text-gray-600" />
                </button>
                <div className="flex flex-col gap-1">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-poppins font-medium text-gray-900 tracking-tight flex items-center gap-2">
                        <span className="hidden sm:inline">👋</span> {greeting}, {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'User'}
                    </h1>
                    <p className="text-sm text-gray-500 font-poppins hidden sm:block">
                        Let's take a look at what needs attention today.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-5 md:gap-7 relative">
                {/* Status Badge */}
                <Badge variant="success" className="bg-[#E7F9ED]  hidden sm:flex items-center text-[#067647] border border-[#ABEFC6]  font-bold text-xs">
                    <span className="mr-1.5 flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Active
                </Badge>

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

                    <span className="absolute top-[-3px] right-[-3px] flex h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white ring-2 ring-red-100 group-hover:animate-bounce" />
                </button>

                <NotificationDropdown
                    isOpen={isNotifOpen}
                    onClose={() => setIsNotifOpen(false)}
                    triggerRef={notifBtnRef}
                />

                {/* Profile with Dropdown */}
                <div ref={profileRef} className="relative flex items-center gap-3 pl-4 border-l border-gray-100 ml-2">
                    <button
                        onClick={() => setIsProfileOpen(prev => !prev)}
                        className="h-11 w-11 rounded-full bg-gradient-to-tr from-primary-500 to-blue-400 p-[2px] shadow-lg shadow-primary-100 hover:scale-105 transition-transform active:scale-95"
                    >
                        <div className="h-full w-full rounded-full bg-white p-[2px]">
                            <img
                                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || 'U') + '+' + (user?.last_name || ''))}&background=005CDA&color=fff&size=128`}
                                alt="Profile"
                                className="h-full w-full rounded-full object-cover"
                            />
                        </div>
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
