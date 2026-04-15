import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, Plus, Edit2, Trash2, Filter } from 'lucide-react';
import { useFetchUsersQuery, useDeleteUserMutation } from '@/services/userService';
import { useToast } from '@/components/ui/Toast';
import UserFormModal from '@/components/ui/UserFormModal';
import Badge from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import ActionModal from '@/components/ui/ActionModal';
import { useDebounce } from '@/hooks/useDebounce';

const UserManagement: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const debouncedSearch = useDebounce(searchQuery, 500);

    const { data: usersData, isLoading, refetch } = useFetchUsersQuery({});
    const deleteUser = useDeleteUserMutation();

    const filteredUsers = React.useMemo(() => {
        const payload = (usersData as any)?.payload?.records || (usersData as any)?.payload || [];
        if (!payload) return [];
        if (!debouncedSearch) return payload;

        const query = debouncedSearch.toLowerCase();
        return payload.filter((user: any) =>
            user.first_name?.toLowerCase().includes(query) ||
            user.last_name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.department?.toLowerCase().includes(query)
        );
    }, [usersData, debouncedSearch]);

    const users = (usersData as any)?.payload?.records || (usersData as any)?.payload || [];

    const handleAddUser = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user: any) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = (user: any) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!userToDelete) return;
        deleteUser.mutate(userToDelete.id, {
            onSuccess: () => {
                showToast('User deleted successfully', 'success');
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
            },
            onError: (err: any) => {
                showToast(err.message || 'Failed to delete user', 'error');
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
            header: 'User',
            key: 'first_name',
            render: (item) => (
                <div
                    onClick={() => navigate(`/admin/profile/${item.id}`)}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-black uppercase border-2 border-primary-100 group-hover:border-primary-500 transition-colors">
                        {item.first_name?.[0]}{item.last_name?.[0]}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-gray-900 leading-tight group-hover:text-primary-600 transition-colors">
                            {item.first_name} {item.last_name}
                        </span>
                        <span className="text-xs text-gray-400 font-bold">{item.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Department',
            key: 'department',
            render: (item) => <span className="font-bold text-gray-700">{item.department || 'N/A'}</span>
        },
        {
            header: 'Role',
            key: 'role',
            render: (item) => (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-black tracking-wider uppercase">
                    {item.role?.name || item.role || 'GUEST'}
                </span>
            )
        },
        {
            header: 'Status',
            key: 'status',
            align: 'center',
            render: (item) => (
                <Badge
                    variant={item.status === 'ACTIVE' ? 'success' : 'error'}
                    className="font-black uppercase tracking-tighter text-[10px]"
                >
                    {item.status || 'INACTIVE'}
                </Badge>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleEditUser(item)}
                        className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => handleDeleteUser(item)}
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
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">User Management – Control Access</h1>
                <p className="text-sm text-gray-500 font-medium">Manage platform users, assign roles, and monitor status.</p>
            </div>

            <Card className="flex flex-col gap-8 shadow-2xl border-none p-8 rounded-[2rem]">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <Input
                            placeholder="Search by name or email..."
                            leftIcon={Search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            containerClassName="w-full lg:min-w-[400px]"
                            className="h-12 rounded-xl"
                        />
                        <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all border border-gray-100">
                            <Filter size={20} />
                        </button>                    </div>

                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleAddUser}
                        className="gap-2 rounded-xl w-full lg:w-auto h-12 font-black px-8 shadow-lg shadow-primary-100"
                    >
                        <Plus size={20} />
                        Add New Member
                    </Button>
                </div>

                <div className="overflow-hidden">
                    <Table
                        columns={columns}
                        data={filteredUsers}
                        emptyMessage="No users found."
                    />
                </div>
            </Card>

            <UserFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={selectedUser}
            />

            <ActionModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                loading={deleteUser.isPending}
                title="Delete User"
                description={`Are you sure you want to delete "${userToDelete?.first_name} ${userToDelete?.last_name}"? This action cannot be undone and will remove all their access.`}
                confirmText="Delete User"
                icon="delete"
            />
        </div>
    );
};

export default UserManagement;
