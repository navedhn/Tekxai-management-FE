import React from 'react';
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

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const res = await loginMutation.mutateAsync(values);
      const { accessToken, refreshToken, user } = extractTokensFromAuthResponse(res);

      if (accessToken) {
        setAuthTokens(accessToken, refreshToken);
      }

      loggedIn({ user: user as User });
      toast.success('Login successful!');

      // Workspace-aware redirect based on role
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
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    }
  };

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
            <div className="h-px bg-gray-100 w-full my-4" />
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Login;
