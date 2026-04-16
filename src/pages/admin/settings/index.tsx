import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Tabs from '@/components/ui/Tabs';
import Table, { Column } from '@/components/ui/Table';
import { Search, Filter, Mail, Calendar, Info, Clock, Plus, Trash2, Edit2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useGetInvitesQuery, useDeleteInviteMutation } from '@/services/inviteService';
import { useGetMySettingsQuery, useUpdatePreferencesMutation, useChangePasswordMutation } from '@/services/settingsService';
import InviteMemberModal from '@/components/ui/InviteMemberModal';
import ActionModal from '@/components/ui/ActionModal';
import { useDebounce } from '@/hooks/useDebounce';

const Setting: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('security');
    const [notifications, setNotifications] = useState(true);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedInvite, setSelectedInvite] = useState<any>(null);

    // Invites filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [inviteToDelete, setInviteToDelete] = useState<any>(null);
    const debouncedSearch = useDebounce(search, 500);

    const { data: invitesData, isLoading: isLoadingInvites } = useGetInvitesQuery({}, activeTab === 'invites');
    
    const { data: settingsData } = useGetMySettingsQuery();
    const updatePreferences = useUpdatePreferencesMutation();
    const changePassword = useChangePasswordMutation();

    React.useEffect(() => {
        if ((settingsData as any)?.payload) {
            setNotifications((settingsData as any).payload.show_notifications ?? true);
        }
    }, [settingsData]);

    const filteredInvites = React.useMemo(() => {
        const payload = (invitesData as any)?.payload?.records || (invitesData as any)?.payload || [];
        if (!payload) return [];

        return payload.filter((invite: any) => {
            const matchesSearch = !debouncedSearch ||
                invite.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                invite.department?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                invite.designation?.toLowerCase().includes(debouncedSearch.toLowerCase());

            const matchesStatus = !statusFilter || invite.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [invitesData, debouncedSearch, statusFilter]);

    const deleteInvite = useDeleteInviteMutation();

    const handleNotificationsToggle = () => {
        const newValue = !notifications;
        setNotifications(newValue);
        updatePreferences.mutate({
            show_notifications: newValue,
            language: (settingsData as any)?.payload?.language || 'en'
        }, {
            onSuccess: () => showToast('Preferences updated', 'success'),
            onError: (err: any) => {
                setNotifications(!newValue);
                showToast(err.message || 'Failed to update preferences', 'error');
            }
        });
    };

    const handleSave = () => {
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return showToast('Please fill all password fields', 'error');
        }
        if (newPassword !== confirmNewPassword) {
            return showToast('New passwords do not match', 'error');
        }
        changePassword.mutate({
            old_password: oldPassword,
            new_password: newPassword,
            confirm_new_password: confirmNewPassword
        }, {
            onSuccess: () => {
                showToast('Password updated successfully!', 'success');
                setOldPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            },
            onError: (err: any) => {
                showToast(err.message || 'Failed to update password', 'error');
            }
        });
    };

    const handleDeleteInvite = (invite: any) => {
        setInviteToDelete(invite);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDeleteInvite = () => {
        if (!inviteToDelete) return;

        deleteInvite.mutate(inviteToDelete.id, {
            onSuccess: () => {
                showToast('Invitation deleted successfully', 'success');
                setIsDeleteModalOpen(false);
                setInviteToDelete(null);
            },
            onError: (err: any) => {
                showToast(err.message || 'Failed to delete invitation', 'error');
            }
        });
    };

    const handleEditInvite = (invite: any) => {
        setSelectedInvite(invite);
        setIsInviteModalOpen(true);
    };

    const inviteColumns: Column<any>[] = [
        {
            header: 'Email Address',
            key: 'email',
            render: (item) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Mail size={14} />
                    </div>
                    <span className="font-bold text-gray-900">{item.email}</span>
                </div>
            )
        },
        {
            header: 'Department',
            key: 'department',
            render: (item) => <span className="text-gray-600 font-medium">{item.department || 'N/A'}</span>
        },
        {
            header: 'Designation',
            key: 'designation',
            render: (item) => <span className="text-gray-600 font-medium">{item.designation || 'N/A'}</span>
        },
        {
            header: 'Team',
            key: 'team',
            render: (item) => (
                <span className="text-gray-600 font-medium">{item.team?.name || 'N/A'}</span>
            )
        },
        {
            header: 'Created At',
            key: 'created_at',
            render: (item) => (
                <div className="flex items-center gap-2 text-gray-500">
                    <Calendar size={12} />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleEditInvite(item)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDeleteInvite(item)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    const invites = (invitesData as any)?.payload?.records || [];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h2 className='text-[28px] font-black text-gray-900 tracking-tight'>
                    Settings
                </h2>
                <p className="text-gray-500 font-medium tracking-tight">Manage your account preferences and invitations</p>
            </div>

            <Tabs
                options={[
                    { label: 'General & Security', value: 'security' },
                    { label: 'Member Invites', value: 'invites' }
                ]}
                value={activeTab}
                onChange={setActiveTab}
                variant="pills"
            />

            <div className="flex flex-col gap-6">
                {activeTab === 'security' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Notifications Setting */}
                        <Card className="flex items-center justify-between p-6 shadow-sm border border-gray-100 bg-white rounded-2xl">
                            <div className="flex flex-col gap-1.5 focus-within:ring-0">
                                <h4 className="text-[16px] font-black text-gray-900 tracking-tight">Show Notifications</h4>
                                <p className="text-[13px] text-gray-500 font-medium tracking-tight">Allow to receive push notifications for user activities and logs count</p>
                            </div>
                            <button
                                onClick={handleNotificationsToggle}
                                className={`w-[52px] h-[28px] rounded-full transition-all duration-300 relative shrink-0 ${notifications ? 'bg-[#00A043]' : 'bg-gray-200'} ${updatePreferences.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={updatePreferences.isPending}
                            >
                                <div className={`absolute top-1 w-[20px] h-[20px] rounded-full bg-white transition-all duration-300 shadow-sm ${notifications ? 'left-[28px]' : 'left-1'}`} />
                            </button>
                        </Card>

                        {/* Update Password Section */}
                        <div className="flex flex-col gap-4">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Update Password</h2>

                            <Card className="flex flex-col gap-8 p-8 shadow-sm border border-gray-100 bg-white rounded-2xl">
                                <div className="flex flex-col gap-2 md:w-1/2">
                                    <Input
                                        label='Old Password'
                                        type="password"
                                        placeholder="Enter your old password"
                                        className="h-14 rounded-xl"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="flex flex-col gap-2">
                                        <Input
                                            label='New Password'
                                            type="password"
                                            placeholder="Enter new password"
                                            className="h-14 rounded-xl"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                        <div className="flex items-center gap-1.5 mt-1 ml-1 text-gray-500">
                                            <Info size={12} />
                                            <span className="text-xs font-medium">Min 8 characters, 1 Digit & 1 special character</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Input
                                            label='Confirm New Password'
                                            type="password"
                                            placeholder="Confirm new password"
                                            className="h-14 rounded-xl"
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="rounded-xl px-10 h-14 font-black shadow-xl shadow-primary-100"
                                        onClick={handleSave}
                                        disabled={changePassword.isPending}
                                    >
                                        {changePassword.isPending ? 'Updating...' : 'Update Password'}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'invites' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Filters Card */}

                        {/* Table Section */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Active Invitations</h3>
                                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                        {invites.length} Total
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={() => setIsInviteModalOpen(true)}
                                        className="gap-2 rounded-xl w-full lg:min-w-[200px] h-12 font-black px-6 "
                                    >
                                        <Plus size={18} />
                                        Invite Team Member
                                    </Button>
                                </div>
                            </div>

                            <Table
                                columns={inviteColumns}
                                data={filteredInvites}
                                isLoading={isLoadingInvites}
                                emptyMessage="No invitations found."
                                headerClassName="bg-gray-50/50"
                            />
                        </div>
                    </div>
                )}
            </div>
            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => {
                    setIsInviteModalOpen(false);
                    setSelectedInvite(null);
                }}
                invite={selectedInvite}
            />

            <ActionModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDeleteInvite}
                loading={deleteInvite.isPending}
                title="Delete Invitation"
                description={`Are you sure you want to delete the invitation for "${inviteToDelete?.email}"? They will no longer be able to use the link to join.`}
                confirmText="Delete Invite"
                icon="delete"
            />
        </div>
    );
};

export default Setting;
