import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { disconnectSocket, getSocket } from '@/lib/socket';

const EmployeeInviteError: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="flex flex-col gap-5 text-center">
    <h1 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h1>
    <p className="text-sm font-medium leading-relaxed text-gray-500">{message}</p>
    <Link to="/login" className="font-bold text-primary-600 hover:text-primary-700">Go to sign in</Link>
  </div>
);

const AcceptEmployeePortalInvite: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const { isLoggedIn, hasHydrated } = useAuth();
  const navigate = useNavigate();
  const toast = useToastContext();

  const preview = useQuery({
    queryKey: ['employee-portal-invite-preview', token],
    queryFn: () => apiRequest<any>(`api/v1/employee-portal-invites/accept/${token}`),
    enabled: hasHydrated && isLoggedIn && !!token,
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => apiRequest<any>(`api/v1/employee-portal-invites/accept/${token}`, { method: 'POST' }),
    onSuccess: (response) => {
      // Socket rooms are resolved at connection time. Reconnect after the
      // server records the acceptance so this new portal project begins
      // receiving real-time messages immediately, without a browser refresh.
      disconnectSocket();
      getSocket();
      toast.success('Portal invitation accepted');
      const projectId = response?.payload?.project?.id;
      navigate(projectId ? `/portal/projects/${projectId}` : '/portal/projects', { replace: true });
    },
    onError: (error: any) => toast.error(error?.data?.message || error?.message || 'Unable to accept invitation'),
  });

  if (!hasHydrated) return <div className="py-10 text-center text-sm font-medium text-gray-500">Loading...</div>;
  if (!isLoggedIn) {
    return <EmployeeInviteError title="Sign in required" message="This invitation is for an existing TekXAI employee account. Sign in as the invited employee, then open this invitation link again." />;
  }
  if (preview.isLoading) return <div className="py-10 text-center text-sm font-medium text-gray-500">Verifying your invitation...</div>;

  const invite = preview.data?.payload;
  if (preview.isError || !invite?.valid) {
    const code = invite?.code;
    const message = code === 'EXPIRED'
      ? 'This invitation has expired. Ask an administrator to send a new one.'
      : code === 'ACCEPTED'
        ? 'This invitation has already been accepted.'
        : code === 'REVOKED'
          ? 'This invitation has been revoked.'
          : 'This invitation is invalid or belongs to a different employee account.';
    return <EmployeeInviteError title="Invitation unavailable" message={message} />;
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-600">Employee portal access</p>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">You&rsquo;re invited to a project portal</h1>
        <p className="text-sm font-medium leading-relaxed text-gray-500">
          Accept access to <strong className="text-primary-600">{invite.project_title}</strong>
          {invite.inviter_name ? <> from {invite.inviter_name}</> : null}.
        </p>
      </div>
      <Button type="button" variant="primary" size="lg" fullWidth className="h-12 rounded-xl text-base font-bold" loading={accept.isPending} onClick={() => accept.mutate()}>
        Accept portal invitation
      </Button>
    </div>
  );
};

export default AcceptEmployeePortalInvite;
