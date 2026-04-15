import React from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useVerifyOTPMutation } from '@/services/authService';
import { validateVerifyOTPForm } from '@/utils/validationSchemas';
import { Button, FormInput } from '@/components';
import { useToastContext } from '@/components/toast/ToastProvider';

const VerifyOTP: React.FC = () => {
    const verifyOTPMutation = useVerifyOTPMutation();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToastContext();

    // Get email and id from location state or query params
    const email = (location.state as any)?.email || new URLSearchParams(location.search).get('email') || '';
    const id = (location.state as any)?.id || new URLSearchParams(location.search).get('id') || '';

    const handleSubmit = async (values: { otp: string }) => {
        if (!email) {
            toast.error('Email is required. Please go back to forget password page.');
            navigate('/forget-password');
            return;
        }

        try {
            const res: any = await verifyOTPMutation.mutateAsync({ id, otp: values.otp });
            // Capture the user id returned by the server — needed for the reset-password endpoint
            const userId = res?.payload?.id ?? res?.payload?.user?.id ?? res?.id ?? res?.user?.id;
            toast.success('OTP verified successfully!');
            navigate('/reset-password', { state: { id: userId, email } });
        } catch (error: any) {
            const errorMessage =
                error?.data?.message ||
                error?.message ||
                'Invalid OTP. Please try again.';
            toast.error(errorMessage);
        }
    };

    return (
        <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Verify OTP</h1>
                <p className="text-gray-500 font-medium">
                    Enter the 6-digit OTP sent to <strong className="text-primary-500">{email || 'your email'}</strong>.
                </p>
            </div>

            <Formik
                initialValues={{ otp: '' }}
                validate={validateVerifyOTPForm}
                onSubmit={handleSubmit}
            >
                {({ values, handleChange, handleBlur, errors, touched }) => (
                    <Form className="flex flex-col gap-6">
                        <FormInput
                            label="OTP CODE *"
                            name="otp"
                            type="text"
                            placeholder="0 0 0 0 0 0"
                            value={values.otp}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1"
                            error={touched.otp && errors.otp ? errors.otp : undefined}
                            maxLength={6}
                            className="text-center tracking-[0.5em] text-2xl font-black placeholder:tracking-normal placeholder:text-base h-16"
                        />

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={verifyOTPMutation.isPending}
                                fullWidth
                                size="lg"
                                className="h-12 rounded-xl shadow-[0_10px_30px_rgba(31,123,255,0.2)] text-lg font-bold"
                            >
                                {verifyOTPMutation.isPending ? 'Verifying...' : 'Verify OTP'}
                            </Button>
                        </div>

                        <div className="flex flex-col gap-4 items-center mt-4">
                            <div className="text-center text-sm font-medium text-gray-500">
                                Didn't receive OTP?{' '}
                                <Link to="/forget-password" className="text-primary-500 hover:text-primary-600 font-black transition-colors underline decoration-2 underline-offset-4 decoration-primary-100 hover:decoration-primary-500">
                                    Resend OTP
                                </Link>
                            </div>

                            <div className="h-px bg-gray-100 w-full" />

                            <div className="text-center text-sm font-medium text-gray-500">
                                <Link to="/login" className="text-primary-500 hover:text-primary-600 font-black transition-colors underline decoration-2 underline-offset-4 decoration-primary-100 hover:decoration-primary-500">
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default VerifyOTP;
