import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useLoginMutation } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { fetchMyPermissions, resolveHomePath } from '@/services/permissionsService';
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

  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState('');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);

  const redirectUser = async () => {
    const perms = await fetchMyPermissions().catch(() => null);
    const home = resolveHomePath(perms);
    if (home) {
      navigate(home);
    } else {
      toast.error('Your account has no workspace access configured yet. Contact your administrator.');
    }
  };

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const res = await loginMutation.mutateAsync(values);

      if ((res as any)?.requires_2fa) {
        setPendingUserId((res as any)?.user_id || '');
        setRequires2FA(true);
        return;
      }

      const { accessToken, refreshToken, user } = extractTokensFromAuthResponse(res);
      if (accessToken) setAuthTokens(accessToken, refreshToken);
      loggedIn({ user: user as User });
      toast.success('Login successful!');
      redirectUser();
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
        redirectUser();
      } else {
        toast.error(data?.message || 'Invalid OTP code');
      }
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setTfaLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#E8F1FF] text-[#005CDA] flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl sm:text-[1.75rem] font-black text-gray-900 tracking-tight">
              Two-factor verification
            </h1>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Enter the 6-digit code from your authenticator app to continue.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={tfaCode}
            onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ''))}
            className="h-14 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-center text-2xl font-black tracking-[0.4em] outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 w-full transition-shadow"
            autoFocus
          />
          <Button
            fullWidth
            size="lg"
            disabled={tfaLoading || tfaCode.length < 6}
            loading={tfaLoading}
            className="h-12 rounded-xl text-base font-bold"
            onClick={handleVerify2FA}
          >
            {tfaLoading ? 'Verifying...' : 'Verify & continue'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setRequires2FA(false);
              setTfaCode('');
            }}
            className="text-xs text-gray-400 hover:text-[#005CDA] font-bold transition-colors text-center"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#005CDA]">
          Welcome back
        </p>
        <h1 className="text-2xl sm:text-[1.75rem] font-black text-gray-900 tracking-tight">
          Sign in to TekXAI
        </h1>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          Enter your work email and password to access your workspace.
        </p>
      </div>

      <Formik initialValues={{ email: '', password: '' }} validate={validateLoginForm} onSubmit={handleSubmit}>
        {({ values, handleChange, handleBlur, errors, touched }) => (
          <Form className="flex flex-col gap-5">
            <FormInput
              label="Work email"
              name="email"
              type="email"
              placeholder="you@company.com"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              labelClassName="text-xs font-bold text-gray-500 mb-1.5"
              error={touched.email && errors.email ? errors.email : undefined}
              autoComplete="username"
            />

            <div className="flex flex-col gap-2">
              <FormInput
                label="Password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                labelClassName="text-xs font-bold text-gray-500 mb-1.5"
                error={touched.password && errors.password ? errors.password : undefined}
                autoComplete="current-password"
              />
              <div className="flex justify-end">
                <Link
                  to="/forget-password"
                  className="text-xs text-[#005CDA] hover:opacity-80 font-bold transition-opacity"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                fullWidth
                size="lg"
                loading={loginMutation.isPending}
                className="h-12 rounded-xl text-base font-bold"
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
