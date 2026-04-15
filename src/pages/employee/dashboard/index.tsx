import React, { useState, useMemo, useEffect } from 'react';
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
import Loader from '@/components/ui/Loader';
import { Search, ChevronRight, Play, Clock, CheckCircle, Briefcase, FileText, Send, Coffee, Square, Pause } from 'lucide-react';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { cn } from '@/utils/cn';
import { useToast } from '@/components/ui/Toast';
import ProjectDetailsSlideOver from '@/components/ui/ProjectDetailsSlideOver';

const EmployeeDashboard: React.FC = () => {
    const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
    const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
    const { data: timesheet, isLoading: timesheetLoading } = useGetTimesheet();
    const { data: projects, isLoading: projectsLoading } = useGetProjects();
    const { showToast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'hours' | 'days'>('hours');
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const itemsPerPage = 8;

    // Tracker State
    const [trackerState, setTrackerState] = useState<'idle' | 'tracking' | 'paused'>('idle');
    const [seconds, setSeconds] = useState(10); // Defaulting to 10 for matching image, usually 0

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (trackerState === 'tracking') {
            interval = setInterval(() => setSeconds(s => s + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [trackerState]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h}h:${m}m:${s}s`;
    };

    const handleCheckIn = () => {
        setTrackerState('tracking');
        showToast('Tracker Started For Today\'s Task..', 'success');
    };

    const handleBreak = () => {
        setTrackerState('paused');
        showToast('Tracker Paused For Break..', 'warning');
    };

    const handleResume = () => {
        setTrackerState('tracking');
        showToast('Tracker Started For Today\'s Task..', 'success');
    };

    const handleCheckOut = () => {
        setTrackerState('idle');
        setSeconds(0);
        showToast('Successfully Checked Out', 'info');
    };

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

    if (statsLoading || activityLoading || timesheetLoading || projectsLoading) {
        return <Loader fullPage size={48} />;
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            <ProjectDetailsSlideOver
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
                projectTitle={selectedProject || ''}
                routePrefix="/employee"
            />

            {/* Top Stats Section */}
            <div className="flex flex-col lg:flex-row gap-6 items-start p-3 rounded-[8px] bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-3 flex-1 w-full bg-[#F8F8F8] lg:w-auto">
                    {/* Projects Card */}
                    <div className="flex items-center px-2 gap-3 overflow-hidden border-r-[1px] border-[#00000014]">
                        <div className="h-20 w-20 rounded-md bg-[#005CDA1A] flex items-center justify-center text-[#005CDA]">
                            <CheckCircle size={28} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-[30px] font-[#181D27] text-gray-900 leading-none">{stats?.completedProjects}</h2>
                            <h4 className="text-[14px] font-medium text-[#252525] mt-1  tracking-tight">Completed Projects</h4>
                            <span className="text-[14px] font-inter text-[#252525]">Total Hours: <span className="text-[#005CDA] font-bold">{stats?.totalHours}hr</span></span>
                        </div>
                    </div>
                    <div className="flex items-center px-2 gap-4 border-r-[1px] border-[#00000014]">
                        <div className="h-20 w-20 rounded-md bg-[#FF58551A] flex items-center justify-center text-[#F04438] ">
                            <Play size={24} className="fill-[#F04438]" />
                        </div>
                        <div className="flex flex-col ">
                            <h2 className="text-3xl font-black text-gray-900 leading-none">{stats?.latestCheckIn}</h2>
                            <h4 className="text-[14px] font-medium font-inter text-[#252525] mt-1 tracking-tight">2 hours ago</h4>
                            <span className="text-[14px]  font-inter text-gray-400">Latest Check-in <span className="text-[#005CDA] font-bold">{stats?.totalHours}hr</span></span>
                        </div>
                    </div>
                    <div className="flex items-center px-2 gap-4 ">
                        <div className="h-20 w-20 rounded-md bg-[#F0F9FF] flex items-center justify-center text-[#0086C9] ">
                            <Badge variant="info" className="bg-transparent border-none p-0"><FileText size={28} /></Badge>
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-3xl font-black text-gray-900 leading-none">0{stats?.pendingTimesheets}</h2>
                            <h4 className="text-[14px] font-bold font-inter text-[#252525] mt-1 tracking-tight">Pending Timesheet</h4>
                            <span className="text-[14px]  font-inter text-gray-400">Edit requests awaiting</span>
                        </div>
                    </div>
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

            {/* Time Tracker Section */}
            <Card className="bg-white border-none shadow-sm py-5 px-8">
                {trackerState === 'idle' && (
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">Time Tracker</h2>
                            <p className="text-xs text-gray-400 font-bold">Start tracking your time</p>
                        </div>
                        <Button variant="primary" className="rounded-xl px-10 h-11 flex items-center gap-2" onClick={handleCheckIn}>
                            <Play size={18} className="fill-white" />
                            <span>Check In</span>
                        </Button>
                    </div>
                )}

                {trackerState === 'paused' && (
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">Time Tracker Paused</h2>
                            <p className="text-xs text-gray-400 font-bold">Start tracking your time</p>
                        </div>
                        <Button variant="primary" className="rounded-xl px-10 h-11 flex items-center gap-2" onClick={handleResume}>
                            <Play size={18} className="fill-white" />
                            <span>Resume</span>
                        </Button>
                    </div>
                )}

                {trackerState === 'tracking' && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Custom Large Timer Output */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-4 bg-[#F8F9FA] border border-gray-100 rounded-2xl px-6 py-2">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-gray-900 leading-none tracking-tight">{formatTime(seconds)}</span>
                                    <span className="text-[11px] text-gray-400 font-bold mt-0.5">Today's Time</span>
                                </div>
                                <div className="h-8 w-8 ml-4 rounded-full bg-white flex items-center justify-center border border-gray-100 text-gray-400">
                                    <Clock size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Tracker Actions */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl px-6 h-11 flex items-center gap-2 bg-[#FFA94D]/10 hover:bg-[#FFA94D]/20 text-[#E8590C] border-none font-bold"
                                onClick={handleBreak}
                            >
                                <Coffee size={18} />
                                <span>Break</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-xl px-6 h-11 flex items-center gap-2 bg-[#FF6B6B]/10 hover:bg-[#FF6B6B]/20 text-[#C92A2A] border-none font-bold"
                                onClick={handleCheckOut}
                            >
                                <Square size={16} strokeWidth={3} className="fill-current" />
                                <span>Check Out</span>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Middle Section: Activity & Timesheet */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Recent Activity */}
                <Card className="lg:col-span-5 flex flex-col gap-6 bg-white border-none shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Recent Activity</h2>
                        <button className="text-xs font-black text-primary-500 hover:underline flex items-center gap-1 group">
                            View All <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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

                {/* Recent Timesheet */}
                <Card className="lg:col-span-7 flex flex-col gap-6 bg-white border-none shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Recent Timesheet</h2>
                    </div>
                    <div className="">
                        <Table
                            columns={timesheetColumns}
                            data={timesheet || []}
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
