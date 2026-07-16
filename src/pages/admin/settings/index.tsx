import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button, { pageActionButtonClass } from '@/components/ui/Button';
import FormInput from '@/components/form/FormInput';
import Tabs from '@/components/ui/Tabs';
import Table, { Column } from '@/components/ui/Table';
import { Search, Filter, Mail, Calendar, Info, Clock, Plus, Trash2, Edit2, ShieldCheck, Shield, X, Monitor } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/queryClient';
const api = {
  get:    (url: string) => apiRequest<any>(url).then((r: any) => ({ data: { payload: r?.payload ?? r } })),
  post:   (url: string, body?: any) => apiRequest<any>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  delete: (url: string) => apiRequest<any>(url, { method: 'DELETE' }),
};
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetInvitesQuery, useDeleteInviteMutation } from '@/services/inviteService';
import { useGetMySettingsQuery, useUpdatePreferencesMutation, useChangePasswordMutation } from '@/services/settingsService';
import InviteMemberModal from '@/components/ui/InviteMemberModal';
import ActionModal from '@/components/ui/ActionModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useMutation, useQuery } from '@tanstack/react-query';

// ─── 2FA helpers ─────────────────────────────────────────────────────────────
const use2FAStatus = () =>
  useQuery({
    queryKey: ['2fa-status'],
    queryFn: () => apiRequest<any>('api/v1/auth/2fa/status').then((r) => r?.payload || { enabled: false }),
    staleTime: 60000,
  });

