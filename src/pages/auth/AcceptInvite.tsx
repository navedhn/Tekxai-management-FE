import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { usePreviewInviteTokenQuery, useRedeemInviteMutation } from '@/services/inviteService';
import { Button } from '@/components';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useAuth } from '@/hooks/useAuth';

/* ─── UI Helpers ─── */
const ErrorState: React.FC<{ title: string; subtitle: string; icon?: React.ReactNode }> = ({ title, subtitle, icon }) => (
    <div className="flex flex-col items-center justify-center text-center gap-6 py-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100">
            {icon || (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            )}
        </div>
        <div className="flex flex-col gap-2 max-w-sm">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
            <p className="text-gray-500 font-medium leading-relaxed">{subtitle}</p>
        </div>
        <Link to="/login" className="mt-2 group flex items-center gap-2 text-primary-600 font-bold hover:text-primary-700 transition-all">
            <span>Back to Login</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
        </Link>
    </div>
);

const AcceptInvite: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const toast = useToastContext();
    const { isLoggedIn } = useAuth();
    
    // Step 2: Preview the token
    const { data, isLoading, isError } = usePreviewInviteTokenQuery(token || '');
    const redeemMutation = useRedeemInviteMutation();

    const invite = (data as any)?.payload || (data as any);
    const isValid = invite?.valid;
    const errorCode = invite?.code;
    const email = invite?.email || '';
    const userExists = invite?.user_exists;
    const requiresLoginOnly = invite?.requires_login_only;

    // Handle invalid token states
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 px-10">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary-100 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <div className="text-center">
                    <p className="text-lg font-black text-gray-900 tracking-tight">Verifying invitation...</p>
                    <p className="text-sm text-gray-400 font-medium mt-1">Checking secure token status</p>
                </div>
            </div>
        );
    }

    if (!isValid || isError) {
        let title = "Invitation Invalid";
        let subtitle = "This invitation link is no longer valid or could not be found.";

        if (errorCode === 'EXPIRED') {
            title = "Invitation Expired";
            subtitle = "This invitation has expired. Please ask your administrator to send a new link.";
        } else if (errorCode === 'USED') {
            title = "Invitation Already Used";
            subtitle = "This invitation has already been redeemed. Try logging in to your account.";
        }

        return <ErrorState title={title} subtitle={subtitle} />;
    }

    // Logic for Case A: Existing user
    if (!isLoggedIn && userExists) {
        return (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col gap-3">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        This invitation is tied to an existing account (<strong className="text-primary-600">{email}</strong>). 
                        Please log in first to accept the invitation.
                    </p>
                </div>

                <div className="p-6 bg-primary-50/50 border border-primary-100 rounded-2xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary-200">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h4 className="font-bold text-primary-900">Login Required</h4>
                        <p className="text-sm text-primary-700 font-medium">We'll automatically connect your account after you log in.</p>
                    </div>
                </div>

                <Button 
                    variant="primary" 
                    size="lg" 
                    fullWidth 
                    className="h-14 rounded-xl shadow-xl shadow-primary-100 font-bold text-lg"
                    onClick={() => navigate('/login', { state: { fromInvite: token, email } })}
                >
                    Log In to Continue
                </Button>
            </div>
        );
    }

    // Handle redemption for already logged in users
    if (isLoggedIn && isValid) {
        const handleRedeemAction = async () => {
            try {
                await redeemMutation.mutateAsync({ token });
                toast.success('Invitation accepted successfully!');
                navigate('/'); // Or to dashboard
            } catch (error: any) {
                toast.error(error?.data?.message || 'Failed to accept invitation.');
            }
        };

        return (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col gap-3">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Accept Invitation</h1>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        You've been invited to join the team. Click below to finalize the connection.
                    </p>
                </div>

                <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-4 text-center">
                   <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                   </div>
                   <div>
                        <p className="font-bold text-gray-900">{email}</p>
                        <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mt-1">Confirmed Identity</p>
                   </div>
                </div>

                <Button 
                    variant="primary" 
                    size="lg" 
                    fullWidth 
                    className="h-14 rounded-xl shadow-xl shadow-primary-100 font-bold text-lg"
                    loading={redeemMutation.isPending}
                    onClick={handleRedeemAction}
                >
                    Join Team Now
                </Button>
            </div>
        );
    }

    // No account exists for this invite's email. Invites can never create a
    // user — the only valid account-creation paths are Recruitment -> Hire
    // Candidate and Add Employee — so this state means HR sent an invite
    // before adding the person as an employee. Direct them to HR rather
    // than offering a signup form that would only fail server-side.
    return (
        <ErrorState
            title="No Employee Record Found"
            subtitle={`We couldn't find an employee record for ${email || 'this email'}. Please ask HR to add you via Add Employee or Recruitment before using this invitation.`}
        />
    );
};

export default AcceptInvite;
