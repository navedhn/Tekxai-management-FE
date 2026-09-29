import React, { useEffect, useState } from 'react';
import { KeyRound, Mail, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useUpdateMyProfileMutation } from '@/services/userService';
import { useChangePasswordMutation } from '@/services/settingsService';
import { useNavigate } from 'react-router-dom';
import { usePortalTopbarStore } from '@/stores/portalTopbarStore';

const inputCls =
  'w-full h-11 px-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm font-medium text-(--color-text-primary) focus:outline-none focus:border-primary-400';

const PortalProfilePage: React.FC = () => {
  const { user, userLogout } = useAuth();
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);
  const toast = useToastContext();
  const navigate = useNavigate();
  const setTopbarTitle = usePortalTopbarStore((s) => s.setTitle);

  const updateProfile = useUpdateMyProfileMutation();
  const changePassword = useChangePasswordMutation();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setTopbarTitle('My Profile');
    return () => setTopbarTitle(null);
  }, [setTopbarTitle]);

  useEffect(() => {
    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
  }, [user?.first_name, user?.last_name]);

  const avatarSrc =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || 'C') + '+' + (user?.last_name || ''))}&background=059669&color=fff&size=128`;

  const handleSaveProfile = () => {
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    updateProfile.mutate(
      { first_name: firstName.trim(), last_name: lastName.trim() },
      {
        onSuccess: (res: any) => {
          const payload = res?.payload || res;
          updateUserProfile({
            first_name: payload?.first_name ?? firstName.trim(),
            last_name: payload?.last_name ?? lastName.trim(),
          });
          toast.success('Profile updated');
        },
        onError: (err: any) => toast.error(err?.message || 'Failed to update profile'),
      },
    );
  };

  const handleChangePassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    changePassword.mutate(
      { old_password: oldPassword, new_password: newPassword },
      {
        onSuccess: async () => {
          toast.success('Password updated. Please sign in again.');
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          try {
            await userLogout();
          } catch {
            /* still send them to login */
          }
          navigate('/login');
        },
        onError: (err: any) => toast.error(err?.message || 'Failed to update password'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-4">
        <img src={avatarSrc} alt="" className="h-16 w-16 rounded-2xl object-cover shadow-sm" />
        <div className="min-w-0">
          <h1 className="text-xl font-black text-(--color-text-primary) tracking-tight truncate">
            {user?.first_name} {user?.last_name}
          </h1>
          <p className="text-sm font-medium text-(--color-text-secondary) truncate flex items-center gap-1.5 mt-0.5">
            <Mail size={14} className="shrink-0" />
            {user?.email}
          </p>
        </div>
      </div>

      <Card className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <User size={16} className="text-primary-600" />
          <h2 className="text-base font-black text-(--color-text-primary)">Account details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wide">First name</span>
            <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wide">Last name</span>
            <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wide">Email</span>
          <input className={`${inputCls} opacity-70`} value={user?.email || ''} disabled readOnly />
        </label>
        <div className="flex justify-end">
          <Button
            onClick={handleSaveProfile}
            disabled={updateProfile.isPending}
            className="h-10 px-5 rounded-xl font-bold"
          >
            {updateProfile.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-primary-600" />
          <h2 className="text-base font-black text-(--color-text-primary)">Change password</h2>
        </div>
        <p className="text-sm text-(--color-text-secondary) font-medium -mt-1">
          After updating your password you will be signed out and need to log in again.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wide">Current password</span>
          <input
            type="password"
            className={inputCls}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wide">New password</span>
          <input
            type="password"
            className={inputCls}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wide">Confirm new password</span>
          <input
            type="password"
            className={inputCls}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <div className="flex justify-end">
          <Button
            onClick={handleChangePassword}
            disabled={changePassword.isPending}
            className="h-10 px-5 rounded-xl font-bold"
          >
            {changePassword.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PortalProfilePage;
