import React, { useState, useMemo } from 'react';
import {
    useGetDashboardStats,
    useGetRecentActivity,
    useGetTimesheet,
    TimesheetEntry
} from '@/services/employeeService';
import { useGetProjects, ProjectDetail } from '@/services/projectService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { Search, Play, CheckCircle, Briefcase, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import ProjectDetailsSlideOver from '@/components/ui/ProjectDetailsSlideOver';
import { StatSkeleton, CardSkeleton } from '@/components/skeletons';
import DashboardStatCard from '@/components/ui/DashboardStatCard';
import RecentActivityCard from '@/components/dashboard/RecentActivityCard';

const Dashboard: React.FC = () => {
    const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
    const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
    const { data: timesheet, isLoading: timesheetLoading } = useGetTimesheet();
    const { data: projects, isLoading: projectsLoading } = useGetProjects();

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const itemsPerPage = 8;

    const filteredProjects = useMemo(() => {
        if (!projects) return [];
        return projects.filter(project =>
            (project.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.status || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

    const paginatedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProjects, currentPage]);

    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

    const timesheetColumns: Column<TimesheetEntry>[] = [
        { header: 'Date', key: 'date' },
        { header: 'Check-in', key: 'checkIn' },
        { header: 'Check-out', key: 'checkOut' },
        { header: 'Total', key: 'duration' },
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
                        className={cn("rounded-lg px-3 py-1 text-[10px] font-bold tracking-wider border", style)}
                    >
                        {item.status}
                    </Badge>
                );
            }
        },
    ];

    const projectColumns: Column<ProjectDetail>[] = [

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
                    {item.members?.map((m: any, i) => (
                        <div key={i} className="h-7 w-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
                            {typeof m === 'string' ? m : (m?.first_name ? m.first_name[0] : 'U')}
                        </div>
                    ))}
                </div>
            )
        },
        { header: 'Projects Hours', key: 'total_hours', render: (item) => `${item.total_hours || 0} Hours` },
        {
            header: 'Progress',
            key: 'progress',
            render: (item) => (
                <div className="flex flex-col gap-1 w-32">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#005CDA] to-[#0148FF] rounded-full transition-all duration-1000"
                            style={{ width: `${item.progress || 0}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{item.progress || 0}%</span>
                </div>
            )
        },
        {
            header: 'Status',
            key: 'status',
            render: (item) => {
                const statusStyles: Record<string, string> = {
                    'IN_PROGRESS': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
                    'OVERDUE': 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
                    'PENDING': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
                    'COMPLETED': 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
                };
                const statusKey = (item.status || 'PENDING').toUpperCase();
                const style = statusStyles[statusKey] || 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]';
                return (
                    <Badge
                        variant="info"
                        className={cn("rounded-lg px-3 py-1 text-[10px] font-bold border", style)}
                    >
                        {statusKey.replace('_', ' ')}
                    </Badge>
                );
            }
        },
        { header: 'Due Date', key: 'due_date', render: (item) => item.due_date ? new Date(item.due_date).toLocaleDateString() : 'N/A' },
    ];

    return (
        <div className="flex flex-col gap-8 pb-10">
            <ProjectDetailsSlideOver
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
                projectId={selectedProject}
                routePrefix="/admin"
            />
            <div className="p-3 rounded-[8px] bg-white">
                <div className='bg-[#F8F8F8] grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3 py-4'>
                    {statsLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
                    ) : (
                        <>
                            <DashboardStatCard
                                showDivider
                                icon={<CheckCircle size={20} />}
                                iconClassName="bg-blue-50 text-primary-600"
                                value={stats?.completedProjects}
                                label="Completed Projects"
                                subtext={<>Total Hours: <span className="text-primary-600 font-semibold">{stats?.totalHours}hr</span></>}
                            />
                            <DashboardStatCard
                                showDivider
                                icon={<FileText size={20} />}
                                iconClassName="bg-orange-50 text-orange-500"
                                value={`0${stats?.overdueProjects}`}
                                label="Overdue Projects"
                                subtext={<>Total Hours: <span className="text-primary-600 font-semibold">{stats?.totalHours}hr</span></>}
                            />
                            <DashboardStatCard
                                showDivider
                                icon={<Play size={18} className="fill-red-500" />}
                                iconClassName="bg-red-50 text-red-500"
                                value={stats?.latestCheckIn}
                                label="Latest Check-in"
                                subtext={<>Active <span className="text-primary-600 font-semibold">2 hours ago</span></>}
                            />
                            <DashboardStatCard
                                icon={<FileText size={20} />}
                                iconClassName="bg-sky-50 text-sky-600"
                                value={`0${stats?.pendingTimesheets}`}
                                label="Timesheet Updates"
                                subtext="Awaiting review"
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <Card isLoading={timesheetLoading} className="lg:col-span-3 flex flex-col gap-6 border-none">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Recent Timesheet</h2>
                    </div>
                    <Table
                        columns={timesheetColumns}
                        data={timesheet || []}
                        isLoading={timesheetLoading}
                        className="border-none shadow-none"
                        emptyMessage="No timesheet found."
                    />
                </Card>

                <Card isLoading={activityLoading} className="lg:col-span-2 flex flex-col gap-6 border-none">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Recent Activity</h2>
                    </div>
                    {activityLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <CardSkeleton key={i} className="!p-0 !bg-transparent !border-0 !shadow-none" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activity?.map((act) => (
                                <RecentActivityCard key={act.id} activity={act} />
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <Card isLoading={projectsLoading} className="flex flex-col gap-6 border-none">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 text-primary-500 rounded-xl">
                            <Briefcase size={20} />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Projects Summary</h2>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                    <Input
                        placeholder="Search projects..."
                        leftIcon={Search}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        containerClassName=""
                    />
                </div>
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
                    emptyMessage="No projects found."
                />
            </Card>
        </div>
    );
};

export default Dashboard;
