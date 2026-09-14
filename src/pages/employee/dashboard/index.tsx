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
import { cn } from '@/utils/cn';
import ProjectDetailsSlideOver from '@/components/ui/ProjectDetailsSlideOver';
import { DashboardStatCard } from '@/components';
import { PageSkeleton } from '@/components/skeletons';
import { useShowPageSkeleton } from '@/hooks/useShowPageSkeleton';
import RecentActivityCard from '@/components/dashboard/RecentActivityCard';
import TimeTrackerCard from '@/features/employee-dashboard/TimeTrackerCard';
import { useTimeTracker } from '@/features/employee-dashboard/useTimeTracker';

const EmployeeDashboard: React.FC = () => {
    const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
    const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
    const { data: timesheet, isLoading: timesheetLoading } = useGetTimesheet();
    const { data: projects, isLoading: projectsLoading } = useGetProjects();
    const { trackerState, seconds, loading: trackerLoading } = useTimeTracker();
    const showPageSkeleton = useShowPageSkeleton(
        statsLoading,
        activityLoading,
        timesheetLoading,
        projectsLoading,
        trackerLoading,
    );

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const itemsPerPage = 8;

    const filteredProjects = useMemo(() => {
        if (!projects) return [];
        return projects.filter(project =>
            project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

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
                    className="text-left font-black text-(--color-text-primary) transition-colors hover:text-primary-500 hover:underline underline-offset-4"
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
                    <span className="text-[10px] font-bold text-(--color-text-secondary)">{item.progress}%</span>
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

    if (showPageSkeleton) return <PageSkeleton variant="dashboard-employee" />;

    return (
        <div className="flex flex-col gap-8 pb-10">
            <ProjectDetailsSlideOver
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
                projectId={selectedProject}
                routePrefix="/employee"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <DashboardStatCard
                    className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
                    icon={<CheckCircle size={20} />}
                    iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
                    value={stats?.completedProjects ?? 0}
                    label="Completed Projects"
                    subtext={
                        <>
                            Total hours:{' '}
                            <span className="text-[#005CDA] font-semibold">{stats?.totalHours ?? 0}hr</span>
                        </>
                    }
                />
                <DashboardStatCard
                    className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
                    icon={<Play size={18} className="fill-current text-(--color-brand-primary)" />}
                    iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
                    value={stats?.latestCheckIn ?? '—'}
                    label="Latest Check-in"
                    subtext="Today's attendance"
                />
                <DashboardStatCard
                    className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
                    icon={<FileText size={20} />}
                    iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
                    value={stats?.pendingTimesheets ?? 0}
                    label="Pending Timesheets"
                    subtext="Edit requests awaiting"
                />
            </div>

            <TimeTrackerCard
                trackerState={trackerState}
                seconds={seconds}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-5 flex flex-col gap-4 bg-white border border-(--color-card-border) shadow-sm !p-0 overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-(--color-card-border)">
                        <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
                            <Play size={16} />
                        </div>
                        <h2 className="text-lg font-black text-(--color-text-primary) tracking-tight">Recent Activity</h2>
                    </div>
                    <div className="px-5 pb-5">
                    {!activity || activity.length === 0 ? (
                        <p className="text-sm text-(--color-text-secondary) text-center py-10">
                            No recent activity yet.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {activity.map((act) => (
                                <RecentActivityCard key={act.id} activity={act} />
                            ))}
                        </div>
                    )}
                    </div>
                </Card>

                <Card className="lg:col-span-7 flex flex-col gap-4 bg-white border border-(--color-card-border) shadow-sm !p-0 overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-(--color-card-border)">
                        <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
                            <FileText size={16} />
                        </div>
                        <h2 className="text-lg font-black text-(--color-text-primary) tracking-tight">Recent Timesheet</h2>
                    </div>
                    <div className="px-4 pb-4">
                        <Table
                            columns={timesheetColumns}
                            data={timesheet || []}
                            className="border-none shadow-none"
                            emptyMessage="No timesheet entries yet."
                            headerClassName="bg-(--color-elevated) border-none rounded-xl"
                        />
                    </div>
                </Card>
            </div>

            <Card className="flex flex-col gap-4 bg-white border border-(--color-card-border) shadow-sm !p-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4 border-b border-(--color-card-border)">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
                            <Briefcase size={16} />
                        </div>
                        <h2 className="text-lg font-black text-(--color-text-primary) tracking-tight">Projects Summary</h2>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-secondary)" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-(--color-card-border) rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none transition-all"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>
                <div className="px-4 pb-4">
                    <Table
                        columns={projectColumns}
                        data={paginatedProjects}
                        emptyMessage="No projects found."
                        headerClassName="bg-(--color-elevated) border-none rounded-xl"
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
