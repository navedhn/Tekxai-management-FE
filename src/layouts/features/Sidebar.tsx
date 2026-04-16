import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Home, Users, Settings, FolderCheck, Clock, Star, LogOut, User as UserIcon, texailogo, UserPlus, Copy, Check, X, dashboardIconWhite, dashboardIconBlack, projectIconBlack, projectIconWhite, timesheetBlack, timesheetEmployeeWhite, settingsBlack, settingsWhite, teamManagementBlack, teamManagementWhite, savedBlack, savedWhite, timesheetWhite, timesheetEmployeeBlack, } from '@/assets/icons';
import { useLogoutMutation } from '@/services/authService';
import { clearAccessToken } from '@/utils/tokenMemory';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Users2 } from 'lucide-react';


export type SidebarProps = { isOpen: boolean; onClose: () => void };

const Sidebar: React.FC<SidebarProps> = memo(({ isOpen, onClose }) => {
    const { role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { userLogout } = useAuthStore();
    const logoutMutation = useLogoutMutation();
    const [isInvitePopOpen, setIsInvitePopOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsInvitePopOpen(false);
            }
        };
        if (isInvitePopOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isInvitePopOpen]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText('https://yododesigns.com/');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, []);

    // Determine the base path based on the current location
    const isEmployeeView = location.pathname.startsWith('/employee');
    const basePath = isEmployeeView ? '/employee' : '/admin';

    const links = useMemo(() => {
        if (isEmployeeView) {
            return [
                { to: '/employee', label: 'Home', icon: <Home size={20} />, inactive: dashboardIconBlack, active: dashboardIconWhite, end: true },
                { to: '/employee/projects', label: 'Projects', icon: <FolderCheck size={20} />, inactive: projectIconBlack, active: projectIconWhite },
                { to: '/employee/starred', label: 'Starred Queries', icon: <Star size={20} className="" /> },
                { to: '/employee/timesheet', label: 'Timesheet', icon: <Clock size={20} />, inactive: timesheetEmployeeBlack, active: timesheetEmployeeWhite },
                { to: '/employee/settings', label: 'Setting', icon: <Settings size={20} />, inactive: settingsBlack, active: settingsWhite },
            ];
        }

        const adminLinks = [
            { to: '/admin', label: 'Home', icon: <Home size={20} />, end: true, inactive: dashboardIconBlack, active: dashboardIconWhite },
            { to: '/admin/users', label: 'Users Management', icon: <Users2 size={20} /> },
            { to: '/admin/projects', label: 'Project Management', icon: <FolderCheck size={20} />, inactive: projectIconBlack, active: projectIconWhite },
            { to: '/admin/timesheet', label: 'Timesheet', icon: <Users size={20} />, inactive: timesheetBlack, active: timesheetWhite },
            { to: '/admin/starred', label: 'Starred Project', icon: <Star size={20} />, inactive: savedBlack, active: savedWhite },
            { to: '/admin/team', label: 'Team Management', icon: <Clock size={20} />, inactive: teamManagementBlack, active: teamManagementWhite },
        ];



        adminLinks.push({ to: '/admin/settings', label: 'Setting', icon: <Settings size={20} />, inactive: settingsBlack, active: settingsWhite });

        return adminLinks;
    }, [role, isEmployeeView]);

    const logout = useCallback(async () => {
        try {
            await logoutMutation.mutateAsync();
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            clearAccessToken();
            userLogout();
            navigate('/login');
        }
    }, [navigate, logoutMutation, userLogout]);

    return (
        <aside
            className={
                `fixed inset-y-0 left-0 w-sidebar bg-white flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] lg:translate-x-0 z-110  border-r border-gray-100 ` +
                (isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
            }
        >
            {/* Logo Section */}
            <div className="p-[18.5px] flex items-center justify-center relative border-b border-gray-100">
                <img src={texailogo} className='w-[100px] h-[50px] object-contain' />
                <button
                    onClick={onClose}
                    className="lg:hidden absolute right-4 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 mt-2">
                {links.map((l) => (
                    <NavLink
                        key={l.to}
                        to={l.to}
                        end={l.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 group ` +
                            (isActive
                                ? 'bg-gradient-to-b from-[#005CDA] to-[#001F4A] text-white shadow-lg shadow-primary-100'
                                : 'text-[#252525] hover:bg-blue-50 ')
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className="transition-transform duration-300 group-hover:scale-105 shrink-0">
                                    {(l.active && l.inactive) ? (
                                        <img
                                            src={isActive ? l.active : l.inactive}
                                            alt={l.label}
                                            className="w-5 h-5 object-contain"
                                        />
                                    ) : (
                                        l.icon
                                    )}
                                </div>
                                <h4 className="text-sm tracking-tight">{l.label}</h4>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Premium Widget: Share Your Board */}

            <div className="px-6 mb-10 relative">
                <AnimatePresence>
                    {isInvitePopOpen && !isEmployeeView && (
                        <motion.div
                            ref={popoverRef}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute bottom-full left-6 right-6 mb-4 bg-[#F2F7FF] rounded-[1.5rem] border border-blue-100 p-5 shadow-2xl z-50 flex flex-col gap-3"
                        >
                            <h4 className="text-[13px] font-black text-gray-900 leading-tight">
                                Send a Portal invite link to a new Member
                            </h4>

                            <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-blue-50">
                                <span className="flex-1 px-2 text-[11px] text-gray-400 font-medium truncate">
                                    https://yododesigns.com/
                                </span>
                                <button
                                    onClick={handleCopy}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black transition-all",
                                        isCopied
                                            ? "bg-green-500 text-white"
                                            : "bg-[#005CDA] text-white hover:bg-[#0048B8]"
                                    )}
                                >
                                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                    {isCopied ? 'Copied' : 'Copy'}
                                </button>
                            </div>

                            <p className="text-[10px] text-gray-500 font-bold px-1">
                                Your invite link expires in 7 days.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="bg-gradient-to-b from-[#005CDA] to-[#001F4A] rounded-[2rem] p-6 flex flex-col items-center text-center gap-4 shadow-xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                    <h1 className="text-[18px] font-bold text-white tracking-wide">
                        {isEmployeeView ? 'Employee Hub' : 'Share Your Board'}
                    </h1>
                    <button
                        onClick={() => !isEmployeeView && setIsInvitePopOpen(!isInvitePopOpen)}
                        className="w-full bg-white text-[#0047AB] py-3 px-4 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-md active:scale-95"
                    >
                        <div className="h-5 w-5 rounded-full  flex items-center justify-center">
                            {isEmployeeView ? (
                                <Users size={16} className="text-[#0047AB] fill-[#0047AB]" />
                            ) : (
                                <UserPlus size={16} className="text-[#0047AB] fill-[#0047AB]" />
                            )}
                        </div>
                        {isEmployeeView ? 'Get Support' : 'Invite People'}
                    </button>
                </div>
            </div>

        </aside>
    );
});

export default Sidebar;



