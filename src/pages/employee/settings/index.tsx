import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import FormInput from '@/components/form/FormInput';
import { Lock, User, Camera, Bell } from 'lucide-react';
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

                try { await logoutMutation.mutateAsync(); } catch { /* ignore */ }
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
        <div className="flex flex-col gap-6">
            <Card className="bg-white border border-(--color-card-border) shadow-sm !p-0 overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-(--color-card-border)">
                    <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
                        <User size={16} />
                    </div>
                    <h2 className="text-lg font-black text-(--color-text-primary) tracking-tight">Profile</h2>
                </div>
                <div className="flex items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 rounded-2xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center text-xl font-black shrink-0 overflow-hidden">
                            {user?.avatar
                                ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
                                : (initials || <User size={28} />)}
                        </div>
                        <div className="flex flex-col gap-1">
                            <h4 className="text-[15px] font-bold text-(--color-text-primary) tracking-tight">Profile Photo</h4>
                            <p className="text-[13px] text-(--color-text-secondary) font-medium tracking-tight">JPG or PNG, up to 5MB</p>
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
                </div>
            </Card>

            <ThemeSwitcher />

            <Card className="bg-white border border-(--color-card-border) shadow-sm !p-0 overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-(--color-card-border)">
                    <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
                        <Bell size={16} />
                    </div>
                    <h2 className="text-lg font-black text-(--color-text-primary) tracking-tight">Preferences</h2>
                </div>
                <div className="flex items-center justify-between gap-4 p-5">
                    <div className="flex flex-col gap-1.5">
                        <h4 className="text-[15px] font-bold text-(--color-text-primary) tracking-tight">Show Notifications</h4>
                        <p className="text-[13px] text-(--color-text-secondary) font-medium tracking-tight">
                            Allow push notifications for user activities and logs
                        </p>
                    </div>
                    <button
                        onClick={handleNotificationsToggle}
                        className={`w-[46px] h-[24px] rounded-full transition-all duration-300 relative shrink-0 ${
                            updatePreferences.isPending ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        style={{
                            backgroundColor: notifications
                                ? 'var(--color-brand-primary)'
                                : 'var(--color-elevated)',
                        }}
                        disabled={updatePreferences.isPending}
                        aria-label="Toggle notifications"
                    >
                        <div
                            className={`absolute top-0.5 w-[20px] h-[20px] rounded-full bg-white transition-all duration-300 shadow-sm ${
                                notifications ? 'left-[24px]' : 'left-0.5'
                            }`}
                        />
                    </button>
                </div>
            </Card>

            <Card className="bg-white border border-(--color-card-border) shadow-sm !p-0 overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-(--color-card-border)">
                    <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
                        <Lock size={16} />
                    </div>
                    <h2 className="text-lg font-black text-(--color-text-primary) tracking-tight">Update Password</h2>
                </div>
                <div className="flex flex-col gap-6 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-[14px] font-black text-(--color-text-primary) tracking-tight">Old Password</span>
                            <FormInput
                                name="old_password"
                                type="password"
                                placeholder="Enter your old password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-[14px] font-black text-(--color-text-primary) tracking-tight">Enter New Password</span>
                            <FormInput
                                name="new_password"
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                            <span className="text-xs text-(--color-text-secondary) font-medium mt-1">
                                Min 8 characters, 1 Digit & 1 special character
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[14px] font-black text-(--color-text-primary) tracking-tight">Confirm New Password</span>
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

                    <div className="flex justify-end">
                        <Button
                            variant="primary"
                            size="md"
                            className="rounded-xl px-8 font-black"
                            onClick={handleSave}
                            disabled={changePassword.isPending}
                        >
                            {changePassword.isPending ? 'Updating...' : 'Update Password'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default EmployeeSetting;
