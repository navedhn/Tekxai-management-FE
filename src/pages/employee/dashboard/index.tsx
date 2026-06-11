import React, { useState, useMemo } from 'react';
import {
    useGetDashboardStats,
    useGetRecentActivity,
    useGetTimesheet,
    useGetProjects,
    ProjectSummary,
    TimesheetEntry
} from '@/services/employeeService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { Search, Play, CheckCircle, Briefcase, FileText } from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import { cn } from '@/utils/cn';
import ProjectDetailsSlideOver from '@/components/ui/ProjectDetailsSlideOver';
import { CardSkeleton, StatSkeleton, DashboardStatCard } from '@/components';
import RecentActivityCard from '@/components/dashboard/RecentActivityCard';
import { TicketsSummaryCard } from '@/components/tickets';
import TimeTrackerCard from '@/features/employee-dashboard/TimeTrackerCard';
import { useTimeTracker } from '@/features/employee-dashboard/useTimeTracker';

const EmployeeDashboard: React.FC = () => {
    const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
    const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
    const { data: timesheet, isLoading: timesheetLoading } = useGetTimesheet();
    const { data: projects, isLoading: projectsLoading } = useGetProjects();
    const {
        trackerState,
        seconds,
        handleCheckIn,
        handleBreak,
        handleResume,
        handleCheckOut,
    } = useTimeTracker(10);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'hours' | 'days'>('hours');
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const itemsPerPage = 8;

    // 🔍 Filter projects
    const filteredProjects = useMemo(() => {
        if (!projects) return [];
        return projects.filter(project =>
            project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

    // 📄 Paginate projects
    const paginatedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProjects, currentPage]);

    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

    const timesheetColumns: Column<TimesheetEntry>[] = [
        { header: 'Date', key: 'date', width: '100px' },
        { header: 'Check-in', key: 'checkIn' },
        { header: 'Check-out', key: 'checkOut' },
        { header: 'Total', key: 'duration' },
        {
            header: 'Status',
            key: 'status',
            render: (item) => {
                const statusStyles: Record<string, string> = {
                    'In Progress': 'bg-[#F2F4F7] text-[#344054] border-[#EAECF0]',
                    'Overdue': 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
                    'Pending': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
                    'Completed': 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
                };
                const style = statusStyles[item.status] || '';
                return (
                    <Badge
                        variant="info"
                        className={cn("rounded-lg px-2 py-0.5 text-[10px] font-bold border", style)}
                    >
                        {item.status}
                    </Badge>
                );
            }
        },
    ];

    const projectColumns: Column<ProjectSummary>[] = [
        { header: 'S.No', key: 'id', width: '60px' },
        {
            header: 'Project Title',
            key: 'title',
            render: (item) => (
                <button
                    onClick={() => setSelectedProject(item.id)}
                    className="text-left font-black text-gray-900 transition-colors hover:text-primary-500 hover:underline underline-offset-4"
                >
                    {item.title}
                </button>
            )
        },
        {
            header: 'Member',
            key: 'members',
            render: (item) => (
                <div className="flex -space-x-2">
                    {item.members.map((m, i) => (
                        <div key={i} className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-blue-50">
                            {m}
                        </div>
                    ))}
                </div>
            )
        },
        { header: 'Projects Hours', key: 'hours', render: (item) => `${item.hours} Hours` },
        {
            header: 'Progress',
            key: 'progress',
            render: (item) => (
                <div className="flex flex-col gap-1 w-32">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#005CDA] to-[#0148FF] rounded-full"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{item.progress}%</span>
                </div>
            )
        },
        {
            header: 'Status',
            key: 'status',
            render: (item) => {
                const statusStyles: Record<string, string> = {
                    'In Progress': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
                    'Overdue': 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
                    'Pending': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
                    'Completed': 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
                };
                const style = statusStyles[item.status] || '';
                return (
                    <Badge
                        variant="info"
                        className={cn("rounded-lg px-2 py-0.5 text-[10px] font-bold border", style)}
                    >
                        {item.status}
                    </Badge>
                );
            }
        },
        { header: 'Due Date', key: 'dueDate' },
    ];

    return (
        <div className="flex flex-col gap-8 pb-10">
            <ProjectDetailsSlideOver
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
                projectId={selectedProject}
                routePrefix="/employee"
            />

            {/* Top Stats Section */}
            <div className="flex flex-col lg:flex-row gap-6 items-start p-3 rounded-[8px] bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-3 flex-1 w-full bg-[#F8F8F8] lg:w-auto">
                    {statsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
                    ) : (
                        <>
                            <DashboardStatCard
                                showDivider
                                icon={<CheckCircle size={20} />}
                                iconClassName="bg-[#005CDA1A] text-[#005CDA]"
                                value={stats?.completedProjects}
                                label="Completed Projects"
                                subtext={<>Total Hours: <span className="text-[#005CDA] font-semibold">{stats?.totalHours}hr</span></>}
                            />
                            <DashboardStatCard
                                showDivider
                                icon={<Play size={18} className="fill-[#F04438]" />}
                                iconClassName="bg-[#FF58551A] text-[#F04438]"
                                value={stats?.latestCheckIn}
                                label="2 hours ago"
                                subtext={<>Latest Check-in <span className="text-[#005CDA] font-semibold">{stats?.totalHours}hr</span></>}
                            />
                            <DashboardStatCard
                                icon={<FileText size={20} />}
                                iconClassName="bg-[#F0F9FF] text-[#0086C9]"
                                value={`0${stats?.pendingTimesheets}`}
                                label="Pending Timesheet"
                                subtext="Edit requests awaiting"
                            />
                        </>
                    )}
                </div>



                {/* Hours/Days Toggle */}
                <Tabs
                    options={['Hours', 'Days']}
                    value={viewMode === 'hours' ? 'Hours' : 'Days'}
                    onChange={(val) => setViewMode(val === 'Hours' ? 'hours' : 'days')}
                    size="sm"
                    tabClassName='py-3 px-4 w-full justify-center text-[14px] font-medium font-inter'
                    className='flex flex-col w-full justify-center items-center min-h-[100px] min-w-[140px]'
                />
            </div>

            <TimeTrackerCard
                trackerState={trackerState}
                seconds={seconds}
                onCheckIn={handleCheckIn}
                onBreak={handleBreak}
                onResume={handleResume}
                onCheckOut={handleCheckOut}
            />

            <TicketsSummaryCard />

            {/* Middle Section: Activity & Timesheet */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Recent Activity */}
                <Card className="lg:col-span-5 flex flex-col gap-6 bg-white border-none shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Recent Activity</h2>

                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {activityLoading ? (
                            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                        ) : activity?.map((act) => (
                            <RecentActivityCard key={act.id} activity={act} />
                        ))}
                    </div>
                </Card>

                {/* Recent Timesheet */}
                <Card className="lg:col-span-7 flex flex-col gap-6 bg-white border-none shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Recent Timesheet</h2>
                    </div>
                    <div className="">
                        <Table
                            columns={timesheetColumns}
                            data={timesheet || []}
                            isLoading={timesheetLoading}
                            className="border-none shadow-none"
                        />
                    </div>
                </Card>
            </div>

            {/* Bottom Section: Projects Summary */}
            <Card className="flex flex-col gap-6 bg-white border-none shadow-sm">
                <div className="flex flex-col    gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 text-gradient-to-b from-[#005CDA] to-[#001F4A] rounded-xl">
                            <Briefcase size={20} className="text-[#005CDA]" />
                        </div>
                        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Projects Summary</h2>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none transition-all"
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div className="">
                    <Table
                        columns={projectColumns}
                        data={paginatedProjects}
                        isLoading={projectsLoading}
                        pagination={{
                            currentPage: currentPage,
                            totalPages: totalPages,
                            onPageChange: setCurrentPage,
                            totalEntries: filteredProjects.length,
                            entriesPerPage: itemsPerPage
                        }}
                    />
                </div>
            </Card>
        </div>
    );
};

export default EmployeeDashboard;
