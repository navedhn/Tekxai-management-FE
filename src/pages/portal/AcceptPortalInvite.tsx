import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { usePreviewClientPortalInvite, useAcceptClientPortalInvite } from '@/services/clientPortalInviteService';
import { useLoginMutation } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { setAuthTokens, extractTokensFromAuthResponse } from '@/utils/tokenMemory';
import { User } from '@/types';
import { Button } from '@/components';
import { useToastContext } from '@/components/toast/ToastProvider';

const ErrorState: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="flex flex-col items-center justify-center text-center gap-6 py-12 px-6">
    <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <div className="flex flex-col gap-2 max-w-sm">
      <h2 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
      <p className="text-gray-500 font-medium leading-relaxed">{subtitle}</p>
    </div>
    <Link to="/login" className="mt-2 text-primary-600 font-bold hover:text-primary-700">Back to Login</Link>
  </div>
);

const AcceptPortalInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();
  const { data, isLoading, isError } = usePreviewClientPortalInvite(token || '');
  const accept = useAcceptClientPortalInvite(token || '');
  const loginMutation = useLoginMutation();
  const { loggedIn } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const invite = (data as any)?.payload;
  const isValid = invite?.valid;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 px-10">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-100 rounded-full" />
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
        </div>
        <p className="text-lg font-black text-gray-900 tracking-tight">Verifying your invitation...</p>
      </div>
    );
  }

  if (!isValid || isError) {
    const code = invite?.code;
    let title = 'Invitation Invalid';
    let subtitle = 'This invitation link is no longer valid or could not be found.';
    if (code === 'EXPIRED') {
      title = 'Invitation Expired';
      subtitle = 'This invitation has expired. Please ask your project contact to send a new one.';
    } else if (code === 'ACCEPTED') {
      title = 'Invitation Already Used';
      subtitle = 'This invitation has already been accepted. Try logging in instead.';
    } else if (code === 'REVOKED') {
      title = 'Invitation Revoked';
      subtitle = 'This invitation is no longer active. Please ask your project contact for a new one.';
    }
    return <ErrorState title={title} subtitle={subtitle} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      const accepted = await accept.mutateAsync({ password, first_name: firstName, last_name: lastName });
      const projectId = accepted?.payload?.project_id || invite.project_id || null;

      try {
        const res = await loginMutation.mutateAsync({ email: invite.email, password });
        if (!(res as any)?.requires_2fa) {
          const { accessToken, refreshToken, user } = extractTokensFromAuthResponse(res);
          if (accessToken) setAuthTokens(accessToken, refreshToken);
          if (user) loggedIn({ user: user as User });
          toast.success('Welcome — you are signed in');
          navigate(projectId ? `/portal/projects/${projectId}/communication` : '/portal', { replace: true });
          return;
        }
      } catch {
        /* fall through to login handoff */
      }

      toast.success('Account created — sign in to continue');
      navigate('/login', {
        replace: true,
        state: {
          email: invite.email,
          redirectTo: projectId ? `/portal/projects/${projectId}/communication` : '/portal',
        },
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Let&rsquo;s Build Great Things Together</h1>
        <p className="text-gray-500 font-medium leading-relaxed">
          You&rsquo;ve been invited to the <strong className="text-primary-600">{invite.client_name}</strong> Client Portal
          {invite.project_title ? <> for <strong className="text-primary-600">{invite.project_title}</strong></> : null}.
          Set a password below to create your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
          <p className="font-bold text-gray-900">{invite.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={invite.first_name || 'Jane'}
              className="h-12 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={invite.last_name || 'Client'}
              className="h-12 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="h-12 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="h-12 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          className="h-14 rounded-xl shadow-xl shadow-primary-100 font-bold text-lg mt-2"
          loading={submitting || accept.isPending || loginMutation.isPending}
        >
          Accept Invitation &amp; Continue
        </Button>
      </form>
    </div>
  );
};

export default AcceptPortalInvite;
