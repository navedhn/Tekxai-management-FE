import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { ADMIN_ROLES, USER_ROLES } from '@/constants/roles';
import { User } from '@/types';
import { setAuthTokens, extractTokensFromAuthResponse } from '@/utils/tokenMemory';
import { validateLoginForm } from '@/utils/validationSchemas';
import { Button, FormInput } from '@/components';
import { useToastContext } from '@/components/toast/ToastProvider';

const Login: React.FC = () => {
  const loginMutation = useLoginMutation();
  const { loggedIn } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToastContext();

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState('');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const redirectUser = (user: any) => {
    const typedUser = user as User;
    const role_name = typedUser?.role_name ?? (typedUser as any)?.roles?.[0] ?? null;
    if (role_name === USER_ROLES.MARKETING) {
      navigate('/crm');
    } else if (role_name === USER_ROLES.HR) {
      navigate('/hr');
    } else if (ADMIN_ROLES.includes(role_name as any)) {
      navigate('/admin');
    } else {
      navigate('/employee');
    }
  };

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const res = await loginMutation.mutateAsync(values);

      // Check if backend requires 2FA
      if ((res as any)?.requires_2fa) {
        setPendingUserId((res as any)?.user_id || '');
        setRequires2FA(true);
        return;
      }

      const { accessToken, refreshToken, user } = extractTokensFromAuthResponse(res);
      if (accessToken) setAuthTokens(accessToken, refreshToken);
      loggedIn({ user: user as User });
      toast.success('Login successful!');
      redirectUser(user);
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    }
  };

  const handleVerify2FA = async () => {
    if (!tfaCode || tfaCode.length < 6) return;
    setTfaLoading(true);
    try {
      const res = await fetch('/api/v1/auth/2fa/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: pendingUserId, token: tfaCode }),
      });
      const data = await res.json();
      if (data?.payload?.access_token) {
        setAuthTokens(data.payload.access_token, data.payload.refresh_token);
        loggedIn({ user: data.payload.user as User });
        toast.success('Login successful!');
        redirectUser(data.payload.user);
      } else {
        toast.error(data?.message || 'Invalid OTP code');
      }
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setTfaLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // @ts-ignore
    if (!window.google) { toast.error('Google login not available.'); return; }
    // @ts-ignore
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      callback: async (response: any) => {
        try {
          const res = await fetch('/api/v1/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: response.credential }),
          });
          const data = await res.json();
          if (data?.payload?.access_token) {
            setAuthTokens(data.payload.access_token, data.payload.refresh_token);
            loggedIn({ user: data.payload.user as User });
            toast.success('Signed in with Google!');
            redirectUser(data.payload.user);
          } else {
            toast.error(data?.message || 'Google login failed');
          }
        } catch {
          toast.error('Google login failed. Please try again.');
        }
      },
    });
    // @ts-ignore
    window.google.accounts.id.prompt();
  };

  // ── 2FA Step ──────────────────────────────────────────────────────────────
  if (requires2FA) {
    return (
      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Two-Factor Authentication</h1>
          <p className="text-sm text-gray-500 font-medium">Enter the 6-digit code from your authenticator app.</p>
        </div>
        <div className="flex flex-col gap-6">
          <input
            type="text" inputMode="numeric" maxLength={6} placeholder="000000"
            value={tfaCode} onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ''))}
            className="h-16 px-4 rounded-xl border border-gray-200 text-center text-3xl font-black tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary-100 w-full"
            autoFocus
          />
          <Button
            fullWidth size="lg" disabled={tfaLoading || tfaCode.length < 6}
            loading={tfaLoading}
            className="h-12 rounded-xl shadow-[0_10px_30px_rgba(31,123,255,0.2)] text-lg font-bold"
            onClick={handleVerify2FA}
          >
            {tfaLoading ? 'Verifying...' : 'Verify'}
          </Button>
          <button onClick={() => { setRequires2FA(false); setTfaCode(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 font-bold transition-colors text-center">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  // ── Normal Login ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
      <div className="flex flex-col gap-2 sm:gap-3">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
          Sign in to TEKXAI
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-medium">
          Please enter your credentials to access your account.
        </p>
      </div>

      <Formik initialValues={{ email: '', password: '' }} validate={validateLoginForm} onSubmit={handleSubmit}>
        {({ values, handleChange, handleBlur, errors, touched }) => (
          <Form className="flex flex-col gap-6">
            <FormInput
              label="WORK EMAIL *"
              name="email"
              type="email"
              placeholder="Enter email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1"
              error={touched.email && errors.email ? errors.email : undefined}
              autoComplete="username"
            />
            <div className="flex flex-col gap-2">
              <FormInput
                label="PASSWORD *"
                name="password"
                type="password"
                placeholder="Enter password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1"
                error={touched.password && errors.password ? errors.password : undefined}
                autoComplete="current-password"
              />
              <div className="flex justify-end">
                <Link to="/forget-password" className="text-xs text-primary-500 hover:text-primary-600 font-bold transition-colors">
                  Forgot your password?
                </Link>
              </div>
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                fullWidth
                size="lg"
                loading={loginMutation.isPending}
                className="h-12 rounded-xl shadow-[0_10px_30px_rgba(31,123,255,0.2)] text-lg font-bold"
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs font-bold text-gray-400">OR</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Google SSO */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Login;
