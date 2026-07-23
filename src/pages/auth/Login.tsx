import React, { useState } from 'react';
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

  const redirectUser = (user: any) => {
    const typedUser = user as User;
    const role_name = typedUser?.role_name ?? (typedUser as any)?.roles?.[0] ?? null;
    if (role_name === USER_ROLES.MARKETING) {
      navigate('/crm');
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
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Login;
