import React, { useState, useMemo } from 'react';
import { useGetProjects, ProjectSummary } from '@/services/employeeService';
import { useDebounce } from '@/hooks/useDebounce';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Loader from '@/components/ui/Loader';
import { Star, MoreVertical, Search } from 'lucide-react';
import Input from '@/components/ui/Input';

const SavedProject: React.FC = () => {
    const { data: projects, isLoading } = useGetProjects();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);

    const filteredProjects = React.useMemo(() => {
        if (!projects) return [];
        if (!debouncedSearch) return projects;
        
        const query = debouncedSearch.toLowerCase();
        return projects.filter(project => 
            project.title.toLowerCase().includes(query)
        );
    }, [projects, debouncedSearch]);

    const columns: Column<ProjectSummary>[] = [
        { header: 'S.No', key: 'id', width: '80px' },
        {
            header: 'Project Title',
            key: 'title',
            render: (item) => (
                <div className="flex items-center gap-3">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-gray-900">{item.title}</span>
                </div>
            )
        },
        {
            header: 'Assigned Team',
            key: 'members',
            render: (item) => (
                <div className="flex -space-x-2">
                    {item.members.map((m, i) => (
                        <div key={i} className="h-7 w-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
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
                <div className="flex items-center gap-3 w-40">
                    <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                    <span className="text-[11px] font-black text-gray-400">{item.progress}%</span>
                </div>
            )
        },
        {
            header: 'Status',
            key: 'status',
            render: (item) => (
                <Badge variant="info" className="rounded-lg px-3 py-1 text-[10px] font-black  tracking-tight">
                    {item.status}
                </Badge>
            )
        },
        { header: 'Due Date', key: 'dueDate' },
        {
            header: '',
            key: 'actions',
            render: () => (
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                    <MoreVertical size={18} />
                </button>
            )
        }
    ];

    if (isLoading) return <Loader fullPage size={48} />;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Saved</h1>
                <p className="text-sm text-gray-500 font-medium tracking-tight">Quickly access projects you've starred or bookmarked for easy reference.</p>
            </div>

            <Card className="flex flex-col gap-6 shadow-2xl border-none p-8 rounded-[2rem]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Star size={20} className="text-yellow-400 fill-yellow-400" />
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Starred Projects</h2>
                    </div>
                    <Input
                        placeholder="Search by title..."
                        leftIcon={Search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        containerClassName="w-full max-w-[320px]"
                        className="h-11 rounded-xl"
                    />
                </div>

                <div className="overflow-hidden">
                    <Table
                        columns={columns}
                        data={filteredProjects}
                        className="border-none shadow-none"
                        emptyMessage="No saved projects found."
                    />
                </div>
            </Card>
        </div>
    );
};

export default SavedProject;
