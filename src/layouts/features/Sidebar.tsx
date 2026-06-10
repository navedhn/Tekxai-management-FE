import React, { memo, useMemo, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Home, Users, Settings, FolderCheck, Clock, Star, LogOut, texailogo, X, dashboardIconWhite, dashboardIconBlack, projectIconBlack, projectIconWhite, timesheetBlack, timesheetEmployeeWhite, settingsBlack, settingsWhite, teamManagementBlack, teamManagementWhite, savedBlack, savedWhite, timesheetWhite, timesheetEmployeeBlack, } from '@/assets/icons';
import { useLogoutMutation } from '@/services/authService';
import { clearAuthTokens } from '@/utils/tokenMemory';
import { Users2 } from 'lucide-react';


export type SidebarProps = { isOpen: boolean; onClose: () => void };

const Sidebar: React.FC<SidebarProps> = memo(({ isOpen, onClose }) => {
    const { role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { userLogout } = useAuthStore();
    const logoutMutation = useLogoutMutation();

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
            clearAuthTokens();
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

            <div className="px-4 pb-6 pt-4 mt-auto border-t border-gray-100">
                <button
                    type="button"
                    onClick={logout}
                    disabled={logoutMutation.isPending}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-bold text-[#252525] hover:bg-red-50 hover:text-red-600 transition-all duration-300 group disabled:opacity-60"
                >
                    <LogOut size={20} className="shrink-0 group-hover:text-red-600" />
                    <span className="text-sm tracking-tight">
                        {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                    </span>
                </button>
            </div>

        </aside>
    );
});

export default Sidebar;



