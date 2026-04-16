import React, { useRef, useState } from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useVerifyOTPMutation, useResendOTPMutation } from '@/services/authService';
import { validateVerifyOTPForm } from '@/utils/validationSchemas';
import { Button } from '@/components';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';

const VerifyOTP: React.FC = () => {
    const verifyOTPMutation = useVerifyOTPMutation();
    const resendOTPMutation = useResendOTPMutation();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToastContext();

    // Get email and id from location state or query params
    const email = (location.state as any)?.email || new URLSearchParams(location.search).get('email') || '';
    const id = (location.state as any)?.id || new URLSearchParams(location.search).get('id') || '';

    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const [otpValues, setOtpValues] = useState(['', '', '', '']);

    const handleResendOTP = async () => {
        if (!id) {
            toast.error('Session expired. Please start again.');
            navigate('/forget-password');
            return;
        }

        try {
            await resendOTPMutation.mutateAsync(id);
            toast.success('OTP resent to your email!');
        } catch (error: any) {
            toast.error(error?.data?.message || error?.message || 'Failed to resend OTP');
        }
    };

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
            <div className="flex flex-col gap-3 text-center lg:text-left">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Verify OTP</h1>
                <p className="text-gray-500 font-medium">
                    Enter the 4-digit OTP sent to <strong className="text-primary-500">{email || 'your email'}</strong>.
                </p>
            </div>

            <Formik
                initialValues={{ otp: '' }}
                validate={validateVerifyOTPForm}
                onSubmit={handleSubmit}
            >
                {({ setFieldValue, errors, touched, isSubmitting }) => (
                    <Form className="flex flex-col gap-8">
                        <div className="flex flex-col gap-4">
                            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase text-center">
                                OTP CODE *
                            </label>

                            <div className="flex justify-between gap-3 lg:gap-4">
                                {otpValues.map((val, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        type="text"
                                        maxLength={1}
                                        value={val}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, '');
                                            if (!value && val) { // Handle deletion
                                                const newOtp = [...otpValues];
                                                newOtp[index] = '';
                                                setOtpValues(newOtp);
                                                setFieldValue('otp', newOtp.join(''));
                                                return;
                                            }
                                            if (value) {
                                                const newOtp = [...otpValues];
                                                newOtp[index] = value.charAt(value.length - 1);
                                                setOtpValues(newOtp);
                                                setFieldValue('otp', newOtp.join(''));

                                                // Move to next input
                                                if (index < 3) {
                                                    inputRefs.current[index + 1]?.focus();
                                                }
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !val && index > 0) {
                                                inputRefs.current[index - 1]?.focus();
                                            }
                                        }}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            const pastedData = e.clipboardData.getData('text').slice(0, 4).replace(/[^0-9]/g, '');
                                            if (pastedData) {
                                                const digits = pastedData.split('');
                                                const newOtp = [...otpValues];
                                                digits.forEach((digit, i) => {
                                                    if (i < 4) newOtp[i] = digit;
                                                });
                                                setOtpValues(newOtp);
                                                setFieldValue('otp', newOtp.join(''));
                                                // Focus the last filled input or the first empty one
                                                const nextIndex = Math.min(digits.length, 3);
                                                inputRefs.current[nextIndex]?.focus();
                                            }
                                        }}
                                        className={cn(
                                            "w-full h-16 lg:h-20  text-center text-3xl font-black bg-white rounded-2xl border-2 transition-all outline-none",
                                            val
                                                ? "border-primary-500 text-primary-600 shadow-[0_5px_15px_rgba(31,123,255,0.1)]"
                                                : "border-gray-300 text-gray-900 focus:border-primary-200 focus:bg-primary-50/10",
                                            touched.otp && errors.otp && "border-red-200 focus:border-red-500"
                                        )}
                                    />
                                ))}
                            </div>

                            {touched.otp && errors.otp && (
                                <span className="text-red-500 text-xs font-bold text-center mt-1">{errors.otp}</span>
                            )}
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={verifyOTPMutation.isPending || isSubmitting}
                                fullWidth
                                size="lg"
                                className="h-14 rounded-2xl shadow-[0_10px_30px_rgba(31,123,255,0.2)] text-lg font-black tracking-tight"
                            >
                                {verifyOTPMutation.isPending ? 'Verifying...' : 'Verify OTP'}
                            </Button>
                        </div>

                        <div className="flex flex-col gap-6 items-center mt-4">
                            <div className="text-center text-sm font-medium text-gray-500">
                                Didn't receive OTP?{' '}
                                <button
                                    type="button"
                                    onClick={handleResendOTP}
                                    disabled={resendOTPMutation.isPending}
                                    className="text-primary-500 hover:text-primary-600 font-black transition-colors underline decoration-2 underline-offset-4 decoration-primary-100 hover:decoration-primary-500 disabled:opacity-50"
                                >
                                    {resendOTPMutation.isPending ? 'Sending...' : 'Resend OTP'}
                                </button>
                            </div>

                            <div className="h-px bg-gray-100 w-full" />

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


export default VerifyOTP;
