import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import FormInput from '@/components/form/FormInput';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Lock, Globe, User, Camera } from 'lucide-react';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetMySettingsQuery, useUpdatePreferencesMutation, useChangePasswordMutation } from '@/services/settingsService';
import { useLogoutMutation } from '@/services/authService';
import { useUploadAvatarMutation } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { clearAuthTokens } from '@/utils/tokenMemory';
import ThemeSwitcher from '@/components/settings/ThemeSwitcher';
import { getStoredTheme } from '@/lib/theme';

const EmployeeSetting: React.FC = () => {
    const toast = useToastContext();
    const navigate = useNavigate();
    const { userLogout, user, updateUserProfile } = useAuthStore();
    const logoutMutation = useLogoutMutation();
    const [notifications, setNotifications] = useState(true);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const { data: settingsData } = useGetMySettingsQuery();
    const updatePreferences = useUpdatePreferencesMutation();
    const changePassword = useChangePasswordMutation();
    const uploadAvatar = useUploadAvatarMutation();

    const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

    const handleAvatarPick = () => avatarInputRef.current?.click();

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5MB');
            return;
        }
        if (!user?.id) {
            toast.error('Failed to update photo: no active session');
            return;
        }
        setAvatarUploading(true);
        try {

            const updated = await uploadAvatar.mutateAsync({ userId: user.id, file });
            updateUserProfile({ avatar: updated?.avatar });
            toast.success('Profile photo updated');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update photo');
        } finally {
            setAvatarUploading(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

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
            language: (settingsData as any)?.payload?.language || 'en',
            theme: getStoredTheme(),
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
            onSuccess: async () => {
                toast.success('Password updated. Please sign in again with your new password.');
                setOldPassword('');
                setNewPassword('');
                setConfirmNewPassword('');

                try { await logoutMutation.mutateAsync(); } catch {  }
                clearAuthTokens();
                userLogout();
                navigate('/login');
            },
            onError: (err: any) => {
                toast.error(err.message || 'Failed to update password');
            }
        });
    };

    return (
        <div className="flex flex-col gap-6 ">

            <div className="flex flex-col gap-4">

                <Card className="flex items-center justify-between p-6 shadow-sm border border-gray-100 bg-white rounded-xl">
                    <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 rounded-2xl bg-[#005CDA] text-white flex items-center justify-center text-xl font-black shrink-0 overflow-hidden">
                            {user?.avatar
                                ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
                                : (initials || <User size={28} />)}
                        </div>
                        <div className="flex flex-col gap-1">
                            <h4 className="text-[15px] font-bold text-gray-900 tracking-tight">Profile Photo</h4>
                            <p className="text-[13px] text-gray-500 font-medium tracking-tight">JPG or PNG, up to 5MB</p>
                        </div>
                    </div>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                    <Button
                        variant="secondary"
                        size="md"
                        className="rounded-xl font-bold gap-2"
                        onClick={handleAvatarPick}
                        disabled={avatarUploading}
                    >
                        <Camera size={16} />
                        {avatarUploading ? 'Uploading...' : 'Change Photo'}
                    </Button>
                </Card>

                <ThemeSwitcher />

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

                <div className="mt-4 flex flex-col gap-4">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Update Password</h2>

                    <Card className="flex flex-col gap-6 p-6 shadow-sm border border-gray-100 bg-white rounded-xl">
                        <div className="flex flex-col gap-1 md:w-1/2">
                            <span className="text-[14px] font-black text-gray-900 tracking-tight">Old Password</span>
                            <FormInput
                                name="old_password"
                                type="password"
                                placeholder="Enter your old password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] font-black text-gray-900 tracking-tight">Enter New Password</span>
                                <FormInput
                                    name="new_password"
                                    type="password"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                                <span className="text-xs text-gray-500 font-medium mt-1">Min 8 characters, 1 Digit & 1 special character</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] font-black text-gray-900 tracking-tight">Confirm New Password</span>
                                <FormInput
                                    name="confirm_new_password"
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    autoComplete="new-password"
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