const TwoFactorSection: React.FC = () => {
  const toast = useToastContext();
  const { data: twoFaData, refetch } = use2FAStatus();
  const enabled = !!twoFaData?.enabled;

  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [qrUrl, setQrUrl]   = useState('');
  const [otp, setOtp]       = useState('');

  const setupMutation = useMutation({
    mutationFn: () => apiRequest<any>('api/v1/auth/2fa/setup', { method: 'POST', body: '{}' }),
    onSuccess: (r) => {
      setQrUrl(r?.payload?.qr_url || '');
      setShowEnableModal(true);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to start 2FA setup'),
  });

  const verifyMutation = useMutation({
    mutationFn: (token: string) => apiRequest('api/v1/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ token }) }),
    onSuccess: () => {
      toast.success('2FA enabled successfully');
      setShowEnableModal(false);
      setOtp('');
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || 'Invalid OTP'),
  });

  const disableMutation = useMutation({
    mutationFn: (token: string) => apiRequest('api/v1/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ token }) }),
    onSuccess: () => {
      toast.success('2FA disabled');
      setShowDisableModal(false);
      setOtp('');
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || 'Invalid OTP'),
  });

  return (
    <>
      <Card className="flex items-center justify-between p-6 shadow-sm border border-gray-100 bg-white rounded-2xl">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            {enabled ? <ShieldCheck size={20} /> : <Shield size={20} />}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-[16px] font-black text-gray-900 tracking-tight">Two-Factor Authentication</h4>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black uppercase ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-[13px] text-gray-500 font-medium tracking-tight">
              {enabled
                ? 'Your account is protected with two-factor authentication.'
                : 'Add an extra layer of security by enabling 2FA on your account.'}
            </p>
          </div>
        </div>
        {enabled ? (
          <Button variant="secondary" size="sm" className="rounded-xl shrink-0" onClick={() => { setOtp(''); setShowDisableModal(true); }}>
            Disable 2FA
          </Button>
        ) : (
          <Button variant="primary" size="sm" className="rounded-xl shrink-0" onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
            {setupMutation.isPending ? 'Loading...' : 'Enable 2FA'}
          </Button>
        )}
      </Card>

      {/* Enable 2FA Modal */}
      {showEnableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowEnableModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm z-10 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Enable 2FA</h3>
              <button onClick={() => setShowEnableModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-500 font-medium">Scan this QR code with your authenticator app, then enter the 6-digit code below.</p>
            {qrUrl && <img src={qrUrl} alt="2FA QR Code" className="w-48 h-48 mx-auto rounded-xl border border-gray-100" />}
            <input
              type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP"
              value={otp} onChange={(e) => setOtp(e.target.value)}
              className="h-12 px-4 rounded-xl border border-gray-200 text-center text-2xl font-black tracking-widest outline-none focus:ring-2 focus:ring-primary-100"
            />
            <Button variant="primary" fullWidth className="h-11 rounded-xl font-black"
              onClick={() => verifyMutation.mutate(otp)} disabled={verifyMutation.isPending || otp.length < 6}>
              {verifyMutation.isPending ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDisableModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm z-10 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Disable 2FA</h3>
              <button onClick={() => setShowDisableModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-500 font-medium">Enter your current 6-digit authenticator code to disable 2FA.</p>
            <input
              type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP"
              value={otp} onChange={(e) => setOtp(e.target.value)}
              className="h-12 px-4 rounded-xl border border-gray-200 text-center text-2xl font-black tracking-widest outline-none focus:ring-2 focus:ring-primary-100"
            />
            <Button variant="secondary" fullWidth className="h-11 rounded-xl font-black text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => disableMutation.mutate(otp)} disabled={disableMutation.isPending || otp.length < 6}>
              {disableMutation.isPending ? 'Disabling...' : 'Confirm Disable'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

const MonitoringSettings: React.FC = () => {
  const toast = useToastContext();
  const { data, refetch } = useQuery({
    queryKey: ['screenshot-interval'],
    queryFn: () => apiRequest<any>('/settings/screenshot-interval').then((r: any) => r?.payload ?? r),
  });
  const [minutes, setMinutes] = useState<number>(5);

  React.useEffect(() => {
    if ((data as any)?.interval_minutes) setMinutes((data as any).interval_minutes);
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiRequest<any>('/settings/screenshot-interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interval_minutes: minutes }),
    }),
    onSuccess: () => { toast.success('Screenshot interval updated'); refetch(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to update'),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Monitor size={20} />
        </div>
        <div>
          <h3 className="font-black text-gray-900">Screenshot Interval</h3>
          <p className="text-sm text-gray-400 mt-0.5">Set how often the desktop agent captures screenshots during work sessions</p>
        </div>
      </div>
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Interval (minutes)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Math.min(60, +e.target.value)))}
            className="w-32 h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="text-xs text-gray-400">Between 1–60 minutes. Employees will not see this value.</p>
        </div>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="h-11 px-6 rounded-xl bg-[#005CDA] text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

const Setting: React.FC = () => {
    const toast = useToastContext();
    const { role } = useAuthStore();
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const [activeTab, setActiveTab] = useState('security');

    const { data: calStatus, refetch: refetchCalStatus } = useQuery({
      queryKey: ['calendar-status'],
      queryFn: () => api.get('/calendar/status').then(r => r.data.payload),
    });
    const connectCalendar = useMutation({
      mutationFn: (code: string) => api.post('/calendar/connect', { code }),
      onSuccess: () => refetchCalStatus(),
    });
    const disconnectCalendar = useMutation({
      mutationFn: () => api.delete('/calendar/disconnect'),
      onSuccess: () => refetchCalStatus(),
    });

    const handleGoogleCalendar = () => {
      if (!(window as any).google) return;
      const client = (window as any).google.accounts.oauth2.initCodeClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (response: any) => {
          if (response.code) connectCalendar.mutate(response.code);
        },
      });
      client.requestCode();
    };

    const syncDeadlines = async () => {
      const { data } = await api.get('/calendar/token');
      const token = data.payload.access_token;
      const projects = await api.get('/projects').then(r => r.data.payload?.projects || []);
      for (const p of projects) {
        if (!p.deadline) continue;
        await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary: `Deadline: ${p.title}`, start: { date: p.deadline.split('T')[0] }, end: { date: p.deadline.split('T')[0] } }),
        });
      }
      alert('Project deadlines synced to Google Calendar!');
    };
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

    const handleDeleteInvite = (invite: any) => {
        setInviteToDelete(invite);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDeleteInvite = () => {
        if (!inviteToDelete) return;

        deleteInvite.mutate(inviteToDelete.id, {
            onSuccess: () => {
                toast.success('Invitation deleted successfully');
                setIsDeleteModalOpen(false);
                setInviteToDelete(null);
            },
            onError: (err: any) => {
                toast.error(err.message || 'Failed to delete invitation');
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
                    { label: 'Member Invites', value: 'invites' },
                ]}
                value={activeTab}
                onChange={setActiveTab}
                variant="pills"
            />

            <div className="flex flex-col gap-6">
                {activeTab === 'security' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Two-Factor Authentication */}
                        <div className="flex flex-col gap-4">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Security</h2>
                            <TwoFactorSection />
                        </div>

                        {/* Google Calendar Integration */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-black text-gray-900">Google Calendar</h3>
                              <p className="text-sm text-gray-400 mt-0.5">Sync project deadlines to your Google Calendar</p>
                            </div>
                            {(calStatus as any)?.connected ? (
                              <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">Connected</span>
                            ) : (
                              <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">Not connected</span>
                            )}
                          </div>
                          {(calStatus as any)?.connected ? (
                            <div className="flex gap-3">
                              <button onClick={syncDeadlines} className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100">Sync Deadlines Now</button>
                              <button onClick={() => disconnectCalendar.mutate()} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50">Disconnect</button>
                            </div>
                          ) : (
                            <button onClick={handleGoogleCalendar} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50">
                              <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>
                              Connect Google Calendar
                            </button>
                          )}
                        </div>

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
                                    <FormInput
                                        name="old_password"
                                        label='Old Password'
                                        type="password"
                                        placeholder="Enter your old password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        autoComplete="current-password"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="flex flex-col gap-2">
                                        <FormInput
                                            name="new_password"
                                            label='New Password'
                                            type="password"
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <div className="flex items-center gap-1.5 mt-1 ml-1 text-gray-500">
                                            <Info size={12} />
                                            <span className="text-xs font-medium">Min 8 characters, 1 Digit & 1 special character</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <FormInput
                                            name="confirm_new_password"
                                            label='Confirm New Password'
                                            type="password"
                                            placeholder="Confirm new password"
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            autoComplete="new-password"
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
                                        size="sm"
                                        rounded={false}
                                        leftIcon={Plus}
                                        onClick={() => setIsInviteModalOpen(true)}
                                        className={pageActionButtonClass}
                                    >
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
