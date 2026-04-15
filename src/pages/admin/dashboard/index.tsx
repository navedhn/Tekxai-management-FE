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
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import { Search, ChevronRight, Play, Clock, CheckCircle, AlertCircle, Briefcase, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import ProjectDetailsSlideOver from '@/components/ui/ProjectDetailsSlideOver';

const Dashboard: React.FC = () => {
    const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
    const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
    const { data: timesheet, isLoading: timesheetLoading } = useGetTimesheet();
    const { data: projects, isLoading: projectsLoading } = useGetProjects();

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
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

    const projectColumns: Column<ProjectSummary>[] = [
        { header: 'S.No', key: 'id' },
        {
            header: 'Project Title',
            key: 'title',
            render: (item) => (
                <button
                    onClick={() => setSelectedProject(item.title)}
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
                        <div key={i} className="h-7 w-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
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
                            className="h-full bg-gradient-to-r from-[#005CDA] to-[#0148FF] rounded-full transition-all duration-1000"
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
                        className={cn("rounded-lg px-3 py-1 text-[10px] font-bold border", style)}
                    >
                        {item.status}
                    </Badge>
                );
            }
        },
        { header: 'Due Date', key: 'dueDate' },
    ];

    if (statsLoading || activityLoading || timesheetLoading || projectsLoading) {
        return <Loader fullPage size={48} />;
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            <ProjectDetailsSlideOver
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
                projectTitle={selectedProject || ''}
                routePrefix="/admin"
            />
            {/* Stats Section */}
            <div className="p-3 rounded-[8px] bg-white">
                <div className='bg-[#F8F8F8] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 py-4'>
                    <div className="flex items-center px-4 md:px-6 py-4 gap-4 overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-100 last:border-b-0 lg:last:border-r-0">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-blue-50 flex items-center justify-center text-primary-600 shrink-0">
                            <CheckCircle size={28} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-2xl md:text-[30px] font-black text-gray-900 leading-tight">{stats?.completedProjects}</h2>
                            <h4 className="text-sm font-bold text-gray-500 tracking-tight truncate">Completed Projects</h4>
                            <span className="text-xs md:text-sm font-medium text-gray-400">Total Hours: <span className="text-primary-600 font-bold">{stats?.totalHours}hr</span></span>
                        </div>
                    </div>

                    <div className="flex items-center px-4 md:px-6 py-4 gap-4 overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-100 last:border-b-0 lg:last:border-r-0">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                            <FileText size={28} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">0{stats?.overdueProjects}</h2>
                            <h4 className="text-sm font-bold text-gray-500 tracking-tight truncate">Overdue Projects</h4>
                            <span className="text-xs md:text-sm font-medium text-gray-400">Total Hours: <span className="text-primary-600 font-bold">{stats?.totalHours}hr</span></span>
                        </div>
                    </div>

                    <div className="flex items-center px-4 md:px-6 py-4 gap-4 overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-100 last:border-b-0 lg:last:border-r-0">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                            <Play size={24} className="fill-red-500" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">{stats?.latestCheckIn}</h2>
                            <h4 className="text-sm font-bold text-gray-500 tracking-tight truncate">Latest Check-in</h4>
                            <span className="text-xs md:text-sm font-medium text-gray-400">Active <span className="text-primary-600 font-bold">2 hours ago</span></span>
                        </div>
                    </div>

                    <div className="flex items-center px-4 md:px-6 py-4 gap-4 overflow-hidden last:border-b-0">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                            <FileText size={28} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">0{stats?.pendingTimesheets}</h2>
                            <h4 className="text-sm font-bold text-gray-500 tracking-tight truncate">Timesheet Updates</h4>
                            <span className="text-xs md:text-sm font-medium text-gray-400">Awaiting review</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Section: Timesheet & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Recent Timesheet */}
                <Card className="lg:col-span-3 flex flex-col gap-6  border-none">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Recent Timesheet</h2>
                    </div>
                    <Table
                        columns={timesheetColumns}
                        data={timesheet || []}
                        className="border-none shadow-none"
                        emptyMessage="No timesheet found."
                    />
                </Card>

                {/* Recent Activity */}
                <Card className="lg:col-span-2 flex flex-col gap-6  border-none">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Recent Activity</h2>
                        <button className="text-xs font-bold text-primary-500 hover:underline flex items-center gap-1 shrink-0">
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activity?.map((act) => (
                            <div
                                key={act.id}
                                className="group cursor-pointer relative rounded-[1.25rem] border border-gray-100 overflow-hidden"
                            >
                                {/* Image */}
                                <img
                                    src={act.image}
                                    alt={act.title}
                                    className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-110"
                                />

                                {/* Top Right Badge */}
                                <div className="absolute top-3 right-3 z-20">
                                    <Badge
                                        variant="info"
                                        className={cn(
                                            "text-[10px] font-black px-2 py-0.5 rounded-lg border-none",
                                            act.progress >= 90
                                                ? "bg-[#005CDA] text-white"
                                                : act.progress >= 50
                                                    ? "bg-[#12B76A] text-white"
                                                    : "bg-[#F04438] text-white"
                                        )}
                                    >
                                        {act.progress}%
                                    </Badge>
                                </div>

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center">

                                    {/* Top Content (slide from top) */}
                                    <div className="transform -translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                        <button className="px-4 py-1.5 text-xs bg-white text-black rounded-full font-semibold shadow">
                                            View
                                        </button>
                                    </div>

                                    {/* Title (center fixed) */}
                                    <span className="text-white font-bold text-sm mt-3 text-center px-2">
                                        {act.title}
                                    </span>

                                    {/* Bottom Content (slide from bottom) */}
                                    <div className="mt-2 transform translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                                        <span className="text-xs text-gray-200">
                                            {"12 Apr 2026"} • {"10:30 AM"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Bottom Section: Projects Summary */}
            <Card className="flex flex-col gap-6  border-none">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 text-primary-500 rounded-xl">
                            <Briefcase size={20} />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Projects Summary</h2>
                    </div>
                    <button className="text-xs font-black text-primary-500 hover:underline flex items-center gap-1 shrink-0">
                        View All <ChevronRight size={14} />
                    </button>
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
