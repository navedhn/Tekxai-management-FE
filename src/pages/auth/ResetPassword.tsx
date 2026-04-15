import React from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useResetPasswordMutation } from '@/services/authService';
import { validateResetPasswordForm } from '@/utils/validationSchemas';
import { Button, FormInput } from '@/components';
import { useToastContext } from '@/components/toast/ToastProvider';

const ResetPassword: React.FC = () => {
    const resetPasswordMutation = useResetPasswordMutation();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToastContext();

    // id is passed from VerifyOTP after a successful OTP check
    const id = (location.state as any)?.id || '';

    const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
        if (!id) {
            toast.error('Session expired. Please start the password reset process again.');
            navigate('/forget-password');
            return;
        }

        try {
            await resetPasswordMutation.mutateAsync({ id, password: values.password });
            toast.success('Password reset successfully! Please login with your new password.');
            navigate('/login');
        } catch (error: any) {
            const errorMessage =
                error?.data?.message ||
                error?.message ||
                'Failed to reset password. Please try again.';
            toast.error(errorMessage);
        }
    };

    return (
        <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Reset Password</h1>
                <p className="text-gray-500 font-medium">
                    Please enter your new password below. Make sure it's secure and memorable.
                </p>
            </div>

            <Formik
                initialValues={{ password: '', confirmPassword: '' }}
                validate={validateResetPasswordForm}
                onSubmit={handleSubmit}
            >
                {({ values, handleChange, handleBlur, errors, touched }) => (
                    <Form className="flex flex-col gap-6">
                        <FormInput
                            label="NEW PASSWORD *"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={values.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1"
                            error={touched.password && errors.password ? errors.password : undefined}
                        />

                        <FormInput
                            label="CONFIRM PASSWORD *"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={values.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1"
                            error={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : undefined}
                        />

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={resetPasswordMutation.isPending}
                                fullWidth
                                size="lg"
                                className="h-12 rounded-xl shadow-[0_10px_30px_rgba(31,123,255,0.2)] text-lg font-bold"
                            >
                                {resetPasswordMutation.isPending ? 'Resetting password...' : 'Reset Password'}
                            </Button>
                        </div>

                        <div className="h-px bg-gray-100 w-full my-4" />

                        <div className="text-center text-sm font-medium text-gray-500">
                            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-black transition-colors underline decoration-2 underline-offset-4 decoration-primary-100 hover:decoration-primary-500">
                                Back to Login
                            </Link>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default ResetPassword;
