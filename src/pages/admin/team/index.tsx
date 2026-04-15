import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Search, Plus, Edit2, Trash2, Filter, Users } from 'lucide-react';
import { useGetTeamsQuery, useDeleteTeamMutation } from '@/services/adminService';
import { useToast } from '@/components/ui/Toast';
import TeamFormModal from '@/components/ui/TeamFormModal';
import Badge from '@/components/ui/Badge';
import ActionModal from '@/components/ui/ActionModal';
import { useDebounce } from '@/hooks/useDebounce';

const teamTypes = [
    { value: 'ALL', label: 'All Teams' },
    { value: 'DEVELOPMENT', label: 'Development' },
    { value: 'DESIGN', label: 'Design' },
    { value: 'QA', label: 'Quality Assurance' },
    { value: 'MANAGEMENT', label: 'Management' }
];

const TeamManagement: React.FC = () => {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);
    const [teamToDelete, setTeamToDelete] = useState<any>(null);
    const debouncedSearch = useDebounce(searchQuery, 500);
    const { data: teamsData, isLoading } = useGetTeamsQuery();
    const deleteTeam = useDeleteTeamMutation();

    const filteredTeams = React.useMemo(() => {
        const records = (teamsData as any)?.payload?.records || (teamsData as any)?.payload || [];
        if (!records) return [];
        
        return records.filter((team: any) => {
            const matchesSearch = !debouncedSearch || 
                team.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                team.description?.toLowerCase().includes(debouncedSearch.toLowerCase());
            
            const matchesType = filterType === 'ALL' || team.type === filterType;
            
            return matchesSearch && matchesType;
        });
    }, [teamsData, debouncedSearch, filterType]);

    const teams = filteredTeams;

    const handleAddTeam = () => {
        setSelectedTeam(null);
        setIsModalOpen(true);
    };

    const handleEditTeam = (team: any) => {
        setSelectedTeam(team);
        setIsModalOpen(true);
    };

    const handleDeleteTeam = (team: any) => {
        setTeamToDelete(team);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!teamToDelete) return;
        deleteTeam.mutate(teamToDelete.id, {
            onSuccess: () => {
                showToast('Team deleted successfully', 'success');
                setIsDeleteModalOpen(false);
                setTeamToDelete(null);
            },
            onError: (err: any) => {
                showToast(err.message || 'Failed to delete team', 'error');
            }
        });
    };

    const columns: Column<any>[] = [
        {
            header: 'S.No',
            key: 'id',
            width: '80px',
            render: (_item, index) => <span className="text-gray-500 font-medium">{index + 1}</span>
        },
        {
            header: 'Team Name',
            key: 'name',
            render: (item) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100">
                        <Users size={18} strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-gray-900 tracking-tight">{item.name}</span>
                </div>
            )
        },
        {
            header: 'Type',
            key: 'type',
            render: (item) => (
                <Badge variant="default" className="font-black uppercase tracking-tighter text-[10px]">
                    {item.type || 'TEAM'}
                </Badge>
            )
        },
        {
            header: 'Description',
            key: 'description',
            render: (item) => (
                <span className="text-gray-500 font-medium line-clamp-1 max-w-[300px]">
                    {item.description || 'No description provided.'}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleEditTeam(item)}
                        className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => handleDeleteTeam(item)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Team Structure – Stay Connected</h1>
                <p className="text-sm text-gray-500 font-medium">Define and manage your organization's teams and hierarchy.</p>
            </div>

            <Card className="flex flex-col gap-8 shadow-2xl border-none p-8 rounded-[2rem]">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <Input
                            placeholder="Search teams..."
                            leftIcon={Search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            containerClassName="w-full lg:min-w-[300px]"
                            className="h-12 rounded-xl"
                        />
                        <div className="w-[220px]">
                            <Select
                                options={teamTypes}
                                value={filterType}
                                onChange={(val) => setFilterType(val as string)}
                                className="h-12 !rounded-xl text-xs font-bold"
                            />
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleAddTeam}
                        className="gap-2 rounded-xl w-full lg:w-auto h-12 font-black px-8 shadow-lg shadow-primary-100"
                    >
                        <Plus size={20} />
                        Add New Team
                    </Button>
                </div>

                <div className="overflow-hidden">
                    <Table
                        columns={columns}
                        data={teams}
                        isLoading={isLoading}
                        emptyMessage="No teams defined yet. Click 'Add New Team' to get started."
                    />
                </div>
            </Card>

            <TeamFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                team={selectedTeam}
            />

            <ActionModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                loading={deleteTeam.isPending}
                title="Delete Team"
                description={`Are you sure you want to delete the team "${teamToDelete?.name}"? This action cannot be undone and may affect associated members.`}
                confirmText="Delete Team"
                icon="delete"
            />
        </div>
    );
};

export default TeamManagement;
