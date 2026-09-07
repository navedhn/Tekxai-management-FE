import React from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell,
} from 'recharts';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Card from '@/components/ui/Card';
import SearchableSelect from '@/components/ui/SearchableSelect';
import DashboardStatCard from '@/components/ui/DashboardStatCard';
import Button from '@/components/ui/Button';
import { PageSkeleton } from '@/components/skeletons';
import { useShowPageSkeleton } from '@/hooks/useShowPageSkeleton';
import {
    Users, UserCheck, CalendarClock, UserPlus, Ticket,
    Cake, PlusCircle, FileWarning, Banknote, PackagePlus, Upload,
    BarChart3, CalendarDays, Megaphone, Building2, Receipt, PartyPopper,
} from 'lucide-react';

interface DashboardSummary {
    total_employees: number;
    present_today: number;
    present_pct: number;
    on_leave: number;
    open_recruitment: number;
    pending_payroll_total: number;
    open_tickets: number;
    attendance_today: { present: number; absent: number; late: number; on_leave: number };
    attendance_week: { day: string; date: string; present: number }[];
    tickets_by_category: { category: string; count: number; pct: number }[];
    upcoming_birthdays: { user_id: string; name: string; designation: string | null; date: string }[];
}

interface Announcement {
    id: string;
    title: string;
    content: string;
    category: string;
    is_pinned: boolean;
    published_at: string;
    creator: { id: string; first_name: string | null; last_name: string | null } | null;
}

const ANNOUNCEMENT_ICONS: Record<string, React.ElementType> = {
    FACILITIES: Building2,
    HR: Receipt,
    EVENT: PartyPopper,
    IT: Megaphone,
    GENERAL: Megaphone,
};
const ANNOUNCEMENT_ICON_STYLE: Record<string, string> = {
    FACILITIES: 'bg-blue-50 text-blue-600',
    HR: 'bg-green-50 text-green-600',
    EVENT: 'bg-purple-50 text-purple-600',
    IT: 'bg-amber-50 text-amber-600',
    GENERAL: 'bg-gray-100 text-gray-500',
};

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const PIE_COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#94A3B8'];

const ATTENDANCE_LEGEND = [
    { key: 'present', label: 'Present', color: 'bg-blue-600' },
    { key: 'absent', label: 'Absent', color: 'bg-green-500' },
    { key: 'late', label: 'Late', color: 'bg-amber-500' },
    { key: 'on_leave', label: 'On Leave', color: 'bg-violet-500' },
] as const;

const ATTENDANCE_PERIOD_OPTIONS = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
];

