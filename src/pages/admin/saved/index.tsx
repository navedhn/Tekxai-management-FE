import React, { useState } from 'react';
import { useGetSavedProjects, ProjectDetail, useUnsaveProjectMutation } from '@/services/projectService';
import { useDebounce } from '@/hooks/useDebounce';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Loader from '@/components/ui/Loader';
import { Star, Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import ActionModal from '@/components/ui/ActionModal';
import { useToastContext } from '@/components/toast/ToastProvider';

const SavedProject: React.FC = () => {
    const { data: projects, isLoading } = useGetSavedProjects();
    const unsaveMutation = useUnsaveProjectMutation();
    const [searchQuery, setSearchQuery] = useState('');
    const [projectToUnsave, setProjectToUnsave] = useState<ProjectDetail | null>(null);
    const toast = useToastContext();
    const debouncedSearch = useDebounce(searchQuery, 500);

    const handleUnsave = async () => {
        if (!projectToUnsave) return;
        try {
            await unsaveMutation.mutateAsync(projectToUnsave.id);
            toast.success('Project unsaved successfully');
            setProjectToUnsave(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to unsave project');
        }
    };

    const filteredProjects = React.useMemo(() => {
        if (!projects) return [];
        if (!debouncedSearch) return projects;

        const query = debouncedSearch.toLowerCase();
        return projects.filter(project =>
            project.title.toLowerCase().includes(query)
        );
    }, [projects, debouncedSearch]);

    const columns: Column<ProjectDetail>[] = [
        { header: 'S.No', key: 'id', width: '80px', render: (_, index) => index + 1 },
        {
            header: 'Project Title',
            key: 'title',
            render: (item) => (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setProjectToUnsave(item)}
                        className="hover:scale-110 transition-transform cursor-pointer"
                        title="Unsave Project"
                    >
                        <Star size={16} className="text-[#EAB308] fill-[#EAB308]" />
                    </button>
                    <span className="font-bold text-gray-900">{item.title}</span>
                </div>
            )
        },
        {
            header: 'Assigned Team',
            key: 'members',
            render: (item) => (
                <div className="flex -space-x-2">
                    {item.members?.slice(0, 3).map((m, i) => (
                        <div key={i} className="h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-blue-100 overflow-hidden bg-gray-100">
                            {m.avatar ? (
                                <img src={m.avatar} alt={m.first_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 uppercase">
                                    {m.first_name.charAt(0)}
                                </div>
                            )}
                        </div>
                    ))}
                    {item.member_count > 3 && (
                        <div className="h-7 w-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm">
                            +{item.member_count - 3}
                        </div>
                    )}
                    {(!item.members || item.members.length === 0) && (
                        <span className="text-[10px] text-gray-400 font-medium italic">No members</span>
                    )}
                </div>
            )
        },
        { header: 'Projects Hours', key: 'total_hours', render: (item) => `${item.total_hours} Hours` },
        {
            header: 'Progress',
            key: 'progress',
            render: (item) => (
                <div className="flex items-center gap-3 w-40">
                    <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(31,123,255,0.4)]"
                            style={{ width: `${item.progress || 0}%` }}
                        />
                    </div>
                    <span className="text-[11px] font-black text-gray-400 min-w-[30px]">{item.progress || 0}%</span>
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
                const style = statusStyles[item.status] || 'bg-gray-50 text-gray-500 border-gray-100';
                return (
                    <Badge variant="info" className={cn("rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border", style)}>
                        {item.status || 'PENDING'}
                    </Badge>
                );
            }
        },
        { header: 'Due Date', key: 'end_date', render: (item) => item.end_date ? new Date(item.end_date).toLocaleDateString() : 'N/A' },
        {
            header: '',
            key: 'actions',
            render: (item) => (
                <button onClick={() => setProjectToUnsave(item)} className="p-2 hover:bg-yellow-50 rounded-lg text-gray-400 transition-colors">
                    <Star size={18} className="text-yellow-400 fill-yellow-400" />
                </button>
            )
        }
    ];


    // if (isLoading) return <Loader fullPage size={48} />;

    return (
        <div className="flex flex-col gap-8">
            <ActionModal
                isOpen={!!projectToUnsave}
                onClose={() => setProjectToUnsave(null)}
                onConfirm={handleUnsave}
                title="Unsave Project"
                description={`Are you sure you want to unsave "${projectToUnsave?.title}"?`}
                confirmText="Unsave Project"
                loading={unsaveMutation.isPending}
                icon="delete"
            />

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
