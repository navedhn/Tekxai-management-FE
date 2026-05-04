import React from 'react';
import { useGetProjects, ProjectSummary } from '@/services/employeeService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Loader from '@/components/ui/Loader';
import { Star, MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';

const EmployeeSaved: React.FC = () => {
    const { data: projects, isLoading } = useGetProjects();

    const columns: Column<ProjectSummary>[] = [
        { header: 'Project Title', key: 'title' },
        {
            header: 'Member',
            key: 'members',
            render: (item) => (
                <div className="flex -space-x-2">
                    {item.members.map((m, i) => (
                        <div key={i} className="h-7 w-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm">
                            {m}
                        </div>
                    ))}
                </div>
            )
        },
        { header: 'Projects Hours', key: 'hours', render: (item) => `${item.hours} Hours` },
        {
            header: 'Status',
            key: 'status',
            render: (item) => (
                <Badge variant="info" className="rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tight">
                    {item.status}
                </Badge>
            )
        },
        { header: 'Due Date', key: 'dueDate' },
        {
            header: '',
            key: 'actions',
            render: () => (
                <div className="flex items-center gap-2">
                    <button className="p-2 text-yellow-400 hover:bg-yellow-50 rounded-lg transition-all">
                        <Star size={18} fill="currentColor" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <MoreHorizontal size={18} />
                    </button>
                </div>
            )
        }
    ];

    // if (isLoading) return <Loader fullPage size={48} />;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Saved Projects</h1>
                <p className="text-sm text-gray-500 font-medium">Quick access to projects you've bookmarked for easy monitoring.</p>
            </div>

            <Card className="flex flex-col gap-6 shadow-2xl border-none">
                <Table
                    columns={columns}
                    data={projects?.slice(0, 3) || []}
                    className="border-none shadow-none"
                />
            </Card>
        </div>
    );
};

export default EmployeeSaved;