const QUICK_ACTIONS = [
    { label: 'Add Employee', icon: PlusCircle, to: '/admin/add-employee', className: 'bg-blue-50 text-blue-600' },
    { label: 'Apply Leave', icon: CalendarClock, to: '/admin/attendance', className: 'bg-green-50 text-green-600' },
    { label: 'Raise Ticket', icon: FileWarning, to: '/admin/tickets', className: 'bg-red-50 text-red-500' },
    { label: 'Run Payroll', icon: Banknote, to: '/admin/payroll', className: 'bg-indigo-50 text-indigo-600' },
    { label: 'Add Asset', icon: PackagePlus, to: '/admin/assets', className: 'bg-amber-50 text-amber-600' },
    { label: 'Upload Document', icon: Upload, to: '/admin/documents', className: 'bg-sky-50 text-sky-600' },
    { label: 'View Reports', icon: BarChart3, to: '/admin/hr-reports', className: 'bg-purple-50 text-purple-600' },
    { label: 'View Calendar', icon: CalendarDays, to: '/admin/attendance', className: 'bg-teal-50 text-teal-600' },
];

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [attendancePeriod, setAttendancePeriod] = React.useState<string>('week');
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-summary', attendancePeriod],
        queryFn: async () => {
            const r = await apiRequest<any>(`${API_ENDPOINTS.HR_REPORT.DASHBOARD_SUMMARY}?period=${attendancePeriod}`);
            return r?.payload as DashboardSummary;
        },
        staleTime: 60000,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: true,
    });

    const { data: announcements, isLoading: announcementsLoading } = useQuery({
        queryKey: ['announcements'],
        queryFn: async () => {
            const r = await apiRequest<any>(`${API_ENDPOINTS.ANNOUNCEMENTS.LIST}?limit=5`);
            return (r?.payload || []) as Announcement[];
        },
        staleTime: 60000,
        placeholderData: keepPreviousData,
    });

    const attendanceTotal = data?.attendance_today
        ? data.attendance_today.present + data.attendance_today.absent + data.attendance_today.late + data.attendance_today.on_leave
        : 0;
    const showPageSkeleton = useShowPageSkeleton(isLoading, announcementsLoading);

    const attendanceToday = data?.attendance_today;

    if (showPageSkeleton) return <PageSkeleton variant="dashboard-admin" />;

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="p-3 rounded-[8px] bg-white">
                <div className="bg-[#F8F8F8] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 py-4">
                    <DashboardStatCard
                                className="bg-white border border-gray-100 rounded-xl shadow-sm"
                                icon={<Users size={20} />}
                                iconClassName="bg-blue-50 text-blue-600"
                                value={data?.total_employees ?? '—'}
                                label="Total Employees"
                                subtext={<Button variant="link" size="sm" animation="none" rounded={false} className="!p-0 !shadow-none !hover:shadow-none h-auto text-blue-600 font-semibold" onClick={() => navigate('/admin/employee-directory')}>View all employees →</Button>}
                            />
                            <DashboardStatCard
                                className="bg-white border border-gray-100 rounded-xl shadow-sm"
                                icon={<UserCheck size={20} />}
                                iconClassName="bg-green-50 text-green-600"
                                value={data?.present_today ?? '—'}
                                label="Present Today"
                                subtext={`${data?.present_pct ?? 0}% of total`}
                            />
                            <DashboardStatCard
                                className="bg-white border border-gray-100 rounded-xl shadow-sm"
                                icon={<CalendarClock size={20} />}
                                iconClassName="bg-amber-50 text-amber-600"
                                value={data?.on_leave ?? '—'}
                                label="On Leave"
                                subtext={<Button variant="link" size="sm" animation="none" rounded={false} className="!p-0 !shadow-none !hover:shadow-none h-auto text-blue-600 font-semibold" onClick={() => navigate('/admin/employee-directory?status=ON_LEAVE')}>View leaves →</Button>}
                            />
                            <DashboardStatCard
                                className="bg-white border border-gray-100 rounded-xl shadow-sm"
                                icon={<UserPlus size={20} />}
                                iconClassName="bg-purple-50 text-purple-600"
                                value={data?.open_recruitment ?? '—'}
                                label="Open Recruitment"
                                subtext={<Button variant="link" size="sm" animation="none" rounded={false} className="!p-0 !shadow-none !hover:shadow-none h-auto text-blue-600 font-semibold" onClick={() => navigate('/admin/onboarding')}>View openings →</Button>}
                            />
                            <DashboardStatCard
                                className="bg-white border border-gray-100 rounded-xl shadow-sm"
                                icon={<Ticket size={20} />}
                                iconClassName="bg-red-50 text-red-500"
                                value={data?.open_tickets ?? '—'}
                                label="Open Tickets"
                                subtext={<Button variant="link" size="sm" animation="none" rounded={false} className="!p-0 !shadow-none !hover:shadow-none h-auto text-blue-600 font-semibold" onClick={() => navigate('/admin/tickets')}>View tickets →</Button>}
                            />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="flex flex-col gap-6 border-none lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Attendance Overview</h2>
                        <div className="w-36">
                            <SearchableSelect
                                options={ATTENDANCE_PERIOD_OPTIONS}
                                value={attendancePeriod}
                                onChange={(v) => setAttendancePeriod(String(v))}
                            />
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data?.attendance_week || []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #F1F5F9', fontSize: 12 }} />
                                <Line type="monotone" dataKey="present" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-gray-50">
                        {ATTENDANCE_LEGEND.map((item) => {
                            const count = attendanceToday?.[item.key] ?? 0;
                            const pct = attendanceTotal > 0 ? Math.round((count / attendanceTotal) * 1000) / 10 : 0;
                            return (
                                <div key={item.key} className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                                    <div>
                                        <p className="text-sm font-black text-gray-900">{count}</p>
                                        <p className="text-[11px] text-gray-400 font-semibold">{item.label} · {pct}%</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card className="flex flex-col gap-4 border-none">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight">Recent Announcements</h2>
                    {!announcements?.length ? (
                        <p className="text-sm text-gray-400 text-center py-8">No announcements yet</p>
                    ) : (
                        <div className="flex flex-col gap-4 max-h-64 overflow-y-auto">
                            {announcements.map((a) => {
                                const Icon = ANNOUNCEMENT_ICONS[a.category] || Megaphone;
                                return (
                                    <div key={a.id} className="flex items-start gap-3">
                                        <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${ANNOUNCEMENT_ICON_STYLE[a.category] || ANNOUNCEMENT_ICON_STYLE.GENERAL}`}>
                                            <Icon size={16} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{a.title}</p>
                                            <p className="text-xs text-gray-500 line-clamp-2">{a.content}</p>
                                        </div>
                                        <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{timeAgo(a.published_at)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="flex flex-col gap-4 border-none">
                    <div className="flex items-center gap-2">
                        <Cake size={18} className="text-pink-500" />
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Upcoming Birthdays</h2>
                    </div>
                    {!data?.upcoming_birthdays?.length ? (
                        <p className="text-sm text-gray-400 text-center py-8">No upcoming birthdays on file</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {data.upcoming_birthdays.map((b) => (
                                <div key={b.user_id} className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-black text-sm flex-shrink-0">
                                        {b.name?.[0] || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{b.designation || '—'}</p>
                                    </div>
                                    <span className="text-xs text-gray-500 font-semibold whitespace-nowrap">{b.date}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="flex flex-col gap-4 border-none">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Open Tickets by Category</h2>
                        <Button variant="link" size="sm" animation="none" rounded={false} className="!p-0 !shadow-none !hover:shadow-none h-auto text-xs text-blue-600 font-semibold shrink-0" onClick={() => navigate('/admin/tickets')}>View all →</Button>
                    </div>
                    {!data?.tickets_by_category?.length ? (
                        <p className="text-sm text-gray-400 text-center py-8">No open tickets</p>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="h-40 w-40 shrink-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={data.tickets_by_category} dataKey="count" nameKey="category" innerRadius={45} outerRadius={70} paddingAngle={2}>
                                            {data.tickets_by_category.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <p className="text-xl font-black text-gray-900">{data.open_tickets}</p>
                                    <p className="text-[10px] text-gray-400 font-semibold">Total</p>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                                {data.tickets_by_category.map((c, i) => (
                                    <div key={c.category} className="flex items-center gap-2 text-xs">
                                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span className="flex-1 truncate text-gray-600 font-medium">{c.category}</span>
                                        <span className="font-black text-gray-900">{c.count}</span>
                                        <span className="text-gray-400">{c.pct}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="flex flex-col gap-4 border-none">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {QUICK_ACTIONS.map((action) => (
                            <Button
                                key={action.label}
                                variant="outline"
                                animation="none"
                                rounded={false}
                                onClick={() => navigate(action.to)}
                                className="!justify-start !font-semibold gap-2 !px-3 !py-3 h-auto !shadow-none border-gray-100 text-left"
                            >
                                <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${action.className}`}>
                                    <action.icon size={16} />
                                </span>
                                <span className="text-xs font-semibold text-gray-700 truncate">{action.label}</span>
                            </Button>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
