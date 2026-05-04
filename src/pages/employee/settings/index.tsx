import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Lock, Globe, User } from 'lucide-react';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetMySettingsQuery, useUpdatePreferencesMutation, useChangePasswordMutation } from '@/services/settingsService';

const EmployeeSetting: React.FC = () => {
    const toast = useToastContext();
    const [notifications, setNotifications] = useState(true);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const { data: settingsData } = useGetMySettingsQuery();
    const updatePreferences = useUpdatePreferencesMutation();
    const changePassword = useChangePasswordMutation();

    React.useEffect(() => {
        if ((settingsData as any)?.payload) {
            setNotifications((settingsData as any).payload.show_notifications ?? true);
        }
    }, [settingsData]);

    const handleNotificationsToggle = () => {
        const newValue = !notifications;
        setNotifications(newValue);
        updatePreferences.mutate({
            show_notifications: newValue,
            language: (settingsData as any)?.payload?.language || 'en'
        }, {
            onSuccess: () => toast.success('Preferences updated'),
            onError: (err: any) => {
                setNotifications(!newValue);
                toast.error(err.message || 'Failed to update preferences');
            }
        });
    };

    const handleSave = () => {
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return toast.error('Please fill all password fields');
        }
        if (newPassword !== confirmNewPassword) {
            return toast.error('New passwords do not match');
        }
        changePassword.mutate({
            old_password: oldPassword,
            new_password: newPassword,
            confirm_new_password: confirmNewPassword
        }, {
            onSuccess: () => {
                toast.success('Password updated successfully!');
                setOldPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            },
            onError: (err: any) => {
                toast.error(err.message || 'Failed to update password');
            }
        });
    };

    return (
        <div className="flex flex-col gap-6 ">

            <div className="flex flex-col gap-4">
                {/* Notifications Setting */}
                <Card className="flex items-center justify-between p-6 shadow-sm border border-gray-100 bg-white rounded-xl">
                    <div className="flex flex-col gap-1.5">
                        <h4 className="text-[15px] font-bold text-gray-900 tracking-tight">Show Notifications</h4>
                        <p className="text-[13px] text-gray-500 font-medium tracking-tight">Allow to receive push notifications for user activities and logs count</p>
                    </div>
                    <button
                        onClick={handleNotificationsToggle}
                        className={`w-[46px] h-[24px] rounded-full transition-all duration-300 relative shrink-0 ${notifications ? 'bg-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-gray-200'} ${updatePreferences.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ backgroundColor: notifications ? '#00bfa5' : '#e5e7eb', boxShadow: notifications ? 'none' : 'none' }}
                        disabled={updatePreferences.isPending}
                    >
                        <div className={`absolute top-0.5 w-[20px] h-[20px] rounded-full bg-white transition-all duration-300 shadow-sm ${notifications ? 'left-[24px]' : 'left-0.5'}`} />
                    </button>
                </Card>

                {/* Update Password Section */}
                <div className="mt-4 flex flex-col gap-4">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Update Password</h2>

                    <Card className="flex flex-col gap-6 p-6 shadow-sm border border-gray-100 bg-white rounded-xl">
                        <div className="flex flex-col gap-1 md:w-1/2">
                            <span className="text-[14px] font-black text-gray-900 tracking-tight">Old Password</span>
                            <Input
                                type="password"
                                placeholder="Enter your old password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] font-black text-gray-900 tracking-tight">Enter New Password</span>
                                <Input
                                    type="password"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <span className="text-xs text-gray-500 font-medium mt-1">Min 8 characters, 1 Digit & 1 special character</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] font-black text-gray-900 tracking-tight">Confirm New Password</span>
                                <Input
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end mt-2">
                            <Button variant="primary" size="md" className="rounded-xl px-8 font-black shadow-lg shadow-primary-100" onClick={handleSave} disabled={changePassword.isPending}>
                                {changePassword.isPending ? 'Updating...' : 'Update Password'}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSetting;
